import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarClock, CalendarDays, Pencil, Plus, Trash2 } from "lucide-react";
import Swal from "sweetalert2";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TermPeriodFormModal from "@/components/modal/TermPeriodFormModal";
import { TermPeriodFormValues } from "@/components/forms/TermPeriodForm";
import SchoolEventFormModal from "@/components/modal/SchoolEventFormModal";
import { SchoolEventFormValues } from "@/components/forms/SchoolEventForm";
import { AcademicCalendarApi } from "@/services/api";
import { getBackendErrorMessage } from "@/utils/errorHandler";
import Pagination from "@/utils/Pagination";
import { useAuth } from "@/context/AuthContext";

interface TermPeriod { id: number; academicYear: number; term: string; startDate: string; endDate: string; }
interface SchoolEvent { id: number; name: string; startDate: string; endDate: string; active: boolean; }

const toTermPeriod = (raw: any): TermPeriod => ({
  id: raw.id, academicYear: raw.academicYear, term: raw.term, startDate: raw.startDate, endDate: raw.endDate,
});
const toSchoolEvent = (raw: any): SchoolEvent => ({
  id: raw.id, name: raw.name, startDate: raw.startDate, endDate: raw.endDate, active: Boolean(raw.active),
});

const CURRENT_YEAR = new Date().getFullYear();
const ACADEMIC_YEARS = Array.from({ length: 5 }, (_, idx) => CURRENT_YEAR + 1 - idx);

const emptyTermPeriodForm: TermPeriodFormValues = { academicYear: CURRENT_YEAR, term: "Term 1", startDate: "", endDate: "" };
const emptyEventForm: SchoolEventFormValues = { name: "", startDate: "", endDate: "", active: true };

const formatDuration = (start: string, end: string) => {
  if (!start || !end) return "—";
  const days = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000) + 1;
  if (days <= 0) return "—";
  const weeks = Math.round(days / 7);
  const months = Math.round((days / 30.44) * 10) / 10;
  return `${weeks} wk${weeks === 1 ? "" : "s"} (~${months} mo)`;
};

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

