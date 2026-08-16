import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import { GraduationCap, Users, Award, BarChart3 } from "lucide-react";
import Pagination from "@/utils/Pagination";
import { SchoolApi, TermReportApi, AcademicCalendarApi } from "@/services/api";

const TERMS = ["Term 1", "Term 2", "Term 3"];
const currentYear = new Date().getFullYear();
const years = [currentYear, currentYear - 1, currentYear - 2];

const scoreColor = (score: number) => {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-warning";
  return "text-destructive";
};

const StudentPerformancePage = () => {
  const [gradeLevels, setGradeLevels] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [term, setTerm] = useState("Term 1");
  const [year, setYear] = useState(currentYear);
  const [filterGrade, setFilterGrade] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  useEffect(() => { SchoolApi.getGradeLevels().then(setGradeLevels); }, []);
  useEffect(() => {
    AcademicCalendarApi.getCurrentTerm().then((current) => {
      if (current.term) setTerm(current.term);
      if (current.academicYear) setYear(current.academicYear);
    });
  }, []);

  const load = async (t: string, y: number, grade: string) => {
    setLoading(true);
    try {
      setReports(await TermReportApi.getAll({ gradeLevelUuid: grade !== "all" ? grade : undefined, term: t, year: y }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(term, year, filterGrade); setPage(1); }, [term, year, filterGrade]);

  const filtered = useMemo(() => {
    if (!search) return reports;
    const q = search.toLowerCase();
    return reports.filter((r) => r.studentName?.toLowerCase().includes(q) || r.admissionNumber?.toLowerCase().includes(q));
  }, [reports, search]);

  const graded = filtered.filter((r) => r.meanScore > 0);
  const avgScore = graded.length ? Math.round(graded.reduce((a, b) => a + b.meanScore, 0) / graded.length) : 0;
  const topPerformers = graded.filter((r) => r.meanScore >= 80).length;
  const needsSupport = graded.filter((r) => r.meanScore < 60).length;

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Student Performance</h1>
        <p className="text-muted-foreground">Mean score and class ranking, from actual recorded assessment marks</p>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search student or admission no..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
          </div>
          <Select value={filterGrade} onValueChange={setFilterGrade}>
            <SelectTrigger><SelectValue placeholder="Grade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {gradeLevels.map((g) => <SelectItem key={g.uuid} value={g.uuid}>{g.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={term} onValueChange={setTerm}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TERMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="School Average" value={`${avgScore}%`} icon={BarChart3} iconColor="bg-primary/10 text-primary" />
        <StatCard title="Students Graded" value={graded.length.toString()} icon={Users} iconColor="bg-info/10 text-info" />
        <StatCard title="Top Performers" value={topPerformers.toString()} change="≥80% mean" changeType="positive" icon={Award} iconColor="bg-success/10 text-success" />
        <StatCard title="Needs Support" value={needsSupport.toString()} change="<60% mean" changeType="negative" icon={GraduationCap} iconColor="bg-destructive/10 text-destructive" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Performance by Student</CardTitle>
          <CardDescription>{term} — {year} · mean score across every graded subject, ranked within grade+stream</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Adm No</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead className="text-center">Mean Score</TableHead>
                <TableHead className="text-center">Position</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow>
              ) : paged.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No graded assessments for {term} {year} yet.</TableCell></TableRow>
              ) : paged.map((r) => (
                <TableRow key={r.studentUuid}>
                  <TableCell className="font-medium">{r.studentName}</TableCell>
                  <TableCell className="font-mono text-xs">{r.admissionNumber}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{r.grade} {r.stream}</Badge></TableCell>
                  <TableCell className={`text-center font-semibold ${scoreColor(r.meanScore)}`}>{r.meanScore}%</TableCell>
                  <TableCell className="text-center">{r.position}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={r.status === "Published" ? "default" : "secondary"} className="text-[10px]">{r.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage}
            itemsPerPage={perPage} onItemsPerPageChange={v => { setPerPage(v); setPage(1); }} />
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentPerformancePage;
