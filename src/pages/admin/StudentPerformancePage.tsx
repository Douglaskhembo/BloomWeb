import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, TrendingUp, TrendingDown, Minus } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import { GraduationCap, Users, Award, BarChart3 } from "lucide-react";
import Pagination from "@/utils/Pagination";

const performanceData = [
  { name: "Brian Kamau", grade: "Grade 5", math: 85, english: 78, science: 92, kiswahili: 74, avg: 82, trend: "up" },
  { name: "Faith Wanjiru", grade: "Grade 5", math: 91, english: 88, science: 85, kiswahili: 90, avg: 89, trend: "up" },
  { name: "Kevin Ochieng", grade: "Grade 4", math: 65, english: 70, science: 58, kiswahili: 72, avg: 66, trend: "down" },
  { name: "Mercy Akinyi", grade: "Grade 6", math: 78, english: 82, science: 80, kiswahili: 85, avg: 81, trend: "stable" },
  { name: "James Mwangi", grade: "Grade 3", math: 72, english: 60, science: 68, kiswahili: 65, avg: 66, trend: "down" },
  { name: "Lucy Chebet", grade: "Grade 7", math: 95, english: 92, science: 97, kiswahili: 88, avg: 93, trend: "up" },
  { name: "Samuel Kiprop", grade: "Grade 8", math: 55, english: 62, science: 48, kiswahili: 70, avg: 59, trend: "down" },
  { name: "Diana Nyambura", grade: "Grade 6", math: 88, english: 85, science: 90, kiswahili: 82, avg: 86, trend: "up" },
];

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === "up") return <TrendingUp className="w-4 h-4 text-success" />;
  if (trend === "down") return <TrendingDown className="w-4 h-4 text-destructive" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
};

const scoreColor = (score: number) => {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-warning";
  return "text-destructive";
};

const StudentPerformancePage = () => {
  const [performancePage, setPerformancePage] = useState(1);
  const [performancePerPage, setPerformancePerPage] = useState(10);

  const avgScore = Math.round(performanceData.reduce((a, b) => a + b.avg, 0) / performanceData.length);
  const topPerformers = performanceData.filter((s) => s.avg >= 80).length;
  const needsSupport = performanceData.filter((s) => s.avg < 60).length;

  const totalPerformancePages = Math.ceil(performanceData.length / performancePerPage);
  const pagedPerformance = performanceData.slice((performancePage - 1) * performancePerPage, performancePage * performancePerPage);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Student Performance</h1>
          <p className="text-muted-foreground">CBC-aligned academic performance tracking</p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="term1">
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="term1">Term 1</SelectItem>
              <SelectItem value="term2">Term 2</SelectItem>
              <SelectItem value="term3">Term 3</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" /> Export</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="School Average" value={`${avgScore}%`} icon={BarChart3} iconColor="bg-primary/10 text-primary" />
        <StatCard title="Total Students" value={performanceData.length.toString()} icon={Users} iconColor="bg-info/10 text-info" />
        <StatCard title="Top Performers" value={topPerformers.toString()} change="≥80% avg" changeType="positive" icon={Award} iconColor="bg-success/10 text-success" />
        <StatCard title="Needs Support" value={needsSupport.toString()} change="<60% avg" changeType="negative" icon={GraduationCap} iconColor="bg-destructive/10 text-destructive" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Performance by Student</CardTitle>
          <CardDescription>Term 1 — 2026 subject-wise breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead className="text-center">Math</TableHead>
                <TableHead className="text-center">English</TableHead>
                <TableHead className="text-center">Science</TableHead>
                <TableHead className="text-center">Kiswahili</TableHead>
                <TableHead className="text-center">Average</TableHead>
                <TableHead className="text-center">Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedPerformance.map((s) => (
                <TableRow key={s.name}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{s.grade}</Badge></TableCell>
                  <TableCell className={`text-center ${scoreColor(s.math)}`}>{s.math}</TableCell>
                  <TableCell className={`text-center ${scoreColor(s.english)}`}>{s.english}</TableCell>
                  <TableCell className={`text-center ${scoreColor(s.science)}`}>{s.science}</TableCell>
                  <TableCell className={`text-center ${scoreColor(s.kiswahili)}`}>{s.kiswahili}</TableCell>
                  <TableCell className="text-center font-semibold">{s.avg}%</TableCell>
                  <TableCell className="text-center"><TrendIcon trend={s.trend} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination currentPage={performancePage} totalPages={totalPerformancePages} onPageChange={setPerformancePage}
            itemsPerPage={performancePerPage} onItemsPerPageChange={v => { setPerformancePerPage(v); setPerformancePage(1); }} />
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentPerformancePage;
