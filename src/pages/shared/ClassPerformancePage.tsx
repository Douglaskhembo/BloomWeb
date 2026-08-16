import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, BookOpen, Users, Download, FileText, Award, TrendingUp, TrendingDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import StatCard from "@/components/dashboard/StatCard";
import { useAuth } from "@/context/AuthContext";
import { StaffApi, AssessmentApi, GradingApi, ClassTeacherApi, AcademicCalendarApi } from "@/services/api";

interface ClassPerformancePageProps {
  role: "teacher" | "admin";
}

const TERMS = ["Term 1", "Term 2", "Term 3"];
const TYPES = ["all", "CAT", "EXAM"] as const;
const currentYear = new Date().getFullYear();
const years = [currentYear, currentYear - 1, currentYear - 2];

const classKey = (c: any) => `${c.gradeLevelUuid}|${c.stream}|${c.subjectUuid}`;

const ClassPerformancePage = ({ role }: ClassPerformancePageProps) => {
  const { user } = useAuth();
  const [staff, setStaff] = useState<any | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [homeroomKey, setHomeroomKey] = useState<string | null>(null);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [gradingStructures, setGradingStructures] = useState<any[]>([]);

  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [term, setTerm] = useState("Term 1");
  const [year, setYear] = useState(currentYear);
  const [typeFilter, setTypeFilter] = useState<(typeof TYPES)[number]>("all");
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loadingAssessments, setLoadingAssessments] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<any | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [rowsLoading, setRowsLoading] = useState(false);

  // Load the roster of classes this viewer can see performance for.
  useEffect(() => {
    (async () => {
      setLoadingClasses(true);
      try {
        if (role === "admin") {
          setClasses(await AssessmentApi.getAllClasses());
        } else {
          if (!user?.profileRef) return;
          const s = await StaffApi.getByUuid(user.profileRef).catch(() => null);
          setStaff(s);
          if (!s?.uuid) return;
          const own = await AssessmentApi.getMyClasses(s.uuid);
          // A class teacher also sees every OTHER subject taught to their homeroom, not just the
          // ones they personally teach — merge in the unscoped listing filtered to their own class.
          const assignment = await ClassTeacherApi.getMine(s.uuid).catch(() => null);
          let merged = own;
          if (assignment) {
            setHomeroomKey(`${assignment.gradeLevelUuid}|${assignment.stream}`);
            const all = await AssessmentApi.getAllClasses();
            const homeroom = all.filter((c: any) => c.gradeLevelUuid === assignment.gradeLevelUuid && c.stream === assignment.stream);
            const known = new Set(own.map(classKey));
            merged = [...own, ...homeroom.filter((c: any) => !known.has(classKey(c)))];
          }
          setClasses(merged);
        }
      } finally {
        setLoadingClasses(false);
      }
    })();
  }, [role, user?.profileRef]);

  useEffect(() => {
    GradingApi.getAll().then(setGradingStructures);
  }, []);

  useEffect(() => {
    AcademicCalendarApi.getCurrentTerm().then((current) => {
      if (current.term) setTerm(current.term);
      if (current.academicYear) setYear(current.academicYear);
    });
  }, []);

  const getGradeInfo = (percentage: number | null, grade?: string): { label: string; points: number; remark: string } | null => {
    if (percentage === null || isNaN(percentage) || !grade) return null;
    const structure = gradingStructures.find((s) => s.grade === grade);
    const entry = structure?.entries?.find((e: any) => percentage >= e.minScore && percentage <= e.maxScore);
    return entry ? { label: entry.label, points: entry.points, remark: entry.remark } : null;
  };

  const openClass = async (cls: any) => {
    setSelectedClass(cls);
    setSelectedAssessment(null);
    setRows([]);
    setLoadingAssessments(true);
    try {
      const list = await AssessmentApi.getForClass(cls.gradeLevelUuid, cls.stream, cls.subjectUuid);
      setAssessments(list);
    } finally {
      setLoadingAssessments(false);
    }
  };

  // Assessments matching the current term/year/type filters — the ones a viewer actually wants to
  // see by default, most recent first.
  const filteredAssessments = useMemo(
    () => assessments
      .filter((a) => a.term === term && a.year === year && (typeFilter === "all" || a.type === typeFilter))
      .sort((a, b) => b.name.localeCompare(a.name)),
    [assessments, term, year, typeFilter],
  );

  // Default to the most recent matching assessment whenever the filtered set changes.
  useEffect(() => {
    if (filteredAssessments.length === 0) { setSelectedAssessment(null); setRows([]); return; }
    if (!filteredAssessments.some((a) => a.uuid === selectedAssessment?.uuid)) {
      setSelectedAssessment(filteredAssessments[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredAssessments]);

  useEffect(() => {
    if (!selectedAssessment) return;
    setRowsLoading(true);
    AssessmentApi.getMarks(selectedAssessment.uuid).then(setRows).finally(() => setRowsLoading(false));
  }, [selectedAssessment]);

  const stats = useMemo(() => {
    const graded = rows.filter((r) => r.score !== null && r.score !== undefined);
    if (graded.length === 0 || !selectedAssessment) return null;
    const pcts = graded.map((r) => (r.score / selectedAssessment.maxScore) * 100);
    const average = pcts.reduce((a, b) => a + b, 0) / pcts.length;
    const passRate = (pcts.filter((p) => p >= 50).length / pcts.length) * 100;
    return {
      average: Math.round(average * 10) / 10,
      highest: Math.round(Math.max(...pcts) * 10) / 10,
      lowest: Math.round(Math.min(...pcts) * 10) / 10,
      passRate: Math.round(passRate),
      graded: graded.length,
      total: rows.length,
    };
  }, [rows, selectedAssessment]);

  const back = () => { setSelectedClass(null); setAssessments([]); setSelectedAssessment(null); setRows([]); };

  function slipBody(doc: jsPDF, row: any, isFirst: boolean) {
    if (!isFirst) doc.addPage();
    const pct = row.score !== null && row.score !== undefined ? (row.score / selectedAssessment.maxScore) * 100 : null;
    const info = getGradeInfo(pct, selectedClass.grade);
    doc.setFontSize(14);
    doc.text(`${selectedAssessment.name} — Result Slip`, 14, 16);
    doc.setFontSize(10);
    doc.text(`${selectedClass.grade} ${selectedClass.stream} · ${selectedClass.subjectName} · ${selectedAssessment.term} ${selectedAssessment.year}`, 14, 23);
    doc.text(`${row.studentName} (${row.admissionNumber})`, 14, 30);
    autoTable(doc, {
      startY: 36,
      head: [["Score", "Max", "Percentage", "Grade", "Points", "Remark"]],
      body: [[
        row.score ?? "—",
        selectedAssessment.maxScore,
        pct !== null ? `${pct.toFixed(1)}%` : "—",
        info?.label ?? "—",
        info?.points ?? "—",
        info?.remark ?? "—",
      ]],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [30, 41, 59] },
    });
  }

  const downloadSlip = (row: any) => {
    const doc = new jsPDF();
    slipBody(doc, row, true);
    doc.save(`Result-Slip-${row.admissionNumber}-${selectedAssessment.name}.pdf`);
  };

  const downloadAllSlips = () => {
    if (rows.length === 0) return;
    const doc = new jsPDF();
    rows.forEach((row, i) => slipBody(doc, row, i === 0));
    doc.save(`Result-Slips-${selectedClass.grade}${selectedClass.stream ? "-" + selectedClass.stream : ""}-${selectedAssessment.name}.pdf`);
  };

  // Class list view
  if (!selectedClass) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{role === "admin" ? "Class Performance" : "Performance"}</h1>
          <p className="text-muted-foreground">
            {role === "admin"
              ? "Browse performance for any class in the school"
              : "Performance for classes you teach, and your homeroom class if you're a class teacher"}
          </p>
        </div>
        {loadingClasses ? (
          <p className="text-sm text-muted-foreground text-center py-8">Loading classes...</p>
        ) : classes.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
            {role === "admin" ? "No timetabled classes found." : "You have no timetabled classes yet — ask an admin to assign you subjects on the timetable."}
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((cls) => (
              <Card key={classKey(cls)} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openClass(cls)}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10"><BookOpen className="w-4 h-4 text-primary" /></div>
                      <div>
                        <p className="font-semibold text-sm">{cls.grade} {cls.stream}</p>
                        <p className="text-xs text-muted-foreground">{cls.subjectName}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{cls.studentCount} students</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    {cls.teacherName && <span>{cls.teacherName}</span>}
                    {homeroomKey === `${cls.gradeLevelUuid}|${cls.stream}` && <Badge variant="secondary" className="text-[10px]">Your homeroom</Badge>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Class performance view
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={back}><ArrowLeft className="w-4 h-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{selectedClass.grade} {selectedClass.stream} — {selectedClass.subjectName}</h1>
          <p className="text-muted-foreground">{selectedClass.studentCount} students{selectedClass.teacherName ? ` · ${selectedClass.teacherName}` : ""}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Term</Label>
            <Select value={term} onValueChange={setTerm}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TERMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Year</Label>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Type</Label>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All (CAT + Exam)</SelectItem>
                <SelectItem value="CAT">CAT</SelectItem>
                <SelectItem value="EXAM">Exam</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label className="text-xs">Assessment</Label>
            <Select value={selectedAssessment?.uuid ?? ""} onValueChange={(uuid) => setSelectedAssessment(filteredAssessments.find((a) => a.uuid === uuid) ?? null)}>
              <SelectTrigger><SelectValue placeholder={loadingAssessments ? "Loading..." : "Select an assessment"} /></SelectTrigger>
              <SelectContent>
                {filteredAssessments.map((a) => (
                  <SelectItem key={a.uuid} value={a.uuid}>{a.name} ({a.type}) — {a.gradedCount}/{a.studentCount} graded</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!loadingAssessments && filteredAssessments.length === 0 && (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
          No {typeFilter === "all" ? "" : typeFilter + " "}assessments recorded for {term} {year} in this class yet.
        </CardContent></Card>
      )}

      {selectedAssessment && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard title="Average" value={stats ? `${stats.average}%` : "—"} icon={TrendingUp} iconColor="bg-primary/10 text-primary" />
            <StatCard title="Highest" value={stats ? `${stats.highest}%` : "—"} icon={Award} iconColor="bg-success/10 text-success" />
            <StatCard title="Lowest" value={stats ? `${stats.lowest}%` : "—"} icon={TrendingDown} iconColor="bg-destructive/10 text-destructive" />
            <StatCard title="Pass Rate" value={stats ? `${stats.passRate}%` : "—"} change={stats ? `${stats.graded}/${stats.total} graded` : undefined} changeType="neutral" icon={Users} iconColor="bg-info/10 text-info" />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2"><FileText className="w-4 h-4" /> {selectedAssessment.name}</CardTitle>
                <CardDescription>{selectedAssessment.type} · {selectedAssessment.term} {selectedAssessment.year} · Max {selectedAssessment.maxScore}</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={downloadAllSlips} disabled={rows.length === 0}>
                <Download className="w-4 h-4 mr-1" /> Bulk Result Slips
              </Button>
            </CardHeader>
            <CardContent>
              {rowsLoading ? (
                <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Adm No</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                      <TableHead className="text-center">Grade</TableHead>
                      <TableHead className="text-center">Points</TableHead>
                      <TableHead>Remark</TableHead>
                      <TableHead className="text-right">Slip</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, i) => {
                      const pct = r.score === null || r.score === undefined ? null : (r.score / selectedAssessment.maxScore) * 100;
                      const info = getGradeInfo(pct, selectedClass.grade);
                      return (
                        <TableRow key={r.studentUuid}>
                          <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                          <TableCell className="font-mono text-xs">{r.admissionNumber}</TableCell>
                          <TableCell className="font-medium text-sm">{r.studentName}</TableCell>
                          <TableCell className="text-right">
                            {r.score !== null && r.score !== undefined ? (
                              <Badge variant={pct !== null && pct >= 50 ? "default" : "destructive"} className="text-[10px]">{r.score}/{selectedAssessment.maxScore}</Badge>
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-center text-sm font-semibold">{info?.label || "—"}</TableCell>
                          <TableCell className="text-center text-sm">{info?.points || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{info?.remark || "—"}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" title="Download result slip" onClick={() => downloadSlip(r)}>
                              <Download className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default ClassPerformancePage;
