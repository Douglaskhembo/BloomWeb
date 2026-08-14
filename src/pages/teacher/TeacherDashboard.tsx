import { useEffect, useState } from "react";
import { Users, Calendar, BookOpen, CheckCircle, CalendarDays } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { StaffApi, TimetableApi, AssessmentApi, LeaveApi } from "@/services/api";

const DAY_NAMES = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const STATUS_LABELS: Record<string, string> = { PENDING: "Pending", APPROVED: "Approved", REJECTED: "Rejected" };

const formatTime = (t: string) => {
  const [h, m] = t.split(":");
  return `${parseInt(h, 10)}:${m}`;
};

const TeacherDashboard = () => {
  const { user } = useAuth();
  const [staff, setStaff] = useState<any | null>(null);
  const [periods, setPeriods] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [recentLeaves, setRecentLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.profileRef) return;
    StaffApi.getByUuid(user.profileRef).then(setStaff).catch(() => setStaff(null));
  }, [user?.profileRef]);

  useEffect(() => {
    if (!staff?.uuid) return;
    setLoading(true);
    Promise.all([
      TimetableApi.getPeriods(),
      TimetableApi.getMine(staff.uuid),
      AssessmentApi.getMyClasses(staff.uuid),
      staff.staffId ? LeaveApi.getBalances(staff.staffId) : Promise.resolve([]),
      staff.staffId ? LeaveApi.getRequests(staff.staffId) : Promise.resolve([]),
    ]).then(([p, e, c, bal, leaves]) => {
      setPeriods(Array.isArray(p) ? p : []);
      setEntries(Array.isArray(e) ? e : []);
      setClasses(Array.isArray(c) ? c : []);
      setBalances(Array.isArray(bal) ? bal : []);
      setRecentLeaves(Array.isArray(leaves) ? leaves.slice(0, 4) : []);
    }).finally(() => setLoading(false));
  }, [staff?.uuid, staff?.staffId]);

  const today = new Date();
  const todayName = DAY_NAMES[today.getDay()];
  const periodOrder = new Map(periods.map((p, i) => [p.uuid, i]));
  const todaySchedule = entries
    .filter((e) => e.dayOfWeek === todayName)
    .sort((a, b) => (periodOrder.get(a.periodUuid) ?? 0) - (periodOrder.get(b.periodUuid) ?? 0))
    .map((e) => {
      const period = periods.find((p) => p.uuid === e.periodUuid);
      return { ...e, period };
    });

  const uniqueClasses = new Map<string, number>();
  classes.forEach((c) => uniqueClasses.set(`${c.gradeLevelUuid}|${c.stream}`, c.studentCount));
  const totalStudents = Array.from(uniqueClasses.values()).reduce((sum, n) => sum + n, 0);

  const totalLeaveBalance = balances.reduce((sum, b) => sum + (b.remainingDays ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome{staff ? `, ${staff.firstName}` : ""}
        </h1>
        <p className="text-muted-foreground">
          Here's your day at a glance — {today.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Classes Today" value={todaySchedule.length} icon={BookOpen} iconColor="bg-primary/10 text-primary" />
        <StatCard title="Total Students" value={totalStudents} icon={Users} iconColor="bg-info/10 text-info" />
        <StatCard title="Leave Balance" value={`${totalLeaveBalance} days`} icon={CalendarDays} iconColor="bg-success/10 text-success" />
        <StatCard title="My Classes" value={uniqueClasses.size} icon={Calendar} iconColor="bg-warning/10 text-warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Today's Schedule
            </CardTitle>
            <CardDescription>Your classes for today</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
            ) : todaySchedule.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No classes scheduled for today.</p>
            ) : (
              todaySchedule.map((slot) => (
                <div key={slot.uuid} className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <span className="text-xs font-mono text-muted-foreground w-28 shrink-0">
                    {slot.period ? `${formatTime(slot.period.startTime)} - ${formatTime(slot.period.endTime)}` : "—"}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{slot.grade} {slot.stream} — {slot.subjectName}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Leave Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Recent Leave Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
            ) : recentLeaves.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No leave requests yet</p>
            ) : (
              recentLeaves.map((l) => (
                <div key={l.uuid} className="flex items-start justify-between gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{l.leaveType?.name}</p>
                    <p className="text-xs text-muted-foreground">{l.fromDate} → {l.toDate}</p>
                  </div>
                  <Badge
                    variant={l.status === "APPROVED" ? "default" : l.status === "PENDING" ? "secondary" : "destructive"}
                    className="text-[10px] shrink-0"
                  >
                    {STATUS_LABELS[l.status] ?? l.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeacherDashboard;
