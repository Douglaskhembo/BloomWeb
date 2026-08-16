import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import { BarChart3, Users, Award } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import Pagination from "@/utils/Pagination";
import { SchoolApi, TermReportApi, AcademicCalendarApi } from "@/services/api";

const TERMS = ["Term 1", "Term 2", "Term 3"];
const currentYear = new Date().getFullYear();
const years = [currentYear, currentYear - 1, currentYear - 2];

const DiffBadge = ({ current, previous }: { current: number; previous: number }) => {
  const diff = Math.round((current - previous) * 10) / 10;
  if (diff > 0) return <span className="inline-flex items-center gap-0.5 text-xs font-medium text-success"><ArrowUpRight className="w-3 h-3" />+{diff}</span>;
  if (diff < 0) return <span className="inline-flex items-center gap-0.5 text-xs font-medium text-destructive"><ArrowDownRight className="w-3 h-3" />{diff}</span>;
  return <span className="text-xs text-muted-foreground">—</span>;
};

interface GradeRow {
  grade: string;
  currentAvg: number;
  prevTermAvg: number;
  prevYearAvg: number;
  students: number;
  passRate: number;
  prevPassRate: number;
}

/** Groups a set of TermReportResponse rows by grade into {avg mean score, pass rate (>=50%), count}. */
function summarizeByGrade(reports: any[]): Map<string, { avg: number; passRate: number; count: number }> {
  const byGrade = new Map<string, number[]>();
  for (const r of reports) {
    if (!byGrade.has(r.grade)) byGrade.set(r.grade, []);
    byGrade.get(r.grade)!.push(r.meanScore);
  }
  const out = new Map<string, { avg: number; passRate: number; count: number }>();
  for (const [grade, scores] of byGrade.entries()) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const passRate = (scores.filter((s) => s >= 50).length / scores.length) * 100;
    out.set(grade, { avg: Math.round(avg * 10) / 10, passRate: Math.round(passRate), count: scores.length });
  }
  return out;
}

const GradeComparisonPage = () => {
  const [gradeLevels, setGradeLevels] = useState<any[]>([]);
  const [term, setTerm] = useState("Term 1");
  const [year, setYear] = useState(currentYear);
  const [rows, setRows] = useState<GradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [comparisonPage, setComparisonPage] = useState(1);
  const [comparisonPerPage, setComparisonPerPage] = useState(10);

  useEffect(() => { SchoolApi.getGradeLevels().then(setGradeLevels); }, []);
  useEffect(() => {
    AcademicCalendarApi.getCurrentTerm().then((current) => {
      if (current.term) setTerm(current.term);
      if (current.academicYear) setYear(current.academicYear);
    });
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const termIdx = TERMS.indexOf(term);
        const prevTerm = termIdx <= 0 ? "Term 3" : TERMS[termIdx - 1];
        const prevTermYear = termIdx <= 0 ? year - 1 : year;

        const [current, prevTermReports, prevYearReports] = await Promise.all([
          TermReportApi.getAll({ term, year }),
          TermReportApi.getAll({ term: prevTerm, year: prevTermYear }),
          TermReportApi.getAll({ term, year: year - 1 }),
        ]);

        const curByGrade = summarizeByGrade(current);
        const prevTermByGrade = summarizeByGrade(prevTermReports);
        const prevYearByGrade = summarizeByGrade(prevYearReports);

        const gradeNames = gradeLevels.length > 0 ? gradeLevels.map((g) => g.name) : Array.from(curByGrade.keys());
        const built: GradeRow[] = gradeNames
          .map((grade) => {
            const cur = curByGrade.get(grade);
            if (!cur) return null;
            const pt = prevTermByGrade.get(grade);
            const py = prevYearByGrade.get(grade);
            return {
              grade,
              currentAvg: cur.avg,
              prevTermAvg: pt?.avg ?? 0,
              prevYearAvg: py?.avg ?? 0,
              students: cur.count,
              passRate: cur.passRate,
              prevPassRate: pt?.passRate ?? 0,
            };
          })
          .filter((r): r is GradeRow => r !== null);
        setRows(built);
      } finally {
        setLoading(false);
      }
    })();
  }, [term, year, gradeLevels]);

  const chartData = useMemo(() => rows.map((g) => ({
    name: g.grade,
    "Current Term": g.currentAvg,
    "Previous Term": g.prevTermAvg,
    "Previous Year": g.prevYearAvg,
  })), [rows]);

  const schoolCurrentAvg = rows.length ? Math.round(rows.reduce((a, b) => a + b.currentAvg, 0) / rows.length) : 0;
  const schoolPrevAvg = rows.length ? Math.round(rows.reduce((a, b) => a + b.prevTermAvg, 0) / rows.length) : 0;
  const totalStudents = rows.reduce((a, b) => a + b.students, 0);
  const improved = rows.filter((g) => g.currentAvg > g.prevTermAvg).length;

  const totalComparisonPages = Math.ceil(rows.length / comparisonPerPage);
  const pagedComparisonData = rows.slice((comparisonPage - 1) * comparisonPerPage, comparisonPage * comparisonPerPage);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Grade Performance Comparison</h1>
          <p className="text-muted-foreground">Compare current term vs previous term and previous year, from actual recorded marks</p>
        </div>
        <div className="flex gap-2">
          <Select value={term} onValueChange={setTerm}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>{TERMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Current School Avg" value={`${schoolCurrentAvg}%`} icon={BarChart3} iconColor="bg-primary/10 text-primary" />
        <StatCard
          title="vs Previous Term"
          value={`${schoolCurrentAvg > schoolPrevAvg ? "+" : ""}${schoolCurrentAvg - schoolPrevAvg}%`}
          change={schoolCurrentAvg >= schoolPrevAvg ? "Improved" : "Declined"}
          changeType={schoolCurrentAvg >= schoolPrevAvg ? "positive" : "negative"}
          icon={TrendingUp}
          iconColor="bg-success/10 text-success"
        />
        <StatCard title="Grades Improved" value={`${improved} / ${rows.length}`} icon={Award} iconColor="bg-info/10 text-info" />
        <StatCard title="Total Students" value={totalStudents.toString()} icon={Users} iconColor="bg-muted text-muted-foreground" />
      </div>

      {loading ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Loading...</CardContent></Card>
      ) : rows.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No graded assessments for {term} {year} yet.</CardContent></Card>
      ) : (
        <>
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
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Current Term" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Previous Term" fill="hsl(var(--muted-foreground))" opacity={0.5} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Previous Year" fill="hsl(var(--muted-foreground))" opacity={0.25} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pass Rate Comparison</CardTitle>
              <CardDescription>Current vs previous term pass rates (mean score ≥ 50%)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={rows.map((g) => ({ name: g.grade, Current: g.passRate, Previous: g.prevPassRate }))}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="Current" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Previous" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

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
        </>
      )}
    </div>
  );
};

export default GradeComparisonPage;
