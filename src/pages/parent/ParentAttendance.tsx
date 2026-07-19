import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Fingerprint, LogIn, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { StudentApi, AttendanceReportApi } from "@/services/api";

const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtTime = (v: string | null) => (v ? new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null);

const ParentAttendance = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [rows, setRows] = useState<any[]>([]);
  const [todayRows, setTodayRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.userUuid) return;
    StudentApi.getMyChildren(user.userUuid).then(setChildren);
    AttendanceReportApi.getMyChildren({ parentUserUuid: user.userUuid, from: todayISO(), to: todayISO() }).then(setTodayRows);
  }, [user?.userUuid]);

  const search = async () => {
    if (!user?.userUuid) return;
    setLoading(true);
    try {
      setRows(await AttendanceReportApi.getMyChildren({ parentUserUuid: user.userUuid, from, to }));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { if (user?.userUuid) search(); }, [user?.userUuid]);

  const visibleRows = useMemo(
    () => (selectedChild ? rows.filter((r) => r.ownerRef === selectedChild) : rows),
    [rows, selectedChild]
  );

  const todayStatusFor = (admissionNumber: string) => {
    const entries = todayRows.filter((r) => r.ownerRef === admissionNumber);
    if (entries.length === 0) return null;
    return entries[0]; // most recent (backend returns newest first)
  };

  if (user?.userUuid && children.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
          <p className="text-muted-foreground">No active students are currently linked to your account. Contact the school office if this looks wrong.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
        <p className="text-muted-foreground">Check-in and check-out times for your {children.length > 1 ? "children" : "child"}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {children.map((c) => {
          const status = todayStatusFor(c.admissionNumber);
          const inTime = fmtTime(status?.clockInOrEntry ?? null);
          const outTime = fmtTime(status?.clockOutOrExit ?? null);
          return (
            <Card key={c.uuid}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{c.firstName} {c.lastName}</p>
                    <p className="text-xs text-muted-foreground">{c.admissionNumber} · {c.grade} {c.stream}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">Today</Badge>
                </div>
                <div className="flex gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <LogIn className="w-4 h-4 text-success" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Checked in</p>
                      <p className="text-sm font-medium">{inTime ?? "Not yet"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <LogOut className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Checked out</p>
                      <p className="text-sm font-medium">{outTime ?? "Not yet"}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Attendance History</CardTitle>
          <CardDescription>Filter by date range{children.length > 1 ? " and child" : ""}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1"><Label className="text-xs">From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
            <Button size="sm" onClick={search}><Search className="w-4 h-4 mr-1" /> Search</Button>
            {children.length > 1 && (
              <div className="flex gap-1 ml-auto">
                <Button size="sm" variant={selectedChild === "" ? "default" : "outline"} onClick={() => setSelectedChild("")}>All</Button>
                {children.map((c) => (
                  <Button key={c.uuid} size="sm" variant={selectedChild === c.admissionNumber ? "default" : "outline"} onClick={() => setSelectedChild(c.admissionNumber)}>
                    {c.firstName}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Student</TableHead><TableHead>Date</TableHead><TableHead>Entry</TableHead><TableHead>Exit</TableHead><TableHead>Status</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {visibleRows.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                    <Fingerprint className="w-6 h-6 mx-auto mb-2 opacity-40" /> No attendance records for this range.
                  </TableCell></TableRow>
                ) : visibleRows.map((r) => (
                  <TableRow key={r.uuid}>
                    <TableCell className="font-medium">{r.ownerName}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{r.attendanceDate}</TableCell>
                    <TableCell className="text-xs">{fmtTime(r.clockInOrEntry) ?? "—"}</TableCell>
                    <TableCell className="text-xs">{fmtTime(r.clockOutOrExit) ?? "—"}</TableCell>
                    <TableCell><Badge variant={r.status === "LATE" ? "destructive" : "default"} className="text-[10px]">{r.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ParentAttendance;
