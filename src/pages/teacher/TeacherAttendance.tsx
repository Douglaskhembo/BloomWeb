import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, Fingerprint, Users, ClipboardCheck } from "lucide-react";
import Swal from "sweetalert2";
import { useAuth } from "@/context/AuthContext";
import { StaffApi, ClassTeacherApi, AttendanceReportApi, DailyAttendanceApi } from "@/services/api";
import { downloadAttendanceReport } from "@/lib/attendanceExport";
import { getBackendErrorMessage } from "@/utils/errorHandler";
import Pagination from "@/utils/Pagination";
import AttendanceChecklist, { ChecklistRow, StatusOption } from "@/components/attendance/AttendanceChecklist";

const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtTime = (v: string | null) => (v ? new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—");

const STATUS_OPTIONS: StatusOption[] = [
  { value: "PRESENT", label: "Present", activeClassName: "bg-green-600 text-white hover:bg-green-600" },
  { value: "ABSENT", label: "Absent", activeClassName: "bg-red-600 text-white hover:bg-red-600" },
  { value: "LATE", label: "Late", activeClassName: "bg-amber-500 text-white hover:bg-amber-500" },
  { value: "EXCUSED", label: "Excused", activeClassName: "bg-blue-600 text-white hover:bg-blue-600" },
];

const TeacherAttendance = () => {
  const { user } = useAuth();
  const [staff, setStaff] = useState<any | null>(null);
  const [assignment, setAssignment] = useState<any | null>(null);
  const [assignmentChecked, setAssignmentChecked] = useState(false);
  const [roster, setRoster] = useState<any[]>([]);
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [format, setFormat] = useState<"csv" | "excel" | "pdf">("pdf");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [rowsPage, setRowsPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [registerDate, setRegisterDate] = useState(todayISO());
  const [register, setRegister] = useState<ChecklistRow[]>([]);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.profileRef) return;
    StaffApi.getByUuid(user.profileRef).then(setStaff);
  }, [user?.profileRef]);

  useEffect(() => {
    if (!staff?.uuid) return;
    ClassTeacherApi.getMine(staff.uuid).then((a) => { setAssignment(a); setAssignmentChecked(true); });
    ClassTeacherApi.getMyRoster(staff.uuid).then(setRoster);
  }, [staff?.uuid]);

  const search = async () => {
    if (!staff?.uuid) return;
    setLoading(true);
    try {
      setRows(await AttendanceReportApi.getMyClass({ teacherUuid: staff.uuid, from, to }));
      setRowsPage(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (staff?.uuid && assignment) search(); }, [staff?.uuid, assignment]);

  const loadRegister = async () => {
    if (!staff?.uuid) return;
    setRegisterLoading(true);
    try {
      setRegister(await DailyAttendanceApi.getRegister({ teacherUuid: staff.uuid, date: registerDate }));
    } finally {
      setRegisterLoading(false);
    }
  };

  useEffect(() => { if (staff?.uuid && assignment) loadRegister(); }, [staff?.uuid, assignment, registerDate]);

  const setRowStatus = (studentUuid: string, status: string) => {
    setRegister((rs) => rs.map((r) => (r.studentUuid === studentUuid ? { ...r, status } : r)));
  };
  const setRowRemarks = (studentUuid: string, remarks: string) => {
    setRegister((rs) => rs.map((r) => (r.studentUuid === studentUuid ? { ...r, remarks } : r)));
  };

  const markedCount = register.filter((r) => r.status).length;

  const handleSaveAttendance = async () => {
    if (saving) return;
    const entries = register.filter((r) => r.status).map((r) => ({ studentUuid: r.studentUuid, status: r.status!, remarks: r.remarks }));
    if (entries.length === 0) {
      Swal.fire("Nothing to save", "Mark at least one student before saving.", "warning");
      return;
    }
    setSaving(true);
    try {
      await DailyAttendanceApi.markBulk({ date: registerDate, entries });
      Swal.fire({ icon: "success", title: "Attendance saved", timer: 1500, showConfirmButton: false });
      await loadRegister();
      await search();
    } catch (err) {
      Swal.fire("Error", getBackendErrorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    if (rows.length === 0) return;
    downloadAttendanceReport(format, `Class-Attendance-${assignment?.grade}-${assignment?.stream}-${from}_to_${to}`, rows);
  };

  const totalRowsPages = Math.ceil(rows.length / rowsPerPage);
  const pagedRows = rows.slice((rowsPage - 1) * rowsPerPage, rowsPage * rowsPerPage);

  if (staff && assignmentChecked && !assignment) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
          <p className="text-muted-foreground">You are not currently assigned as a class teacher — ask an admin to assign you a class under Management &gt; Biometrics &amp; Devices.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Class Attendance</h1>
        <p className="text-muted-foreground">
          {assignment ? `${assignment.grade} ${assignment.stream} · ${roster.length} active student${roster.length === 1 ? "" : "s"}` : "Loading your class..."}
        </p>
      </div>

      {assignment && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Users className="w-4 h-4" /> Class Roster</CardTitle>
            <CardDescription>Students enrolled in {assignment.grade} {assignment.stream}</CardDescription>
          </CardHeader>
          <CardContent>
            {roster.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No active students in this class yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow><TableHead className="w-12">#</TableHead><TableHead>Adm No</TableHead><TableHead>Student</TableHead><TableHead>Parent/Guardian</TableHead><TableHead>Phone</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {roster.map((s: any, i: number) => (
                    <TableRow key={s.uuid ?? s.admissionNumber}>
                      <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{s.admissionNumber}</TableCell>
                      <TableCell className="font-medium">{s.firstName} {s.lastName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.parentName || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.parentPhone || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {assignment && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2"><ClipboardCheck className="w-4 h-4" /> Take Attendance</CardTitle>
              <CardDescription>
                Works with or without a fingerprint device — {markedCount} of {register.length} marked for this date
              </CardDescription>
            </div>
            <Input type="date" className="w-40" value={registerDate} onChange={(e) => setRegisterDate(e.target.value)} />
          </CardHeader>
          <CardContent>
            {registerLoading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
            ) : (
              <AttendanceChecklist
                rows={register}
                statusOptions={STATUS_OPTIONS}
                onStatusChange={setRowStatus}
                onRemarksChange={setRowRemarks}
                showRemarks
              />
            )}
          </CardContent>
          <div className="flex justify-end p-4 pt-0">
            <Button onClick={handleSaveAttendance} disabled={saving || registerLoading}>
              {saving ? "Saving…" : "Save Attendance"}
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="space-y-1"><Label className="text-xs">From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <Button size="sm" onClick={search}><Search className="w-4 h-4 mr-1" /> Search</Button>
          <div className="flex gap-2">
            <Select value={format} onValueChange={(v) => setFormat(v as any)}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={handleDownload}><Download className="w-4 h-4 mr-1" /> Download</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Users className="w-4 h-4" /> Entries &amp; Exits</CardTitle>
          <CardDescription>Biometric and manually-marked attendance records for your class</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Adm No</TableHead><TableHead>Student</TableHead><TableHead>Date</TableHead><TableHead>Entry</TableHead><TableHead>Exit</TableHead><TableHead>Status</TableHead><TableHead>Source</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {pagedRows.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                    <Fingerprint className="w-6 h-6 mx-auto mb-2 opacity-40" /> No attendance records for this range.
                  </TableCell></TableRow>
                ) : pagedRows.map((r) => (
                  <TableRow key={r.uuid}>
                    <TableCell className="font-mono text-xs">{r.ownerRef}</TableCell>
                    <TableCell className="font-medium">{r.ownerName}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{r.attendanceDate}</TableCell>
                    <TableCell className="text-xs">{fmtTime(r.clockInOrEntry)}</TableCell>
                    <TableCell className="text-xs">{fmtTime(r.clockOutOrExit)}</TableCell>
                    <TableCell><Badge variant={r.status === "LATE" || r.status === "ABSENT" ? "destructive" : "default"} className="text-[10px]">{r.status}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.source === "MANUAL" ? `Manual${r.markedBy ? ` · ${r.markedBy}` : ""}` : "Biometric"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Pagination currentPage={rowsPage} totalPages={totalRowsPages} onPageChange={setRowsPage}
            itemsPerPage={rowsPerPage} onItemsPerPageChange={v => { setRowsPerPage(v); setRowsPage(1); }} />
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherAttendance;