const AcademicCalendarSetupPage = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("SETUP_MANAGE");
  const [activeTab, setActiveTab] = useState<"terms" | "events">("terms");

  const [termPeriods, setTermPeriods] = useState<TermPeriod[]>([]);
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [currentTerm, setCurrentTerm] = useState<{ academicYear: number | null; term: string | null }>({ academicYear: null, term: null });
  const [loading, setLoading] = useState(false);

  const [termModalOpen, setTermModalOpen] = useState(false);
  const [editingTermId, setEditingTermId] = useState<number | null>(null);
  const [termForm, setTermForm] = useState<TermPeriodFormValues>(emptyTermPeriodForm);

  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [eventForm, setEventForm] = useState<SchoolEventFormValues>(emptyEventForm);

  const [termsPage, setTermsPage] = useState(1);
  const [termsPerPage, setTermsPerPage] = useState(10);
  const [eventsPage, setEventsPage] = useState(1);
  const [eventsPerPage, setEventsPerPage] = useState(10);

  const load = () => {
    setLoading(true);
    Promise.all([
      AcademicCalendarApi.getTermPeriods(),
      AcademicCalendarApi.getEvents(),
      AcademicCalendarApi.getCurrentTerm(),
    ])
      .then(([rawTerms, rawEvents, current]) => {
        setTermPeriods(rawTerms.map(toTermPeriod));
        setEvents(rawEvents.map(toSchoolEvent));
        setCurrentTerm(current);
      })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  // ── Term Periods ────────────────────────────────────────────────────────

  const openAddTerm = () => { setEditingTermId(null); setTermForm(emptyTermPeriodForm); setTermModalOpen(true); };
  const openEditTerm = (tp: TermPeriod) => {
    setEditingTermId(tp.id);
    setTermForm({ academicYear: tp.academicYear, term: tp.term, startDate: tp.startDate, endDate: tp.endDate });
    setTermModalOpen(true);
  };

  const submitTermPeriod = async () => {
    const payload = { academicYear: termForm.academicYear, term: termForm.term, startDate: termForm.startDate, endDate: termForm.endDate };
    try {
      if (editingTermId !== null) {
        await AcademicCalendarApi.updateTermPeriod(editingTermId, payload);
        Swal.fire({ title: "Success", text: "Term period updated", icon: "success", showConfirmButton: true });
      } else {
        await AcademicCalendarApi.createTermPeriod(payload);
        Swal.fire({ title: "Success", text: "Term period added", icon: "success", showConfirmButton: true });
      }
      setTermModalOpen(false);
      load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to save term period", text: getBackendErrorMessage(err), showConfirmButton: true });
    }
  };

  const deleteTermPeriod = async (tp: TermPeriod) => {
    const confirmed = await Swal.fire({
      icon: "warning", title: `Delete ${tp.term} ${tp.academicYear}?`, showCancelButton: true, confirmButtonText: "Delete",
    });
    if (!confirmed.isConfirmed) return;
    try {
      await AcademicCalendarApi.deleteTermPeriod(tp.id);
      Swal.fire({ title: "Success", text: "Term period removed", icon: "success", showConfirmButton: true });
      load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to delete term period", text: getBackendErrorMessage(err), showConfirmButton: true });
    }
  };

  const openAddEvent = () => { setEditingEventId(null); setEventForm(emptyEventForm); setEventModalOpen(true); };
  const openEditEvent = (ev: SchoolEvent) => {
    setEditingEventId(ev.id);
    setEventForm({ name: ev.name, startDate: ev.startDate, endDate: ev.endDate, active: ev.active });
    setEventModalOpen(true);
  };

  const submitEvent = async () => {
    const payload = { name: eventForm.name, startDate: eventForm.startDate, endDate: eventForm.endDate, active: eventForm.active };
    try {
      if (editingEventId !== null) {
        await AcademicCalendarApi.updateEvent(editingEventId, payload);
        Swal.fire({ title: "Success", text: "School event updated", icon: "success", showConfirmButton: true });
      } else {
        await AcademicCalendarApi.createEvent(payload);
        Swal.fire({ title: "Success", text: "School event added", icon: "success", showConfirmButton: true });
      }
      setEventModalOpen(false);
      load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to save event", text: getBackendErrorMessage(err), showConfirmButton: true });
    }
  };

  const toggleEvent = async (id: number) => {
    try {
      await AcademicCalendarApi.toggleEvent(id);
      load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to update event", text: getBackendErrorMessage(err), showConfirmButton: true });
    }
  };

  const deleteEvent = async (ev: SchoolEvent) => {
    const confirmed = await Swal.fire({ icon: "warning", title: `Delete "${ev.name}"?`, showCancelButton: true, confirmButtonText: "Delete" });
    if (!confirmed.isConfirmed) return;
    try {
      await AcademicCalendarApi.deleteEvent(ev.id);
      Swal.fire({ title: "Success", text: "Event removed", icon: "success", showConfirmButton: true });
      load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to delete event", text: getBackendErrorMessage(err), showConfirmButton: true });
    }
  };

  const totalTermsPages = Math.ceil(termPeriods.length / termsPerPage);
  const pagedTerms = termPeriods.slice((termsPage - 1) * termsPerPage, termsPage * termsPerPage);
  const totalEventsPages = Math.ceil(events.length / eventsPerPage);
  const pagedEvents = events.slice((eventsPage - 1) * eventsPerPage, eventsPage * eventsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/management")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Academic Calendar</h1>
          <p className="text-muted-foreground">Set term dates and school events so the system knows which term it is automatically.</p>
        </div>
      </div>

      <Card className={currentTerm.term ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/5"}>
        <CardContent className="flex items-center gap-3 p-4">
          <CalendarClock className={`h-5 w-5 ${currentTerm.term ? "text-success" : "text-warning"}`} />
          <div>
            <p className="font-semibold">
              {currentTerm.term ? `Today is in ${currentTerm.term}, Academic Year ${currentTerm.academicYear}` : "No term period covers today's date"}
            </p>
            <p className="text-sm text-muted-foreground">
              {currentTerm.term
                ? "Screens that default to the current term will pick this up automatically."
                : "Add a term period below covering today so screens can auto-detect the current term."}
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "terms" | "events")} className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="terms" className="gap-2"><CalendarClock className="h-4 w-4" /> Term Periods</TabsTrigger>
          <TabsTrigger value="events" className="gap-2"><CalendarDays className="h-4 w-4" /> School Events</TabsTrigger>
        </TabsList>

        <TabsContent value="terms" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle className="text-lg">Term Periods</CardTitle>
                <CardDescription>Start and end dates per academic year — re-enter each year since the government calendar shifts.</CardDescription>
              </div>
              {canManage && <Button size="sm" onClick={openAddTerm}><Plus className="h-4 w-4" /> Add Term Period</Button>}
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Loading term periods...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Academic Year</TableHead>
                      <TableHead>Term</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {termPeriods.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No term periods configured yet.</TableCell></TableRow>
                    ) : pagedTerms.map((tp) => (
                      <TableRow key={tp.id}>
                        <TableCell><Badge variant="outline">{tp.academicYear}</Badge></TableCell>
                        <TableCell className="font-medium">{tp.term}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{fmtDate(tp.startDate)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{fmtDate(tp.endDate)}</TableCell>
                        <TableCell className="text-sm">{formatDuration(tp.startDate, tp.endDate)}</TableCell>
                        <TableCell className="text-right">
                          {canManage && (
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditTerm(tp)}><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteTermPeriod(tp)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <Pagination currentPage={termsPage} totalPages={totalTermsPages} onPageChange={setTermsPage}
                itemsPerPage={termsPerPage} onItemsPerPageChange={(v) => { setTermsPerPage(v); setTermsPage(1); }} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle className="text-lg">School Events</CardTitle>
                <CardDescription>Non-holiday calendar markers — mid-term breaks, opening/closing days, exam weeks.</CardDescription>
              </div>
              {canManage && <Button size="sm" onClick={openAddEvent}><Plus className="h-4 w-4" /> Add Event</Button>}
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Loading events...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead className="text-center">Active</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No school events configured yet.</TableCell></TableRow>
                    ) : pagedEvents.map((ev) => (
                      <TableRow key={ev.id}>
                        <TableCell className="font-medium">{ev.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{fmtDate(ev.startDate)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{fmtDate(ev.endDate)}</TableCell>
                        <TableCell className="text-sm">{formatDuration(ev.startDate, ev.endDate)}</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={ev.active ? "default" : "secondary"}
                            className={canManage ? "cursor-pointer" : undefined}
                            onClick={canManage ? () => toggleEvent(ev.id) : undefined}
                          >
                            {ev.active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {canManage && (
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditEvent(ev)}><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteEvent(ev)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <Pagination currentPage={eventsPage} totalPages={totalEventsPages} onPageChange={setEventsPage}
                itemsPerPage={eventsPerPage} onItemsPerPageChange={(v) => { setEventsPerPage(v); setEventsPage(1); }} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <TermPeriodFormModal
        open={termModalOpen}
        onOpenChange={setTermModalOpen}
        isEditing={editingTermId !== null}
        value={termForm}
        onChange={setTermForm}
        onSubmit={submitTermPeriod}
        academicYears={ACADEMIC_YEARS}
      />
      <SchoolEventFormModal
        open={eventModalOpen}
        onOpenChange={setEventModalOpen}
        isEditing={editingEventId !== null}
        value={eventForm}
        onChange={setEventForm}
        onSubmit={submitEvent}
      />
    </div>
  );
};

export default AcademicCalendarSetupPage;
