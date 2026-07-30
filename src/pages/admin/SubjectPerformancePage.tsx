import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, TrendingUp, TrendingDown, Minus } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import { BookOpen, Users, Award, BarChart3 } from "lucide-react";
import Pagination from "@/utils/Pagination";

const subjectData = [
  { subject: "Mathematics", grade: "Grade 5", students: 42, avgScore: 72, highest: 98, lowest: 35, passRate: 81, trend: "up" },
  { subject: "English", grade: "Grade 5", students: 42, avgScore: 76, highest: 95, lowest: 40, passRate: 86, trend: "up" },
  { subject: "Science", grade: "Grade 5", students: 42, avgScore: 68, highest: 97, lowest: 28, passRate: 74, trend: "down" },
  { subject: "Kiswahili", grade: "Grade 5", students: 42, avgScore: 79, highest: 94, lowest: 45, passRate: 88, trend: "stable" },
  { subject: "Social Studies", grade: "Grade 5", students: 42, avgScore: 74, highest: 92, lowest: 38, passRate: 82, trend: "up" },
  { subject: "CRE", grade: "Grade 5", students: 42, avgScore: 82, highest: 96, lowest: 50, passRate: 92, trend: "up" },
  { subject: "Mathematics", grade: "Grade 6", students: 38, avgScore: 65, highest: 95, lowest: 22, passRate: 71, trend: "down" },
  { subject: "English", grade: "Grade 6", students: 38, avgScore: 70, highest: 90, lowest: 32, passRate: 78, trend: "stable" },
];

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === "up") return <TrendingUp className="w-4 h-4 text-success" />;
  if (trend === "down") return <TrendingDown className="w-4 h-4 text-destructive" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
};

const rateColor = (rate: number) => {
  if (rate >= 85) return "text-success";
  if (rate >= 70) return "text-warning";
  return "text-destructive";
};

const SubjectPerformancePage = () => {
  const [subjectsPage, setSubjectsPage] = useState(1);
  const [subjectsPerPage, setSubjectsPerPage] = useState(10);

  const overallAvg = Math.round(subjectData.reduce((a, b) => a + b.avgScore, 0) / subjectData.length);
  const overallPassRate = Math.round(subjectData.reduce((a, b) => a + b.passRate, 0) / subjectData.length);

  const totalSubjectPages = Math.ceil(subjectData.length / subjectsPerPage);
  const pagedSubjects = subjectData.slice((subjectsPage - 1) * subjectsPerPage, subjectsPage * subjectsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subject Performance</h1>
          <p className="text-muted-foreground">Analyse performance across subjects and grades</p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="all">
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              <SelectItem value="5">Grade 5</SelectItem>
              <SelectItem value="6">Grade 6</SelectItem>
              <SelectItem value="7">Grade 7</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="term1">
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
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
        <StatCard title="Overall Average" value={`${overallAvg}%`} icon={BarChart3} iconColor="bg-primary/10 text-primary" />
        <StatCard title="Avg Pass Rate" value={`${overallPassRate}%`} icon={Award} iconColor="bg-success/10 text-success" />
        <StatCard title="Subjects Tracked" value={new Set(subjectData.map((s) => s.subject)).size.toString()} icon={BookOpen} iconColor="bg-info/10 text-info" />
        <StatCard title="Total Entries" value={subjectData.length.toString()} icon={Users} iconColor="bg-muted text-muted-foreground" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Subject Breakdown</CardTitle>
          <CardDescription>Term 1 — 2026 per-subject statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead className="text-center">Students</TableHead>
                <TableHead className="text-center">Avg Score</TableHead>
                <TableHead className="text-center">Highest</TableHead>
                <TableHead className="text-center">Lowest</TableHead>
                <TableHead className="text-center">Pass Rate</TableHead>
                <TableHead className="text-center">Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedSubjects.map((s, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{s.subject}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{s.grade}</Badge></TableCell>
                  <TableCell className="text-center">{s.students}</TableCell>
                  <TableCell className={`text-center font-semibold ${rateColor(s.avgScore)}`}>{s.avgScore}%</TableCell>
                  <TableCell className="text-center text-success">{s.highest}</TableCell>
                  <TableCell className="text-center text-destructive">{s.lowest}</TableCell>
                  <TableCell className={`text-center font-semibold ${rateColor(s.passRate)}`}>{s.passRate}%</TableCell>
                  <TableCell className="text-center"><TrendIcon trend={s.trend} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination currentPage={subjectsPage} totalPages={totalSubjectPages} onPageChange={setSubjectsPage}
            itemsPerPage={subjectsPerPage} onItemsPerPageChange={v => { setSubjectsPerPage(v); setSubjectsPage(1); }} />
        </CardContent>
      </Card>
    </div>
  );
};

export default SubjectPerformancePage;
