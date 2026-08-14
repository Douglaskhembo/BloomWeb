import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Download, Fingerprint, Percent } from "lucide-react";
import { AttendanceReportApi } from "@/services/api";
import { downloadAttendanceReport } from "@/lib/attendanceExport";
import StatCard from "@/components/dashboard/StatCard";
import Swal from "sweetalert2";
import Pagination from "@/utils/Pagination";

const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtTime = (v: string | null) => (v ? new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—");

const AttendancePage = () => {
  const [tab, setTab] = useState<"students" | "staff">("students");
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [grade, setGrade] = useState("");
  const [stream, setStream] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [staffId, setStaffId] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<any[]>([]);

  const [attendancePage, setAttendancePage] = useState(1);
  const [attendancePerPage, setAttendancePerPage] = useState(10);

  const [downloadOpen, setDownloadOpen] = useState(false);
  const [downloadFrom, setDownloadFrom] = useState(todayISO());
  const [downloadTo, setDownloadTo] = useState(todayISO());
  const [downloadFormat, setDownloadFormat] = useState<"csv" | "excel" | "pdf">("pdf");

  const search = async () => {
    setLoading(true);
    try {
      if (tab === "students") {
        const [data, summaryData] = await Promise.all([
          AttendanceReportApi.searchStudents({ from, to, grade: grade || undefined, stream: stream || undefined, admissionNumber: admissionNumber || undefined }),
          AttendanceReportApi.getSummary({ from, to, grade: grade || undefined, stream: stream || undefined }),
        ]);
        setRows(data);
        setSummary(summaryData);
      } else {
        setRows(await AttendanceReportApi.searchStaff({ from, to, staffId: staffId || undefined }));
        setSummary([]);
      }
      setAttendancePage(1);
    } finally {
      setLoading(false);
    }
  };

  const classAveragePercent = summary.length > 0 ? summary.reduce((sum, s) => sum + s.percentage, 0) / summary.length : 0;
  const belowThresholdCount = summary.filter((s) => s.percentage < 80).length;

  useEffect(() => { search(); }, [tab]);

  const handleDownload = async () => {
    const data = tab === "students"
      ? await AttendanceReportApi.searchStudents({ from: downloadFrom, to: downloadTo, grade: grade || undefined, stream: stream || undefined, admissionNumber: admissionNumber || undefined })
      : await AttendanceReportApi.searchStaff({ from: downloadFrom, to: downloadTo, staffId: staffId || undefined });

    if (data.length === 0) {
      Swal.fire({ icon: "error", title: "No records in that date range", showConfirmButton: true });
      return;
    }
    downloadAttendanceReport(downloadFormat, `${tab === "students" ? "Student" : "Staff"}-Attendance-${downloadFrom}_to_${downloadTo}`, data);
    setDownloadOpen(false);
  };

  const totalAttendancePages = Math.ceil(rows.length / attendancePerPage);
  const pagedRows = rows.slice((attendancePage - 1) * attendancePerPage, attendancePage * attendancePerPage);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
          <p className="text-muted-foreground">Biometric clock-in/out records for staff and students</p>
        </div>
        <Button size="sm" onClick={() => setDownloadOpen(true)}><Download className="w-4 h-4 mr-1" /> Download Report</Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "students" | "staff")}>
        <TabsList>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="staff">Staff / Teachers</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          {tab === "students" ? (
            <>
              <div className="space-y-1"><Label className="text-xs">Grade</Label><Input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="e.g. Grade 5" /></div>
              <div className="space-y-1"><Label className="text-xs">Stream</Label><Input value={stream} onChange={(e) => setStream(e.target.value)} placeholder="e.g. A" /></div>
              <div className="space-y-1"><Label className="text-xs">Admission No.</Label><Input value={admissionNumber} onChange={(e) => setAdmissionNumber(e.target.value)} placeholder="e.g. 2026/0001" /></div>
            </>
          ) : (
            <div className="space-y-1"><Label className="text-xs">Staff ID</Label><Input value={staffId} onChange={(e) => setStaffId(e.target.value)} placeholder="e.g. STF-001" /></div>
          )}
          <Button size="sm" onClick={search}><Search className="w-4 h-4 mr-1" /> Search</Button>
        </CardContent>
      </Card>

      {tab === "students" && summary.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard title="Class Average" value={`${classAveragePercent.toFixed(1)}%`} icon={Percent} />
            <StatCard title="Students Tracked" value={summary.length} icon={Fingerprint} />
            <StatCard title="Below 80% Attendance" value={belowThresholdCount} icon={Fingerprint}
              iconColor={belowThresholdCount > 0 ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"} />
          </div>
          <p className="text-xs text-muted-foreground">
            Percentage = weekdays with at least one recorded entry scan ÷ total weekdays in range. There's no school-calendar
            model yet, so public holidays aren't excluded, and a day with zero scans is treated as absent even if it was a
            scanner outage rather than a genuine absence — treat this as a proxy, not an exact figure.
          </p>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Attendance % by Student</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Adm No</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Stream</TableHead>
                    <TableHead className="text-right">Days Present</TableHead>
                    <TableHead className="text-right">School Days</TableHead>
                    <TableHead className="text-right">Attendance %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.map((s) => (
                    <TableRow key={s.admissionNumber}>
                      <TableCell className="font-mono text-xs">{s.admissionNumber}</TableCell>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.grade}</TableCell>
                      <TableCell className="text-muted-foreground">{s.stream || "—"}</TableCell>
                      <TableCell className="text-right">{s.daysPresent}</TableCell>
                      <TableCell className="text-right">{s.totalSchoolDays}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={s.percentage < 80 ? "destructive" : "default"} className="text-[10px]">{s.percentage.toFixed(1)}%</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          ) : (
            <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tab === "students" ? "Adm No" : "Staff ID"}</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>{tab === "students" ? "Entry" : "Clock In"}</TableHead>
                  <TableHead>{tab === "students" ? "Exit" : "Clock Out"}</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
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
                    <TableCell className="text-xs text-muted-foreground">{r.deviceId ?? "—"}</TableCell>
                    <TableCell><Badge variant={r.status === "LATE" ? "destructive" : "default"} className="text-[10px]">{r.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination currentPage={attendancePage} totalPages={totalAttendancePages} onPageChange={setAttendancePage}
              itemsPerPage={attendancePerPage} onItemsPerPageChange={v => { setAttendancePerPage(v); setAttendancePage(1); }} />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={downloadOpen} onOpenChange={setDownloadOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Download {tab === "students" ? "Student" : "Staff"} Attendance Report</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label className="text-xs">From</Label><Input type="date" value={downloadFrom} onChange={(e) => setDownloadFrom(e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">To</Label><Input type="date" value={downloadTo} onChange={(e) => setDownloadTo(e.target.value)} /></div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Report Type</Label>
              <Select value={downloadFormat} onValueChange={(v) => setDownloadFormat(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDownloadOpen(false)}>Cancel</Button>
            <Button onClick={handleDownload}><Download className="w-4 h-4 mr-1" /> Download</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttendancePage;
