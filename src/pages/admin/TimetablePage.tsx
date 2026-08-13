import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Combobox } from "@/components/ui/combobox";
import { Calendar, Clock, Plus, Pencil, Trash2, Save, Settings, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import Swal from "sweetalert2";
import Pagination from "@/utils/Pagination";
import { useAuth } from "@/context/AuthContext";
import { SchoolApi, SubjectApi, StaffApi, TimetableApi } from "@/services/api";
import { getBackendErrorMessage } from "@/utils/errorHandler";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"] as const;
const DAY_LABELS: Record<string, string> = {
  MONDAY: "Monday", TUESDAY: "Tuesday", WEDNESDAY: "Wednesday", THURSDAY: "Thursday", FRIDAY: "Friday",
};

const subjectColors: Record<string, string> = {};
const colorPalette = [
  "bg-primary/10 text-primary", "bg-info/10 text-info", "bg-success/10 text-success",
  "bg-warning/10 text-warning", "bg-accent/10 text-accent-foreground", "bg-destructive/10 text-destructive",
];
const colorFor = (subject: string) => {
  if (!subjectColors[subject]) {
    const idx = Object.keys(subjectColors).length % colorPalette.length;
    subjectColors[subject] = colorPalette[idx];
  }
  return subjectColors[subject];
};

// LocalTime comes back as "08:00:00" — trim to "8:00" for display, matching the old label style.
const formatTime = (t: string) => {
  const [h, m] = t.split(":");
  return `${parseInt(h, 10)}:${m}`;
};
const periodLabel = (p: any) => `${formatTime(p.startTime)} - ${formatTime(p.endTime)}`;
const toTimeInput = (t: string) => t.slice(0, 5);

interface GradeLevelOption { uuid: string; name: string; streamNames: string[]; status: string; }

const TimetablePage = () => {
  const { user } = useAuth();
  const canManage = user?.permissions?.includes("TIMETABLE_MANAGE") ?? false;

  const [gradeLevels, setGradeLevels] = useState<GradeLevelOption[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);

  const [selectedGradeUuid, setSelectedGradeUuid] = useState("");
  const [selectedStream, setSelectedStream] = useState("");

  const [editSlot, setEditSlot] = useState<{ day: string; period: any } | null>(null);
  const [editingEntry, setEditingEntry] = useState<any | null>(null);
  const [editSubjectUuid, setEditSubjectUuid] = useState("");
  const [availableTeachers, setAvailableTeachers] = useState<any[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [editTeacherUuid, setEditTeacherUuid] = useState("");

  const [showTimeSlotForm, setShowTimeSlotForm] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<any | null>(null);
  const [newSlotStart, setNewSlotStart] = useState("");
  const [newSlotEnd, setNewSlotEnd] = useState("");
  const [newSlotIsBreak, setNewSlotIsBreak] = useState(false);
  const [newSlotBreakLabel, setNewSlotBreakLabel] = useState("BREAK");
  const [timeSlotsPage, setTimeSlotsPage] = useState(1);
  const [timeSlotsPerPage, setTimeSlotsPerPage] = useState(10);

  const loadStatics = () => {
    SchoolApi.getGradeLevels().then((data) => setGradeLevels(Array.isArray(data) ? data.map((g: any) => ({
      uuid: g.uuid, name: g.name, streamNames: Array.isArray(g.streamNames) ? g.streamNames : [], status: g.status,
    })) : []));
    SubjectApi.getAll().then((data) => setSubjects(Array.isArray(data) ? data.filter((s: any) => s.active) : []));
    TimetableApi.getPeriods().then((data) => setPeriods(Array.isArray(data) ? data : []));
  };

  useEffect(() => { loadStatics(); }, []);

  useEffect(() => {
    if (!selectedGradeUuid || !gradeLevels.find((g) => g.uuid === selectedGradeUuid)) return;
    setLoadingEntries(true);
    TimetableApi.getGrid(selectedGradeUuid, selectedStream)
      .then((data) => setEntries(Array.isArray(data) ? data : []))
      .finally(() => setLoadingEntries(false));
  }, [selectedGradeUuid, selectedStream, gradeLevels]);

  const activeGrades = useMemo(() => gradeLevels.filter((g) => g.status === "ACTIVE"), [gradeLevels]);
  const gradeOptions = useMemo(() => activeGrades.map((g) => ({ value: g.uuid, label: g.name })), [activeGrades]);
  const selectedGrade = activeGrades.find((g) => g.uuid === selectedGradeUuid) ?? null;
  const streamOptions = useMemo(
    () => (selectedGrade?.streamNames ?? []).map((s) => ({ value: s, label: s })),
    [selectedGrade],
  );

  useEffect(() => {
    if (!selectedGradeUuid && gradeOptions.length) setSelectedGradeUuid(gradeOptions[0].value);
  }, [gradeOptions, selectedGradeUuid]);

  useEffect(() => {
    // Changing grade resets stream — the previous grade's stream name may not exist under the new one.
    setSelectedStream("");
  }, [selectedGradeUuid]);

  const subjectOptions = useMemo(() => subjects.map((s) => ({ value: s.uuid, label: s.name, keywords: s.code })), [subjects]);
  const teacherOptions = useMemo(
    () => availableTeachers.map((t) => ({ value: t.teacherUuid, label: `${t.teacherName}${t.staffId ? ` (${t.staffId})` : ""}` })),
    [availableTeachers],
  );

  const totalTimeSlotsPages = Math.ceil(periods.length / timeSlotsPerPage);
  const pagedPeriods = periods.slice((timeSlotsPage - 1) * timeSlotsPerPage, timeSlotsPage * timeSlotsPerPage);

  const entryFor = (day: string, periodUuid: string) => entries.find((e) => e.dayOfWeek === day && e.periodUuid === periodUuid);

  const reloadEntries = () => {
    if (!selectedGradeUuid) return;
    TimetableApi.getGrid(selectedGradeUuid, selectedStream).then((data) => setEntries(Array.isArray(data) ? data : []));
  };

  const handleOpenSlotEdit = (day: string, period: any) => {
    if (period.breakPeriod) return;
    if (!canManage) return;
    const existing = entryFor(day, period.uuid) ?? null;
    setEditSlot({ day, period });
    setEditingEntry(existing);
    setEditSubjectUuid(existing?.subjectUuid ?? "");
    setEditTeacherUuid(existing?.teacherUuid ?? "");
    setAvailableTeachers([]);
  };

  // Available teachers depend on subject + day + period — refetch whenever the subject changes
  // (day/period are fixed once the dialog is open). An already-booked teacher simply won't be in
  // the list; the current occupant of THIS slot is excluded from the conflict check server-side.
  useEffect(() => {
    if (!editSlot || !editSubjectUuid) { setAvailableTeachers([]); return; }
    setLoadingTeachers(true);
    TimetableApi.getAvailableTeachers(editSubjectUuid, editSlot.day, editSlot.period.uuid, editingEntry?.uuid)
      .then((data) => {
        setAvailableTeachers(Array.isArray(data) ? data : []);
        // If the previously-selected teacher (e.g. the slot's current teacher) isn't in the
        // refreshed list for this subject, clear the selection rather than keep an invalid one.
        setEditTeacherUuid((prev) => (data.some((t: any) => t.teacherUuid === prev) ? prev : ""));
      })
      .finally(() => setLoadingTeachers(false));
  }, [editSlot, editSubjectUuid]);

  const handleSaveSlot = async () => {
    if (!editSlot || !selectedGradeUuid || !editSubjectUuid || !editTeacherUuid) {
      Swal.fire({ icon: "error", title: "Error", text: "Please select a subject and teacher", showConfirmButton: true });
      return;
    }
    try {
      await TimetableApi.assign({
        gradeLevelUuid: selectedGradeUuid,
        stream: selectedStream,
        dayOfWeek: editSlot.day,
        periodUuid: editSlot.period.uuid,
        subjectUuid: editSubjectUuid,
        teacherUuid: editTeacherUuid,
      });
      setEditSlot(null);
      reloadEntries();
      Swal.fire({ title: "Success", text: "Timetable slot updated", icon: "success", showConfirmButton: true });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to save slot", text: getBackendErrorMessage(err), showConfirmButton: true });
    }
  };

  const handleUnassignSlot = async () => {
    if (!editingEntry) return;
    try {
      await TimetableApi.unassign(editingEntry.uuid);
      setEditSlot(null);
      reloadEntries();
      Swal.fire({ title: "Success", text: "Slot cleared", icon: "success", showConfirmButton: true });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to clear slot", text: getBackendErrorMessage(err), showConfirmButton: true });
    }
  };

  const openAddTimeSlot = () => {
    setEditingPeriod(null);
    setNewSlotStart(""); setNewSlotEnd(""); setNewSlotIsBreak(false); setNewSlotBreakLabel("BREAK");
    setShowTimeSlotForm(true);
  };

  const openEditTimeSlot = (p: any) => {
    setEditingPeriod(p);
    setNewSlotStart(toTimeInput(p.startTime));
    setNewSlotEnd(toTimeInput(p.endTime));
    setNewSlotIsBreak(p.breakPeriod);
    setNewSlotBreakLabel(p.breakLabel || "BREAK");
    setShowTimeSlotForm(true);
  };

  const handleSaveTimeSlot = async () => {
    if (!newSlotStart || !newSlotEnd) {
      Swal.fire({ icon: "error", title: "Error", text: "Please enter start and end times", showConfirmButton: true });
      return;
    }
    const payload = { startTime: newSlotStart, endTime: newSlotEnd, breakPeriod: newSlotIsBreak, breakLabel: newSlotIsBreak ? newSlotBreakLabel : undefined };
    try {
      if (editingPeriod) {
        await TimetableApi.updatePeriod(editingPeriod.uuid, payload);
      } else {
        await TimetableApi.createPeriod(payload);
      }
      setShowTimeSlotForm(false);
      setEditingPeriod(null);
      TimetableApi.getPeriods().then((data) => setPeriods(Array.isArray(data) ? data : []));
      reloadEntries();
      Swal.fire({ title: "Success", text: editingPeriod ? "Time slot updated" : "Time slot added", icon: "success", showConfirmButton: true });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to save time slot", text: getBackendErrorMessage(err), showConfirmButton: true });
    }
  };

  const handleDeleteTimeSlot = async (p: any) => {
    try {
      await TimetableApi.deletePeriod(p.uuid);
      TimetableApi.getPeriods().then((data) => setPeriods(Array.isArray(data) ? data : []));
      Swal.fire({ title: "Success", text: "Time slot removed", icon: "success", showConfirmButton: true });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to delete time slot", text: getBackendErrorMessage(err), showConfirmButton: true });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Timetable</h1>
        <p className="text-muted-foreground">Set up class timetables — grade, stream, subject and teacher, with automatic clash prevention</p>
      </div>

      {/* Grade/Stream Selector */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium whitespace-nowrap">Grade:</Label>
              <Combobox
                className="w-[200px]"
                options={gradeOptions}
                value={selectedGradeUuid}
                onChange={setSelectedGradeUuid}
                placeholder="Select grade"
                searchPlaceholder="Search grades..."
                emptyText="No grades found."
              />
            </div>
            {streamOptions.length > 0 && (
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium whitespace-nowrap">Stream:</Label>
                <Combobox
                  className="w-[150px]"
                  options={streamOptions}
                  value={selectedStream}
                  onChange={setSelectedStream}
                  placeholder="Select stream"
                  searchPlaceholder="Search streams..."
                  emptyText="No streams found."
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedGrade ? (
        <Card>
          <CardContent className="pt-4">
            <Tabs defaultValue="schedule">
              <TabsList className="mb-4">
                <TabsTrigger value="schedule">
                  <Calendar className="w-4 h-4 mr-1" /> Weekly Schedule
                </TabsTrigger>
                <TabsTrigger value="timeslots">
                  <Settings className="w-4 h-4 mr-1" /> Time Slots ({periods.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="schedule">
                <p className="text-sm text-muted-foreground mb-3">
                  {canManage ? "Click any slot to assign or change subject and teacher" : "View only — you don't have permission to edit the timetable"}
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-3 px-3 text-left font-semibold text-muted-foreground">
                          <Clock className="w-4 h-4 inline mr-1" />Time
                        </th>
                        {DAYS.map((day) => (
                          <th key={day} className="py-3 px-3 text-center font-semibold">{DAY_LABELS[day]}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {periods.map((p) => (
                        <tr key={p.uuid} className="border-b border-border last:border-0">
                          <td className="py-2 px-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{periodLabel(p)}</td>
                          {p.breakPeriod ? (
                            <td colSpan={DAYS.length} className="py-2 px-2 text-center">
                              <span className="inline-block px-3 py-1.5 rounded-md text-xs font-medium bg-muted text-muted-foreground">
                                {p.breakLabel || "BREAK"}
                              </span>
                            </td>
                          ) : (
                            DAYS.map((day) => {
                              const entry = entryFor(day, p.uuid);
                              return (
                                <td key={day} className="py-2 px-2 text-center">
                                  <button
                                    disabled={!canManage}
                                    onClick={() => handleOpenSlotEdit(day, p)}
                                    className={`w-full min-h-[48px] rounded-md border border-transparent hover:border-primary/30 hover:shadow-sm transition-all px-2 py-1.5 text-left disabled:cursor-default disabled:hover:border-transparent disabled:hover:shadow-none ${entry ? "" : "border-dashed border-border"}`}
                                  >
                                    {entry ? (
                                      <div className="flex flex-col items-center gap-0.5">
                                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colorFor(entry.subjectName)}`}>
                                          {entry.subjectName}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">{entry.teacherName}</span>
                                      </div>
                                    ) : canManage ? (
                                      <span className="text-xs text-muted-foreground/50 flex items-center justify-center gap-1">
                                        <Plus className="w-3 h-3" /> Assign
                                      </span>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">—</span>
                                    )}
                                  </button>
                                </td>
                              );
                            })
                          )}
                        </tr>
                      ))}
                      {periods.length === 0 && (
                        <tr><td colSpan={DAYS.length + 1} className="text-center text-muted-foreground py-8">No time slots defined yet — add some in the Time Slots tab.</td></tr>
                      )}
                    </tbody>
                  </table>
                  {loadingEntries && <p className="text-xs text-muted-foreground mt-2">Loading…</p>}
                </div>
              </TabsContent>

              <TabsContent value="timeslots">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">Shared across every grade and stream — define lesson durations and break times once</p>
                  {canManage && (
                    <Button size="sm" variant="outline" onClick={openAddTimeSlot}>
                      <Plus className="w-4 h-4 mr-1" /> Add Time Slot
                    </Button>
                  )}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Type</TableHead>
                      {canManage && <TableHead className="text-right">Action</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedPeriods.map((p) => (
                      <TableRow key={p.uuid}>
                        <TableCell className="font-mono text-sm">{periodLabel(p)}</TableCell>
                        <TableCell>
                          {p.breakPeriod ? (
                            <Badge variant="secondary">{p.breakLabel || "BREAK"}</Badge>
                          ) : (
                            <Badge variant="outline">Lesson</Badge>
                          )}
                        </TableCell>
                        {canManage && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openEditTimeSlot(p)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteTimeSlot(p)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Pagination currentPage={timeSlotsPage} totalPages={totalTimeSlotsPages} onPageChange={setTimeSlotsPage}
                  itemsPerPage={timeSlotsPerPage} onItemsPerPageChange={(v) => { setTimeSlotsPerPage(v); setTimeSlotsPage(1); }} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Select a grade to view its timetable</p>
          </CardContent>
        </Card>
      )}

      {/* Edit Slot Dialog */}
      <Dialog open={!!editSlot} onOpenChange={(o) => { if (!o) setEditSlot(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Timetable Slot</DialogTitle>
            <DialogDescription>
              {selectedGrade?.name} {selectedStream} · {editSlot && DAY_LABELS[editSlot.day]} · {editSlot && periodLabel(editSlot.period)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Subject</Label>
              <Combobox
                options={subjectOptions}
                value={editSubjectUuid}
                onChange={(v) => { setEditSubjectUuid(v); setEditTeacherUuid(""); }}
                placeholder="Select subject"
                searchPlaceholder="Search subjects..."
                emptyText="No subjects found."
              />
            </div>
            <div>
              <Label>Teacher</Label>
              <Combobox
                options={teacherOptions}
                value={editTeacherUuid}
                onChange={setEditTeacherUuid}
                placeholder={!editSubjectUuid ? "Select a subject first" : loadingTeachers ? "Loading…" : "Select teacher"}
                searchPlaceholder="Search teachers..."
                emptyText="No available teacher for this subject at this time."
                disabled={!editSubjectUuid || loadingTeachers}
              />
              {editSubjectUuid && !loadingTeachers && teacherOptions.length === 0 && (
                <p className="text-xs text-destructive mt-1">Every teacher assigned this subject is already booked at this time.</p>
              )}
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            {editingEntry ? (
              <Button variant="ghost" className="text-destructive" onClick={handleUnassignSlot}><X className="w-4 h-4 mr-1" /> Unassign</Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditSlot(null)}>Cancel</Button>
              <Button onClick={handleSaveSlot}><Save className="w-4 h-4 mr-1" /> Save</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Time Slot Dialog */}
      <Dialog open={showTimeSlotForm} onOpenChange={setShowTimeSlotForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingPeriod ? "Edit Time Slot" : "Add Time Slot"}</DialogTitle>
            <DialogDescription>{editingPeriod ? "Update the time period" : "Define a new time period for the timetable"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Time</Label>
                <Input type="time" value={newSlotStart} onChange={(e) => setNewSlotStart(e.target.value)} />
              </div>
              <div>
                <Label>End Time</Label>
                <Input type="time" value={newSlotEnd} onChange={(e) => setNewSlotEnd(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="is-break" checked={newSlotIsBreak} onCheckedChange={(v) => setNewSlotIsBreak(v === true)} />
              <Label htmlFor="is-break" className="text-sm">This is a break period</Label>
            </div>
            {newSlotIsBreak && (
              <div>
                <Label>Break Label</Label>
                <Select value={newSlotBreakLabel} onValueChange={setNewSlotBreakLabel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BREAK">BREAK</SelectItem>
                    <SelectItem value="LUNCH">LUNCH</SelectItem>
                    <SelectItem value="TEA BREAK">TEA BREAK</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowTimeSlotForm(false); setEditingPeriod(null); }}>Cancel</Button>
            <Button onClick={handleSaveTimeSlot}>{editingPeriod ? "Update Slot" : "Add Slot"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimetablePage;
