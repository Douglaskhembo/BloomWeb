import { Users, GraduationCap, DollarSign, TrendingUp, Clock, Calendar, BookOpen, CheckCircle } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const todaySchedule = [
  { time: "8:00 - 8:40", class: "Grade 5A", subject: "Mathematics", room: "Room 12" },
  { time: "8:40 - 9:20", class: "Grade 5B", subject: "Mathematics", room: "Room 14" },
  { time: "9:20 - 10:00", class: "Grade 3A", subject: "Mathematics", room: "Room 8" },
  { time: "10:30 - 11:10", class: "Grade 4A", subject: "Mathematics", room: "Room 10" },
  { time: "11:10 - 11:50", class: "Grade 6A", subject: "Mathematics", room: "Room 16" },
  { time: "1:30 - 2:10", class: "Grade 7A", subject: "Mathematics", room: "Room 18" },
];

const pendingTasks = [
  { task: "Submit Grade 5A Term 1 scores", due: "Apr 10", priority: "High" },
  { task: "Prepare Grade 3A exam papers", due: "Apr 12", priority: "High" },
  { task: "Update lesson plans - Week 12", due: "Apr 8", priority: "Medium" },
  { task: "Parent meeting notes - Grade 6", due: "Apr 18", priority: "Low" },
];

const TeacherDashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome, Mrs. Njeri</h1>
        <p className="text-muted-foreground">Here's your day at a glance — Monday, April 7, 2026</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Classes Today" value={6} icon={BookOpen} iconColor="bg-primary/10 text-primary" />
        <StatCard title="Total Students" value={186} icon={Users} iconColor="bg-info/10 text-info" />
        <StatCard title="Leave Balance" value="12 days" icon={Calendar} iconColor="bg-success/10 text-success" />
        <StatCard title="Pending Tasks" value={4} icon={Clock} iconColor="bg-warning/10 text-warning" />
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
            {todaySchedule.map((slot, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <span className="text-xs font-mono text-muted-foreground w-24 shrink-0">{slot.time}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{slot.class} — {slot.subject}</p>
                  <p className="text-xs text-muted-foreground">{slot.room}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">Upcoming</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Pending Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingTasks.map((t, i) => (
              <div key={i} className="flex items-start gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
                <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{
                  backgroundColor: t.priority === "High" ? "hsl(var(--destructive))" : t.priority === "Medium" ? "hsl(var(--warning))" : "hsl(var(--muted-foreground))"
                }} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{t.task}</p>
                  <p className="text-xs text-muted-foreground">Due: {t.due}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeacherDashboard;
