import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, Fingerprint, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { StaffApi, ClassTeacherApi, AttendanceReportApi } from "@/services/api";
import { downloadAttendanceReport } from "@/lib/attendanceExport";
import Pagination from "@/utils/Pagination";

const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtTime = (v: string | null) => (v ? new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—");

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
          <CardDescription>Biometric check-in/check-out records for your class</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Adm No</TableHead><TableHead>Student</TableHead><TableHead>Date</TableHead><TableHead>Entry</TableHead><TableHead>Exit</TableHead><TableHead>Status</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {pagedRows.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                    <Fingerprint className="w-6 h-6 mx-auto mb-2 opacity-40" /> No attendance records for this range.
                  </TableCell></TableRow>
                ) : pagedRows.map((r) => (
                  <TableRow key={r.uuid}>
                    <TableCell className="font-mono text-xs">{r.ownerRef}</TableCell>
                    <TableCell className="font-medium">{r.ownerName}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{r.attendanceDate}</TableCell>
                    <TableCell className="text-xs">{fmtTime(r.clockInOrEntry)}</TableCell>
                    <TableCell className="text-xs">{fmtTime(r.clockOutOrExit)}</TableCell>
                    <TableCell><Badge variant={r.status === "LATE" ? "destructive" : "default"} className="text-[10px]">{r.status}</Badge></TableCell>
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
