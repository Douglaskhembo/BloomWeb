import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Clock, Plus, Pencil, Trash2, ArrowLeft, Save, Settings } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const grades = ["PP1", "PP2", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9"];
const streamOptions = ["A", "B", "C"];
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const defaultTimeSlotsConfig: TimeSlotDef[] = [
  { label: "8:00 - 8:40", isBreak: false },
  { label: "8:40 - 9:20", isBreak: false },
  { label: "9:20 - 10:00", isBreak: false },
  { label: "10:00 - 10:30", isBreak: true, breakLabel: "BREAK" },
  { label: "10:30 - 11:10", isBreak: false },
  { label: "11:10 - 11:50", isBreak: false },
  { label: "11:50 - 12:30", isBreak: false },
  { label: "12:30 - 1:30", isBreak: true, breakLabel: "LUNCH" },
  { label: "1:30 - 2:10", isBreak: false },
  { label: "2:10 - 2:50", isBreak: false },
];

// Subjects from System Setup
const subjectsList = [
  { name: "Mathematics", code: "MATH" },
  { name: "English", code: "ENG" },
  { name: "Kiswahili", code: "KSW" },
  { name: "Science & Technology", code: "SCI" },
  { name: "Social Studies", code: "SST" },
  { name: "CRE", code: "CRE" },
  { name: "Creative Arts", code: "ART" },
  { name: "Physical Education", code: "PE" },
  { name: "Agriculture", code: "AGR" },
  { name: "Home Science", code: "HSC" },
  { name: "Music", code: "MUS" },
  { name: "Computer Studies", code: "CST" },
  { name: "Club Activities", code: "CLB" },
  { name: "Revision", code: "REV" },
];

// Staff from Teachers/Staff table
const staffList = [
  { id: "TCH-001", name: "Mrs. Jane Njeri" },
  { id: "TCH-002", name: "Mr. Peter Ouma" },
  { id: "TCH-003", name: "Mrs. Sarah Wambui" },
  { id: "TCH-004", name: "Mr. David Kibet" },
  { id: "TCH-005", name: "Mrs. Grace Akinyi" },
  { id: "TCH-006", name: "Mr. James Wafula" },
  { id: "TCH-007", name: "Mrs. Mary Chebet" },
  { id: "TCH-008", name: "Mr. Samuel Njogu" },
];

const subjectColors: Record<string, string> = {
  Mathematics: "bg-primary/10 text-primary",
  English: "bg-info/10 text-info",
  Kiswahili: "bg-success/10 text-success",
  Science: "bg-warning/10 text-warning",
  "Social Studies": "bg-accent/10 text-accent-foreground",
  "Creative Arts": "bg-destructive/10 text-destructive",
  "Religious Ed": "bg-muted text-muted-foreground",
  PE: "bg-secondary text-secondary-foreground",
  BREAK: "bg-muted text-muted-foreground",
  LUNCH: "bg-muted text-muted-foreground",
  "Club Activities": "bg-primary/10 text-primary",
  Revision: "bg-success/10 text-success",
  Music: "bg-warning/10 text-warning",
  "Computer Studies": "bg-info/10 text-info",
};

interface TimeSlotDef {
  label: string; // e.g. "8:00 - 8:40"
  isBreak: boolean;
  breakLabel?: string; // e.g. "BREAK" or "LUNCH"
}

interface TimetableSlot {
  subject: string;
  teacher: string;
}

interface TimetableData {
  id: string;
  grade: string;
  stream: string;
  timeSlots: TimeSlotDef[];
  slots: Record<string, Record<string, TimetableSlot>>; // day -> time -> slot
}

// Generate initial sample timetable for Grade 5A
const generateSampleTimetable = (): TimetableData => {
  const sampleSlots: Record<string, Record<string, TimetableSlot>> = {};
  const sampleData: Record<string, Record<string, { subject: string; teacher: string }>> = {
    Monday: {
      "8:00 - 8:40": { subject: "Mathematics", teacher: "Mrs. Jane Njeri" },
      "8:40 - 9:20": { subject: "English", teacher: "Mr. Peter Ouma" },
      "9:20 - 10:00": { subject: "Science & Technology", teacher: "Mrs. Sarah Wambui" },
      "10:30 - 11:10": { subject: "Social Studies", teacher: "Mrs. Grace Akinyi" },
      "11:10 - 11:50": { subject: "Kiswahili", teacher: "Mr. David Kibet" },
      "11:50 - 12:30": { subject: "CRE", teacher: "Mrs. Mary Chebet" },
      "1:30 - 2:10": { subject: "Physical Education", teacher: "Mr. Samuel Njogu" },
      "2:10 - 2:50": { subject: "Creative Arts", teacher: "Mr. James Wafula" },
    },
    Tuesday: {
      "8:00 - 8:40": { subject: "English", teacher: "Mr. Peter Ouma" },
      "8:40 - 9:20": { subject: "Kiswahili", teacher: "Mr. David Kibet" },
      "9:20 - 10:00": { subject: "Mathematics", teacher: "Mrs. Jane Njeri" },
      "10:30 - 11:10": { subject: "Science & Technology", teacher: "Mrs. Sarah Wambui" },
      "11:10 - 11:50": { subject: "Creative Arts", teacher: "Mr. James Wafula" },
      "11:50 - 12:30": { subject: "Social Studies", teacher: "Mrs. Grace Akinyi" },
      "1:30 - 2:10": { subject: "Physical Education", teacher: "Mr. Samuel Njogu" },
      "2:10 - 2:50": { subject: "Music", teacher: "" },
    },
    Wednesday: {
      "8:00 - 8:40": { subject: "Science & Technology", teacher: "Mrs. Sarah Wambui" },
      "8:40 - 9:20": { subject: "Mathematics", teacher: "Mrs. Jane Njeri" },
      "9:20 - 10:00": { subject: "English", teacher: "Mr. Peter Ouma" },
      "10:30 - 11:10": { subject: "Kiswahili", teacher: "Mr. David Kibet" },
      "11:10 - 11:50": { subject: "Social Studies", teacher: "Mrs. Grace Akinyi" },
      "11:50 - 12:30": { subject: "Creative Arts", teacher: "Mr. James Wafula" },
      "1:30 - 2:10": { subject: "Club Activities", teacher: "" },
      "2:10 - 2:50": { subject: "Club Activities", teacher: "" },
    },
    Thursday: {
      "8:00 - 8:40": { subject: "Mathematics", teacher: "Mrs. Jane Njeri" },
      "8:40 - 9:20": { subject: "Social Studies", teacher: "Mrs. Grace Akinyi" },
      "9:20 - 10:00": { subject: "Creative Arts", teacher: "Mr. James Wafula" },
      "10:30 - 11:10": { subject: "English", teacher: "Mr. Peter Ouma" },
      "11:10 - 11:50": { subject: "Kiswahili", teacher: "Mr. David Kibet" },
      "11:50 - 12:30": { subject: "Science & Technology", teacher: "Mrs. Sarah Wambui" },
      "1:30 - 2:10": { subject: "Physical Education", teacher: "Mr. Samuel Njogu" },
      "2:10 - 2:50": { subject: "Computer Studies", teacher: "" },
    },
    Friday: {
      "8:00 - 8:40": { subject: "Kiswahili", teacher: "Mr. David Kibet" },
      "8:40 - 9:20": { subject: "English", teacher: "Mr. Peter Ouma" },
      "9:20 - 10:00": { subject: "Mathematics", teacher: "Mrs. Jane Njeri" },
      "10:30 - 11:10": { subject: "Science & Technology", teacher: "Mrs. Sarah Wambui" },
      "11:10 - 11:50": { subject: "CRE", teacher: "Mrs. Mary Chebet" },
      "11:50 - 12:30": { subject: "Creative Arts", teacher: "Mr. James Wafula" },
      "1:30 - 2:10": { subject: "Revision", teacher: "" },
      "2:10 - 2:50": { subject: "Revision", teacher: "" },
    },
  };

  days.forEach(day => {
    sampleSlots[day] = {};
    defaultTimeSlotsConfig.forEach(ts => {
      if (ts.isBreak) {
        sampleSlots[day][ts.label] = { subject: ts.breakLabel || "BREAK", teacher: "" };
      } else if (sampleData[day]?.[ts.label]) {
        sampleSlots[day][ts.label] = sampleData[day][ts.label];
      } else {
        sampleSlots[day][ts.label] = { subject: "", teacher: "" };
      }
    });
  });

  return { id: "TT-001", grade: "Grade 5", stream: "A", timeSlots: [...defaultTimeSlotsConfig], slots: sampleSlots };
};

const TimetablePage = () => {
  const [timetables, setTimetables] = useState<TimetableData[]>([generateSampleTimetable()]);
  const [selectedGrade, setSelectedGrade] = useState("Grade 5");
  const [selectedStream, setSelectedStream] = useState("A");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGrade, setNewGrade] = useState("");
  const [newStream, setNewStream] = useState("");
  const [editSlot, setEditSlot] = useState<{ day: string; time: string } | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editTeacher, setEditTeacher] = useState("");
  const [showTimeSlotForm, setShowTimeSlotForm] = useState(false);
  const [editingSlotLabel, setEditingSlotLabel] = useState<string | null>(null);
  const [newSlotStart, setNewSlotStart] = useState("");
  const [newSlotEnd, setNewSlotEnd] = useState("");
  const [newSlotIsBreak, setNewSlotIsBreak] = useState(false);
  const [newSlotBreakLabel, setNewSlotBreakLabel] = useState("BREAK");

  const currentTimetable = timetables.find(t => t.grade === selectedGrade && t.stream === selectedStream);

  const handleCreateTimetable = () => {
    if (!newGrade || !newStream) {
      toast.error("Please select grade and stream");
      return;
    }
    if (timetables.find(t => t.grade === newGrade && t.stream === newStream)) {
      toast.error("Timetable for this grade and stream already exists");
      return;
    }

    const timeSlots = [...defaultTimeSlotsConfig];
    const slots: Record<string, Record<string, TimetableSlot>> = {};
    days.forEach(day => {
      slots[day] = {};
      timeSlots.forEach(ts => {
        if (ts.isBreak) {
          slots[day][ts.label] = { subject: ts.breakLabel || "BREAK", teacher: "" };
        } else {
          slots[day][ts.label] = { subject: "", teacher: "" };
        }
      });
    });

    const newTT: TimetableData = {
      id: `TT-${String(timetables.length + 1).padStart(3, "0")}`,
      grade: newGrade,
      stream: newStream,
      timeSlots,
      slots,
    };
    setTimetables(prev => [...prev, newTT]);
    setSelectedGrade(newGrade);
    setSelectedStream(newStream);
    setShowCreateForm(false);
    setNewGrade("");
    setNewStream("");
    toast.success(`Timetable created for ${newGrade} ${newStream}`);
  };

  const handleOpenSlotEdit = (day: string, time: string) => {
    const ts = currentTimetable?.timeSlots.find(t => t.label === time);
    if (ts?.isBreak) return;
    const slot = currentTimetable?.slots[day]?.[time];
    setEditSlot({ day, time });
    setEditSubject(slot?.subject || "");
    setEditTeacher(slot?.teacher || "");
  };

  const handleAddTimeSlot = () => {
    if (!newSlotStart || !newSlotEnd || !currentTimetable) {
      toast.error("Please enter start and end times");
      return;
    }
    const fmt = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      const h12 = h > 12 ? h - 12 : h;
      return `${h12}:${m.toString().padStart(2, "0")}`;
    };
    const label = `${fmt(newSlotStart)} - ${fmt(newSlotEnd)}`;
    if (!editingSlotLabel && currentTimetable.timeSlots.find(ts => ts.label === label)) {
      toast.error("This time slot already exists");
      return;
    }
    if (editingSlotLabel && editingSlotLabel !== label && currentTimetable.timeSlots.find(ts => ts.label === label)) {
      toast.error("This time slot already exists");
      return;
    }
    const newTs: TimeSlotDef = {
      label,
      isBreak: newSlotIsBreak,
      breakLabel: newSlotIsBreak ? newSlotBreakLabel : undefined,
    };
    setTimetables(prev => prev.map(t => {
      if (t.id !== currentTimetable.id) return t;
      const updatedSlots = { ...t.slots };
      const updatedTimeSlots = editingSlotLabel
        ? t.timeSlots.map(ts => ts.label === editingSlotLabel ? newTs : ts)
        : [...t.timeSlots, newTs];
      if (editingSlotLabel && editingSlotLabel !== label) {
        days.forEach(day => {
          const old = updatedSlots[day]?.[editingSlotLabel];
          updatedSlots[day] = { ...updatedSlots[day], [label]: old || { subject: newSlotIsBreak ? (newSlotBreakLabel || "BREAK") : "", teacher: "" } };
          delete updatedSlots[day][editingSlotLabel];
        });
      } else if (editingSlotLabel) {
        if (newSlotIsBreak) {
          days.forEach(day => {
            updatedSlots[day] = { ...updatedSlots[day], [label]: { subject: newSlotBreakLabel || "BREAK", teacher: "" } };
          });
        }
      } else {
        days.forEach(day => {
          updatedSlots[day] = { ...updatedSlots[day], [label]: { subject: newSlotIsBreak ? (newSlotBreakLabel || "BREAK") : "", teacher: "" } };
        });
      }
      return { ...t, timeSlots: updatedTimeSlots.sort((a, b) => a.label.localeCompare(b.label)), slots: updatedSlots };
    }));
    setShowTimeSlotForm(false);
    setEditingSlotLabel(null);
    setNewSlotStart("");
    setNewSlotEnd("");
    setNewSlotIsBreak(false);
    setNewSlotBreakLabel("BREAK");
    toast.success(editingSlotLabel ? "Time slot updated" : "Time slot added");
  };

  const handleEditTimeSlot = (ts: TimeSlotDef) => {
    const parts = ts.label.split(" - ");
    const toTime24 = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
    };
    setEditingSlotLabel(ts.label);
    setNewSlotStart(toTime24(parts[0]));
    setNewSlotEnd(toTime24(parts[1]));
    setNewSlotIsBreak(ts.isBreak);
    setNewSlotBreakLabel(ts.breakLabel || "BREAK");
    setShowTimeSlotForm(true);
  };

  const handleRemoveTimeSlot = (label: string) => {
    if (!currentTimetable) return;
    setTimetables(prev => prev.map(t => {
      if (t.id !== currentTimetable.id) return t;
      const updatedSlots = { ...t.slots };
      days.forEach(day => {
        const daySlots = { ...updatedSlots[day] };
        delete daySlots[label];
        updatedSlots[day] = daySlots;
      });
      return { ...t, timeSlots: t.timeSlots.filter(ts => ts.label !== label), slots: updatedSlots };
    }));
    toast.success("Time slot removed");
  };

  const handleSaveSlot = () => {
    if (!editSlot || !currentTimetable) return;
    const updated = timetables.map(t => {
      if (t.id !== currentTimetable.id) return t;
      return {
        ...t,
        slots: {
          ...t.slots,
          [editSlot.day]: {
            ...t.slots[editSlot.day],
            [editSlot.time]: { subject: editSubject === "__none__" ? "" : editSubject, teacher: editTeacher === "__none__" ? "" : editTeacher },
          },
        },
      };
    });
    setTimetables(updated);
    setEditSlot(null);
    toast.success("Timetable slot updated");
  };

  const handleDeleteTimetable = () => {
    if (!currentTimetable) return;
    setTimetables(prev => prev.filter(t => t.id !== currentTimetable.id));
    const remaining = timetables.filter(t => t.id !== currentTimetable.id);
    if (remaining.length > 0) {
      setSelectedGrade(remaining[0].grade);
      setSelectedStream(remaining[0].stream);
    }
    toast.success("Timetable deleted");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Timetable</h1>
          <p className="text-muted-foreground">Create and manage class timetables per grade and stream</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-1" /> Create Timetable
        </Button>
      </div>

      {/* Grade/Stream Selector */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium whitespace-nowrap">Grade:</Label>
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[...new Set(timetables.map(t => t.grade))].map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium whitespace-nowrap">Stream:</Label>
              <Select value={selectedStream} onValueChange={setSelectedStream}>
                <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[...new Set(timetables.filter(t => t.grade === selectedGrade).map(t => t.stream))].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {currentTimetable && (
              <Button variant="destructive" size="sm" className="ml-auto" onClick={handleDeleteTimetable}>
                <Trash2 className="w-4 h-4 mr-1" /> Delete Timetable
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Timetable Grid */}
      {currentTimetable ? (
        <Card>
          <CardContent className="pt-4">
            <Tabs defaultValue="schedule">
              <TabsList className="mb-4">
                <TabsTrigger value="schedule">
                  <Calendar className="w-4 h-4 mr-1" /> Weekly Schedule
                </TabsTrigger>
                <TabsTrigger value="timeslots">
                  <Settings className="w-4 h-4 mr-1" /> Time Slots ({currentTimetable.timeSlots.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="schedule">
                <p className="text-sm text-muted-foreground mb-3">Click any slot to assign or change subject and teacher</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-3 px-3 text-left font-semibold text-muted-foreground">
                          <Clock className="w-4 h-4 inline mr-1" />Time
                        </th>
                        {days.map(day => (
                          <th key={day} className="py-3 px-3 text-center font-semibold">{day}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {currentTimetable.timeSlots.map((ts) => {
                        const time = ts.label;
                        const isBreak = ts.isBreak;
                        return (
                          <tr key={time} className="border-b border-border last:border-0">
                            <td className="py-2 px-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{time}</td>
                            {days.map(day => {
                              const slot = currentTimetable.slots[day]?.[time];
                              const subj = slot?.subject || "";
                              const teacher = slot?.teacher || "";
                              if (isBreak) {
                                return (
                                  <td key={day} className="py-2 px-2 text-center">
                                    <span className="inline-block px-3 py-1.5 rounded-md text-xs font-medium bg-muted text-muted-foreground">
                                      {subj}
                                    </span>
                                  </td>
                                );
                              }
                              return (
                                <td key={day} className="py-2 px-2 text-center">
                                  <button
                                    onClick={() => handleOpenSlotEdit(day, time)}
                                    className={`w-full min-h-[48px] rounded-md border border-transparent hover:border-primary/30 hover:shadow-sm transition-all px-2 py-1.5 text-left ${subj ? "" : "border-dashed border-border"}`}
                                  >
                                    {subj ? (
                                      <div className="flex flex-col items-center gap-0.5">
                                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${subjectColors[subj] || "bg-muted text-muted-foreground"}`}>
                                          {subj}
                                        </span>
                                        {teacher && (
                                          <span className="text-[10px] text-muted-foreground">{teacher}</span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-xs text-muted-foreground/50 flex items-center justify-center gap-1">
                                        <Plus className="w-3 h-3" /> Assign
                                      </span>
                                    )}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              <TabsContent value="timeslots">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">Define lesson durations and break times</p>
                  <Button size="sm" variant="outline" onClick={() => { setEditingSlotLabel(null); setNewSlotStart(""); setNewSlotEnd(""); setNewSlotIsBreak(false); setNewSlotBreakLabel("BREAK"); setShowTimeSlotForm(true); }}>
                    <Plus className="w-4 h-4 mr-1" /> Add Time Slot
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentTimetable.timeSlots.map((ts) => (
                      <TableRow key={ts.label}>
                        <TableCell className="font-mono text-sm">{ts.label}</TableCell>
                        <TableCell>
                          {ts.isBreak ? (
                            <Badge variant="secondary">{ts.breakLabel || "BREAK"}</Badge>
                          ) : (
                            <Badge variant="outline">Lesson</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleEditTimeSlot(ts)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleRemoveTimeSlot(ts.label)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No timetable found for the selected grade and stream</p>
            <Button className="mt-4" variant="outline" onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4 mr-1" /> Create Timetable
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Timetable Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Timetable</DialogTitle>
            <DialogDescription>Select grade and stream for the new timetable</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Grade</Label>
              <Select value={newGrade} onValueChange={setNewGrade}>
                <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                <SelectContent>
                  {grades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Stream</Label>
              <Select value={newStream} onValueChange={setNewStream}>
                <SelectTrigger><SelectValue placeholder="Select stream" /></SelectTrigger>
                <SelectContent>
                  {streamOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
            <Button onClick={handleCreateTimetable}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Slot Dialog */}
      <Dialog open={!!editSlot} onOpenChange={() => setEditSlot(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Timetable Slot</DialogTitle>
            <DialogDescription>
              {editSlot?.day} · {editSlot?.time}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Subject</Label>
              <Select value={editSubject} onValueChange={setEditSubject}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {subjectsList.map(s => <SelectItem key={s.code} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Teacher</Label>
              <Select value={editTeacher} onValueChange={setEditTeacher}>
                <SelectTrigger><SelectValue placeholder="Assign teacher" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Unassigned —</SelectItem>
                  {staffList.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSlot(null)}>Cancel</Button>
            <Button onClick={handleSaveSlot}><Save className="w-4 h-4 mr-1" /> Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Add Time Slot Dialog */}
      <Dialog open={showTimeSlotForm} onOpenChange={setShowTimeSlotForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingSlotLabel ? "Edit Time Slot" : "Add Time Slot"}</DialogTitle>
            <DialogDescription>{editingSlotLabel ? "Update the time period" : "Define a new time period for the timetable"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Time</Label>
                <Input type="time" value={newSlotStart} onChange={e => setNewSlotStart(e.target.value)} />
              </div>
              <div>
                <Label>End Time</Label>
                <Input type="time" value={newSlotEnd} onChange={e => setNewSlotEnd(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="is-break"
                checked={newSlotIsBreak}
                onCheckedChange={(v) => setNewSlotIsBreak(v === true)}
              />
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
            <Button variant="outline" onClick={() => { setShowTimeSlotForm(false); setEditingSlotLabel(null); }}>Cancel</Button>
            <Button onClick={handleAddTimeSlot}>{editingSlotLabel ? "Update Slot" : "Add Slot"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimetablePage;
