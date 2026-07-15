import { GraduationCap, DollarSign, Calendar, Bus, TrendingUp, Clock } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const childGrades = [
  { subject: "Mathematics", score: 78, grade: "Exceeding Expectations" },
  { subject: "English", score: 85, grade: "Exceeding Expectations" },
  { subject: "Kiswahili", score: 72, grade: "Meeting Expectations" },
  { subject: "Science & Technology", score: 68, grade: "Meeting Expectations" },
  { subject: "Social Studies", score: 80, grade: "Exceeding Expectations" },
  { subject: "Creative Arts", score: 90, grade: "Exceeding Expectations" },
  { subject: "Religious Education", score: 75, grade: "Meeting Expectations" },
];

const upcomingDates = [
  { title: "Term 1 Exams", date: "Apr 14-18", type: "Exam" },
  { title: "Parents Meeting", date: "Apr 18", type: "Meeting" },
  { title: "Sports Day", date: "Apr 22", type: "Event" },
  { title: "Term 2 Fee Due", date: "May 1", type: "Finance" },
];

const ParentDashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome, Mrs. Kamau</h1>
        <p className="text-muted-foreground">Here's how your child is doing at school.</p>
      </div>

      {/* Child info */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-lg font-bold">
            JK
          </div>
          <div>
            <h2 className="font-bold text-lg">Joy Kamau</h2>
            <p className="text-sm text-muted-foreground">Grade 5 · Stream A · Adm No: 2024/0156</p>
          </div>
          <Badge className="ml-auto" variant="secondary">Active</Badge>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Average Score"
          value="78%"
          change="+5% from last term"
          changeType="positive"
          icon={TrendingUp}
          iconColor="bg-primary/10 text-primary"
        />
        <StatCard
          title="Fee Balance"
          value="KES 12,500"
          change="Due by May 1"
          changeType="negative"
          icon={DollarSign}
          iconColor="bg-destructive/10 text-destructive"
        />
        <StatCard
          title="Attendance"
          value="96%"
          change="2 days absent"
          changeType="neutral"
          icon={Clock}
          iconColor="bg-success/10 text-success"
        />
        <StatCard
          title="Bus Route"
          value="Route B"
          change="Pickup: 6:45 AM"
          changeType="neutral"
          icon={Bus}
          iconColor="bg-info/10 text-info"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grades */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <GraduationCap className="w-4 h-4" /> Term 1 Performance
            </CardTitle>
            <CardDescription>CBC Assessment Results</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {childGrades.map((item) => (
              <div key={item.subject} className="flex items-center gap-4">
                <span className="text-sm font-medium w-40 shrink-0">{item.subject}</span>
                <Progress value={item.score} className="flex-1 h-2" />
                <span className="text-sm font-semibold w-10 text-right">{item.score}%</span>
                <Badge variant="outline" className="text-[10px] w-40 justify-center shrink-0">{item.grade}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Upcoming
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingDates.map((event, i) => (
              <div key={i} className="flex items-start gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{event.title}</p>
                  <p className="text-xs text-muted-foreground">{event.date}</p>
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0">{event.type}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ParentDashboard;
