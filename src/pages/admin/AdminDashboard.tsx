import { Users, GraduationCap, DollarSign, TrendingUp, AlertCircle, Calendar, BookOpen, BarChart3 } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const recentAdmissions = [
  { name: "Faith Wanjiku", grade: "Grade 4", status: "Approved", date: "2026-04-05" },
  { name: "Brian Odhiambo", grade: "PP2", status: "Pending", date: "2026-04-06" },
  { name: "Mercy Chelimo", grade: "Grade 1", status: "Approved", date: "2026-04-06" },
  { name: "Kevin Mwangi", grade: "Grade 7", status: "Interview", date: "2026-04-07" },
];

const upcomingEvents = [
  { title: "Term 1 Exams Begin", date: "Apr 14", type: "Academic" },
  { title: "Parents Meeting - Grade 5", date: "Apr 18", type: "Meeting" },
  { title: "Sports Day", date: "Apr 22", type: "Event" },
  { title: "Fee Deadline - Term 2", date: "May 1", type: "Finance" },
];

const AdminDashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's what's happening at your school today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Students"
          value={842}
          change="+12 this term"
          changeType="positive"
          icon={Users}
          iconColor="bg-primary/10 text-primary"
        />
        <StatCard
          title="Teachers"
          value={48}
          change="3 on leave"
          changeType="neutral"
          icon={GraduationCap}
          iconColor="bg-success/10 text-success"
        />
        <StatCard
          title="Avg Performance"
          value="72%"
          change="+3% from last term"
          changeType="positive"
          icon={TrendingUp}
          iconColor="bg-info/10 text-info"
        />
        <StatCard
          title="Pending Admissions"
          value={18}
          change="5 require action"
          changeType="neutral"
          icon={AlertCircle}
          iconColor="bg-warning/10 text-warning"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance per grade */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Performance by Grade</CardTitle>
            <CardDescription>Average score per grade — Term 1, 2026</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={[
                  { grade: "PP1", avg: 78 },
                  { grade: "PP2", avg: 75 },
                  { grade: "Gr 1", avg: 71 },
                  { grade: "Gr 2", avg: 74 },
                  { grade: "Gr 3", avg: 68 },
                  { grade: "Gr 4", avg: 72 },
                  { grade: "Gr 5", avg: 76 },
                  { grade: "Gr 6", avg: 70 },
                  { grade: "Gr 7", avg: 73 },
                  { grade: "Gr 8", avg: 69 },
                  { grade: "Gr 9", avg: 67 },
                ]}
                barSize={28}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="grade" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value: number) => [`${value}%`, "Avg Score"]}
                />
                <Bar dataKey="avg" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Upcoming events */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingEvents.map((event, i) => (
              <div key={i} className="flex items-start gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-muted-foreground">{event.date.split(" ")[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{event.title}</p>
                  <p className="text-xs text-muted-foreground">{event.date}</p>
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0">{event.type}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent admissions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Recent Admissions
          </CardTitle>
          <CardDescription>Latest admission applications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentAdmissions.map((student, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">{student.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{student.name}</p>
                    <p className="text-xs text-muted-foreground">{student.grade}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{student.date}</span>
                  <Badge
                    variant={student.status === "Approved" ? "default" : student.status === "Pending" ? "secondary" : "outline"}
                    className="text-[10px]"
                  >
                    {student.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
