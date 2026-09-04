import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, GraduationCap, DollarSign, Wallet, AlertCircle, AlertTriangle, BookOpen, BarChart3, Percent, X } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useStudentContext, STAGE_LABELS } from "@/context/StudentContext";
import { StaffApi, FeeApi, AttendanceReportApi, AcademicCalendarApi } from "@/services/api";
import { FeeArrearsRow, FeeCollectionSummaryRow } from "@/lib/feeReportExport";
import { useAuth } from "@/context/AuthContext";

const STAGE_BADGE: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  APPLICATION_REVIEW: "secondary", INTERVIEW_SCHEDULED: "outline", OFFER_SENT: "default", FEE_PAYMENT: "outline", ENROLLED: "default",
};

const TERMS = ["Term 1", "Term 2", "Term 3", "Full Year"];
const money = (v: number) => `KES ${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const monthStartISO = () => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); };
const todayISO = () => new Date().toISOString().slice(0, 10);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { students, applications, loadingStudents, loadingApplications } = useStudentContext();
  const { hasPermission } = useAuth();
  // This dashboard has no route-level gate (different widgets pull from different gated
  // endpoints), so each widget checks its own underlying API's permission and hides itself
  // — rather than firing a call the backend would 403 — for a user lacking it.
  const canViewStaff = hasPermission("STAFF_VIEW");
  const canViewAttendance = hasPermission("ATTENDANCE_VIEW");
  const canViewFees = hasPermission("FEES_VIEW");

  const [teacherCount, setTeacherCount] = useState(0);
  const [teachersOnLeave, setTeachersOnLeave] = useState(0);
  const [currentTerm, setCurrentTerm] = useState<{ academicYear: number; term: string } | null>(null);
  const [manualPeriod, setManualPeriod] = useState<{ academicYear: number; term: string } | null>(null);
  const period = manualPeriod ?? currentTerm;
  const [collectionSummary, setCollectionSummary] = useState<FeeCollectionSummaryRow[]>([]);
  const [collectionTrend, setCollectionTrend] = useState<{ month: string; collected: number }[]>([]);
  const [topArrears, setTopArrears] = useState<FeeArrearsRow[]>([]);
  const [attendanceRate, setAttendanceRate] = useState<number | null>(null);
  const [loadingFees, setLoadingFees] = useState(true);

  useEffect(() => {
    if (canViewStaff) {
      StaffApi.getAll().then((staff: any[]) => {
        setTeacherCount(staff.filter((s) => s.staffType === "TEACHING").length);
        setTeachersOnLeave(staff.filter((s) => s.staffType === "TEACHING" && s.status === "ON_LEAVE").length);
      });
    }

    if (canViewAttendance) {
      AttendanceReportApi.getSummary({ from: monthStartISO(), to: todayISO() }).then((rows: any[]) => {
        if (rows.length === 0) return;
        setAttendanceRate(rows.reduce((sum, r) => sum + r.percentage, 0) / rows.length);
      });
    }

    if (canViewFees) {
      FeeApi.getCollectionTrend(6).then(setCollectionTrend);
      AcademicCalendarApi.getCurrentTerm().then((current) => {
        if (current.term && current.academicYear) {
          setCurrentTerm({ academicYear: current.academicYear, term: current.term });
        } else {
          setLoadingFees(false);
        }
      });
    } else {
      setLoadingFees(false);
    }
  }, [canViewStaff, canViewAttendance, canViewFees]);

  useEffect(() => {
    if (!period || !canViewFees) return;
    setLoadingFees(true);
    Promise.all([
      FeeApi.getCollectionSummary(period.academicYear, period.term),
      FeeApi.getArrears({ academicYear: period.academicYear, term: period.term }),
    ]).then(([summary, arrears]) => {
      setCollectionSummary(summary);
      setTopArrears(arrears.slice(0, 5));
      setLoadingFees(false);
    });
  }, [period, canViewFees]);

  const activeStudentCount = useMemo(() => students.filter((s) => s.status === "ACTIVE").length, [students]);
  const pendingAdmissions = useMemo(() => applications.filter((a) => a.stage !== "ENROLLED" && a.stage !== "REJECTED"), [applications]);
  const recentAdmissions = useMemo(() => [...applications].sort((a, b) => b.id - a.id).slice(0, 5), [applications]);

  const feeTotals = collectionSummary.reduce(
    (acc, r) => ({ expected: acc.expected + r.expected, collected: acc.collected + r.collected, balance: acc.balance + r.balance }),
    { expected: 0, collected: 0, balance: 0 }
  );
  const collectionRate = feeTotals.expected > 0 ? (feeTotals.collected / feeTotals.expected) * 100 : 0;

  const byGrade = useMemo(() => {
    const map = new Map<string, { Expected: number; Collected: number }>();
    for (const r of collectionSummary) {
      const cur = map.get(r.grade) ?? { Expected: 0, Collected: 0 };
      cur.Expected += r.expected;
      cur.Collected += r.collected;
      map.set(r.grade, cur);
    }
    return Array.from(map.entries()).map(([grade, v]) => ({ grade, ...v }));
  }, [collectionSummary]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's what's happening at your school today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Students" value={loadingStudents ? "…" : activeStudentCount} icon={Users} iconColor="bg-primary/10 text-primary" />
        {canViewStaff && (
          <StatCard title="Teachers" value={teacherCount} change={teachersOnLeave > 0 ? `${teachersOnLeave} on leave` : undefined} icon={GraduationCap} iconColor="bg-success/10 text-success" />
        )}
        <StatCard title="Pending Admissions" value={loadingApplications ? "…" : pendingAdmissions.length} icon={AlertCircle} iconColor="bg-warning/10 text-warning" />
        {canViewFees && (
          <>
            <StatCard title="Fee Collection Rate" value={loadingFees ? "…" : `${collectionRate.toFixed(1)}%`} icon={Percent} iconColor="bg-info/10 text-info" />
            <StatCard title="Outstanding Fees" value={loadingFees ? "…" : money(feeTotals.balance)} icon={Wallet} iconColor="bg-destructive/10 text-destructive" />
          </>
        )}
        {canViewAttendance && (
          <StatCard title="Attendance Rate (MTD)" value={attendanceRate === null ? "—" : `${attendanceRate.toFixed(1)}%`} icon={BarChart3} />
        )}
      </div>

      {canViewFees && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2"><DollarSign className="w-4 h-4" /> Fee Collection by Grade</CardTitle>
                  <CardDescription>
                    {period
                      ? `Expected vs collected — ${period.term}, ${period.academicYear}${!manualPeriod ? " (current term)" : ""}`
                      : "Current academic term is not configured yet"}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={period?.term ?? ""}
                    onValueChange={(t) => setManualPeriod({ academicYear: period?.academicYear ?? new Date().getFullYear(), term: t })}
                  >
                    <SelectTrigger className="w-[110px] h-8 text-xs"><SelectValue placeholder="Term" /></SelectTrigger>
                    <SelectContent>{TERMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input
                    type="number"
                    className="w-[90px] h-8 text-xs"
                    value={period?.academicYear ?? ""}
                    onChange={(e) => setManualPeriod({ academicYear: Number(e.target.value), term: period?.term ?? TERMS[0] })}
                  />
                  {manualPeriod && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Reset to current term" onClick={() => setManualPeriod(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {byGrade.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-16">No fee data for this period yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={byGrade} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="grade" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => money(v)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Expected" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Collected" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Highest Fee Arrears</CardTitle>
              <CardDescription>Top 5 outstanding balances</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {topArrears.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No outstanding arrears for this period.</p>
              ) : topArrears.map((r) => (
                <div key={r.admissionNumber} className="flex items-start gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
                  <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-destructive">{r.studentName.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.studentName}</p>
                    <p className="text-xs text-muted-foreground">{r.grade} {r.stream}</p>
                  </div>
                  <span className="text-xs font-semibold text-destructive shrink-0">{money(r.balance)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {canViewFees && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Fee Collection Trend</CardTitle>
            <CardDescription>Confirmed payments received per month, last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={collectionTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => money(v)} />
                <Line type="monotone" dataKey="collected" name="Collected" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2"><BookOpen className="w-4 h-4" /> Recent Admissions</CardTitle>
              <CardDescription>Latest applications submitted</CardDescription>
            </div>
            <Badge variant="outline" className="cursor-pointer" onClick={() => navigate("/admin/admissions")}>View all</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentAdmissions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No admission applications yet.</p>
            ) : recentAdmissions.map((app) => (
              <div key={app.uuid} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">{app.firstName.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{app.firstName} {app.lastName}</p>
                    <p className="text-xs text-muted-foreground">{app.grade}</p>
                  </div>
                </div>
                <Badge variant={STAGE_BADGE[app.stage] ?? "outline"} className="text-[10px]">{STAGE_LABELS[app.stage] ?? app.stage}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
