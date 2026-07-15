import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, TrendingUp, BarChart3 } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";

const subjectPerformance = [
  { subject: "Mathematics", avg: 68, highest: 95, lowest: 32 },
  { subject: "English", avg: 74, highest: 98, lowest: 40 },
  { subject: "Kiswahili", avg: 71, highest: 92, lowest: 35 },
  { subject: "Science & Technology", avg: 66, highest: 90, lowest: 28 },
  { subject: "Social Studies", avg: 72, highest: 94, lowest: 38 },
  { subject: "Creative Arts", avg: 82, highest: 100, lowest: 55 },
  { subject: "Religious Education", avg: 76, highest: 96, lowest: 42 },
];

const AcademicsPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Academics</h1>
        <p className="text-muted-foreground">CBC-aligned performance tracking and assessments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="School Average" value="72%" change="+3% from Term 3" changeType="positive" icon={TrendingUp} iconColor="bg-primary/10 text-primary" />
        <StatCard title="Subjects Offered" value={7} icon={BookOpen} iconColor="bg-info/10 text-info" />
        <StatCard title="Assessments Done" value={24} change="Term 1" changeType="neutral" icon={BarChart3} iconColor="bg-success/10 text-success" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Subject Performance Overview</CardTitle>
          <CardDescription>Average scores across all grades - Term 1, 2026</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {subjectPerformance.map((item) => (
            <div key={item.subject} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{item.subject}</span>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Low: {item.lowest}%</span>
                  <span className="font-semibold text-foreground">Avg: {item.avg}%</span>
                  <span>High: {item.highest}%</span>
                </div>
              </div>
              <Progress value={item.avg} className="h-2.5" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default AcademicsPage;
