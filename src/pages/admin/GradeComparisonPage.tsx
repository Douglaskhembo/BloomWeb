import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import { BarChart3, Users, Award, GraduationCap } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { useState } from "react";
import Pagination from "@/utils/Pagination";

const gradeComparisonData = [
  { grade: "PP1", currentAvg: 78, prevTermAvg: 72, prevYearAvg: 68, students: 35, passRate: 91, prevPassRate: 85 },
  { grade: "PP2", currentAvg: 75, prevTermAvg: 74, prevYearAvg: 70, students: 38, passRate: 88, prevPassRate: 86 },
  { grade: "Grade 1", currentAvg: 71, prevTermAvg: 68, prevYearAvg: 65, students: 40, passRate: 85, prevPassRate: 80 },
  { grade: "Grade 2", currentAvg: 74, prevTermAvg: 76, prevYearAvg: 72, students: 42, passRate: 86, prevPassRate: 88 },
  { grade: "Grade 3", currentAvg: 68, prevTermAvg: 70, prevYearAvg: 66, students: 44, passRate: 78, prevPassRate: 82 },
  { grade: "Grade 4", currentAvg: 72, prevTermAvg: 69, prevYearAvg: 64, students: 41, passRate: 83, prevPassRate: 78 },
  { grade: "Grade 5", currentAvg: 76, prevTermAvg: 73, prevYearAvg: 71, students: 42, passRate: 88, prevPassRate: 84 },
  { grade: "Grade 6", currentAvg: 70, prevTermAvg: 72, prevYearAvg: 69, students: 38, passRate: 82, prevPassRate: 84 },
  { grade: "Grade 7", currentAvg: 73, prevTermAvg: 71, prevYearAvg: 67, students: 36, passRate: 86, prevPassRate: 82 },
  { grade: "Grade 8", currentAvg: 69, prevTermAvg: 65, prevYearAvg: 62, students: 34, passRate: 80, prevPassRate: 74 },
  { grade: "Grade 9", currentAvg: 67, prevTermAvg: 64, prevYearAvg: 60, students: 30, passRate: 77, prevPassRate: 72 },
];

const chartData = gradeComparisonData.map((g) => ({
  name: g.grade,
  "Current Term": g.currentAvg,
  "Previous Term": g.prevTermAvg,
  "Previous Year": g.prevYearAvg,
}));

const DiffBadge = ({ current, previous }: { current: number; previous: number }) => {
  const diff = current - previous;
  if (diff > 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-success">
        <ArrowUpRight className="w-3 h-3" />+{diff}
      </span>
    );
  if (diff < 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-destructive">
        <ArrowDownRight className="w-3 h-3" />{diff}
      </span>
    );
  return <span className="text-xs text-muted-foreground">—</span>;
};

const GradeComparisonPage = () => {
  const [comparisonPage, setComparisonPage] = useState(1);
  const [comparisonPerPage, setComparisonPerPage] = useState(10);

  const schoolCurrentAvg = Math.round(gradeComparisonData.reduce((a, b) => a + b.currentAvg, 0) / gradeComparisonData.length);
  const schoolPrevAvg = Math.round(gradeComparisonData.reduce((a, b) => a + b.prevTermAvg, 0) / gradeComparisonData.length);
  const totalStudents = gradeComparisonData.reduce((a, b) => a + b.students, 0);
  const improved = gradeComparisonData.filter((g) => g.currentAvg > g.prevTermAvg).length;

  const totalComparisonPages = Math.ceil(gradeComparisonData.length / comparisonPerPage);
  const pagedComparisonData = gradeComparisonData.slice((comparisonPage - 1) * comparisonPerPage, comparisonPage * comparisonPerPage);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Grade Performance Comparison</h1>
          <p className="text-muted-foreground">Compare current term vs previous term and previous year</p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="term1-2026">
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="term1-2026">Term 1, 2026</SelectItem>
              <SelectItem value="term3-2025">Term 3, 2025</SelectItem>
              <SelectItem value="term2-2025">Term 2, 2025</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" /> Export</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Current School Avg"
          value={`${schoolCurrentAvg}%`}
          icon={BarChart3}
          iconColor="bg-primary/10 text-primary"
        />
        <StatCard
          title="vs Previous Term"
          value={`${schoolCurrentAvg > schoolPrevAvg ? "+" : ""}${schoolCurrentAvg - schoolPrevAvg}%`}
          change={schoolCurrentAvg >= schoolPrevAvg ? "Improved" : "Declined"}
          changeType={schoolCurrentAvg >= schoolPrevAvg ? "positive" : "negative"}
          icon={TrendingUp}
          iconColor="bg-success/10 text-success"
        />
        <StatCard
          title="Grades Improved"
          value={`${improved} / ${gradeComparisonData.length}`}
          icon={Award}
          iconColor="bg-info/10 text-info"
        />
        <StatCard
          title="Total Students"
          value={totalStudents.toString()}
          icon={Users}
          iconColor="bg-muted text-muted-foreground"
        />
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Average Score by Grade</CardTitle>
          <CardDescription>Current Term vs Previous Term vs Previous Year</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Current Term" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Previous Term" fill="hsl(var(--muted-foreground))" opacity={0.5} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Previous Year" fill="hsl(var(--muted-foreground))" opacity={0.25} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Pass Rate Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pass Rate Comparison</CardTitle>
          <CardDescription>Current vs previous term pass rates</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={gradeComparisonData.map((g) => ({ name: g.grade, Current: g.passRate, Previous: g.prevPassRate }))}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis domain={[60, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="Current" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Previous" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detailed Comparison</CardTitle>
          <CardDescription>Grade-by-grade breakdown with change indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Grade</TableHead>
                <TableHead className="text-center">Students</TableHead>
                <TableHead className="text-center">Current Avg</TableHead>
                <TableHead className="text-center">Prev Term</TableHead>
                <TableHead className="text-center">Δ Term</TableHead>
                <TableHead className="text-center">Prev Year</TableHead>
                <TableHead className="text-center">Δ Year</TableHead>
                <TableHead className="text-center">Pass Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedComparisonData.map((g) => (
                <TableRow key={g.grade}>
                  <TableCell className="font-medium">{g.grade}</TableCell>
                  <TableCell className="text-center">{g.students}</TableCell>
                  <TableCell className="text-center font-semibold">{g.currentAvg}%</TableCell>
                  <TableCell className="text-center text-muted-foreground">{g.prevTermAvg}%</TableCell>
                  <TableCell className="text-center"><DiffBadge current={g.currentAvg} previous={g.prevTermAvg} /></TableCell>
                  <TableCell className="text-center text-muted-foreground">{g.prevYearAvg}%</TableCell>
                  <TableCell className="text-center"><DiffBadge current={g.currentAvg} previous={g.prevYearAvg} /></TableCell>
                  <TableCell className="text-center">
                    <Badge variant={g.passRate >= 85 ? "default" : "secondary"} className="text-[10px]">{g.passRate}%</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination currentPage={comparisonPage} totalPages={totalComparisonPages} onPageChange={setComparisonPage}
            itemsPerPage={comparisonPerPage} onItemsPerPageChange={v => { setComparisonPerPage(v); setComparisonPage(1); }} />
        </CardContent>
      </Card>
    </div>
  );
};

export default GradeComparisonPage;
