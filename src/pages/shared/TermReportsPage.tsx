import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Search, Eye, CheckCircle2, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Swal from "sweetalert2";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Pagination from "@/utils/Pagination";
import { useAuth } from "@/context/AuthContext";
import { StaffApi, SchoolApi, TermReportApi, AcademicCalendarApi } from "@/services/api";
import { getBackendErrorMessage } from "@/utils/errorHandler";

interface TermReportsPageProps {
  role: "admin" | "teacher" | "parent";
}

const terms = ["Term 1", "Term 2", "Term 3"];
const currentYear = new Date().getFullYear();
const years = [currentYear, currentYear - 1, currentYear - 2];

const TermReportsPage = ({ role }: TermReportsPageProps) => {
  const { user } = useAuth();
  const [staff, setStaff] = useState<any | null>(null);
  const [gradeLevels, setGradeLevels] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishingKey, setPublishingKey] = useState<string | null>(null);
  const [bulkDownloading, setBulkDownloading] = useState(false);

  const [term, setTerm] = useState("Term 1");
  const [year, setYear] = useState(String(currentYear));
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGrade, setFilterGrade] = useState("all");
  const [reportsPage, setReportsPage] = useState(1);
  const [reportsPerPage, setReportsPerPage] = useState(10);

  const [detail, setDetail] = useState<any | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    if (role === "admin") SchoolApi.getGradeLevels().then(setGradeLevels);
  }, [role]);

  // Default to the actual current term/year (Academic Calendar) rather than always opening on
  // "Term 1" — a teacher/admin/parent checking reports mid-year shouldn't have to know to switch.
  useEffect(() => {
    AcademicCalendarApi.getCurrentTerm().then((current) => {
      if (current.term) setTerm(current.term);
      if (current.academicYear) setYear(String(current.academicYear));
    });
  }, []);

  useEffect(() => {
    if (role !== "teacher" || !user?.profileRef) return;
    StaffApi.getByUuid(user.profileRef).then(setStaff).catch(() => setStaff(null));
  }, [role, user?.profileRef]);

  const load = async () => {
    setLoading(true);
    try {
      if (role === "admin") {
        setReports(await TermReportApi.getAll({
          gradeLevelUuid: filterGrade !== "all" ? filterGrade : undefined,
          term,
          year: Number(year),
        }));
      } else if (role === "teacher") {
        if (!staff?.uuid) { setReports([]); return; }
        setReports(await TermReportApi.getMyClass({ teacherUuid: staff.uuid, term, year: Number(year) }));
      } else {
        if (!user?.userUuid) { setReports([]); return; }
        setReports(await TermReportApi.getMyChildren({ parentUserUuid: user.userUuid, term, year: Number(year) }));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === "teacher" && !staff?.uuid) return;
    load();
    setReportsPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, staff?.uuid, term, year, filterGrade, user?.userUuid]);

  const filteredReports = useMemo(() => {
    if (!searchQuery) return reports;
    const q = searchQuery.toLowerCase();
    return reports.filter((r) => r.studentName?.toLowerCase().includes(q) || r.admissionNumber?.toLowerCase().includes(q));
  }, [reports, searchQuery]);

  const classGroups = useMemo(() => {
    const map = new Map<string, { gradeLevelUuid: string; grade: string; stream: string; status: string; count: number }>();
    reports.forEach((r) => {
      const key = `${r.gradeLevelUuid}|${r.stream}`;
      if (!map.has(key)) map.set(key, { gradeLevelUuid: r.gradeLevelUuid, grade: r.grade, stream: r.stream, status: r.status, count: 0 });
      map.get(key)!.count += 1;
    });
    return Array.from(map.values());
  }, [reports]);

  const handlePublish = async (group: { gradeLevelUuid: string; grade: string; stream: string }) => {
    const key = `${group.gradeLevelUuid}|${group.stream}`;
    const confirm = await Swal.fire({
      title: "Publish term reports?",
      text: `${group.grade} ${group.stream} — ${term} ${year} reports will become visible to parents.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Publish",
    });
    if (!confirm.isConfirmed) return;
    setPublishingKey(key);
    try {
      await TermReportApi.publish({ gradeLevelUuid: group.gradeLevelUuid, stream: group.stream, term, year: Number(year) });
      Swal.fire({ icon: "success", title: "Published", text: "Parents can now view these reports." });
      load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: getBackendErrorMessage(err, "Failed to publish reports") });
    } finally {
      setPublishingKey(null);
    }
  };

  const openDetail = async (r: any) => {
    try {
      const d = await TermReportApi.getDetail(r.studentUuid, term, Number(year));
      setDetail(d);
      setDetailOpen(true);
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: getBackendErrorMessage(err, "Failed to load report detail") });
    }
  };

  const buildPdfPage = (doc: jsPDF, d: any, isFirst: boolean) => {
    if (!isFirst) doc.addPage();
    doc.setFontSize(14);
    doc.text(`Term Report — ${d.term} ${d.year}`, 14, 16);
    doc.setFontSize(10);
    doc.text(`${d.studentName} (${d.admissionNumber})`, 14, 24);
    doc.text(`${d.grade} ${d.stream}`.trim(), 14, 29);

    autoTable(doc, {
      startY: 36,
      head: [["Subject", "Score", "Grade", "Points", "Remark"]],
      body: d.subjects.map((s: any) => [s.subjectName, s.score, s.grade, s.points, s.remark]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 41, 59] },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(10);
    doc.text(`Mean Score: ${d.meanScore}%   Position: ${d.position}`, 14, finalY);
  };

  const handleDownload = async (r: any) => {
    try {
      const d = await TermReportApi.getDetail(r.studentUuid, term, Number(year));
      const doc = new jsPDF();
      buildPdfPage(doc, d, true);
      doc.save(`Term-Report-${d.admissionNumber}-${d.term}-${d.year}.pdf`);
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: getBackendErrorMessage(err, "Failed to generate report") });
    }
  };

  const handleBulkDownload = async () => {
    if (filteredReports.length === 0) return;
    setBulkDownloading(true);
    try {
      const doc = new jsPDF();
      for (let i = 0; i < filteredReports.length; i++) {
        const d = await TermReportApi.getDetail(filteredReports[i].studentUuid, term, Number(year));
        buildPdfPage(doc, d, i === 0);
      }
      doc.save(`Term-Reports-${term}-${year}.pdf`);
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: getBackendErrorMessage(err, "Failed to generate bulk report") });
    } finally {
      setBulkDownloading(false);
    }
  };

  const totalReportPages = Math.ceil(filteredReports.length / reportsPerPage);
  const pagedReports = filteredReports.slice((reportsPage - 1) * reportsPerPage, reportsPage * reportsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Term Reports</h1>
          <p className="text-muted-foreground">
            {role === "parent"
              ? "View and download your child's academic term reports"
              : role === "teacher"
              ? "Term reports for your homeroom class"
              : "Review and publish student academic term reports"}
          </p>
        </div>
        {filteredReports.length > 0 && (
          <Button variant="outline" onClick={handleBulkDownload} disabled={bulkDownloading}>
            <Download className="w-4 h-4 mr-2" /> {bulkDownloading ? "Preparing..." : "Bulk Download"}
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {role !== "parent" && (
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search student name or admission no..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setReportsPage(1); }}
                  className="pl-9"
                />
              </div>
            )}
            <Select value={term} onValueChange={setTerm}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Term" /></SelectTrigger>
              <SelectContent>
                {terms.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-[110px]"><SelectValue placeholder="Year" /></SelectTrigger>
              <SelectContent>
                {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            {role === "admin" && (
              <Select value={filterGrade} onValueChange={(v) => { setFilterGrade(v); setReportsPage(1); }}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Grade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  {gradeLevels.map((g) => (
                    <SelectItem key={g.uuid} value={g.uuid}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Publish actions — admin only */}
      {role === "admin" && classGroups.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {classGroups.map((g) => {
            const key = `${g.gradeLevelUuid}|${g.stream}`;
            return g.status === "Published" ? (
              <Badge key={key} variant="default" className="gap-1 py-1.5 px-3">
                <CheckCircle2 className="w-3 h-3" /> {g.grade} {g.stream} published
              </Badge>
            ) : (
              <Button key={key} size="sm" variant="outline" disabled={publishingKey === key} onClick={() => handlePublish(g)}>
                <Upload className="w-3.5 h-3.5 mr-1" /> {publishingKey === key ? "Publishing..." : `Publish ${g.grade} ${g.stream}`.trim()}
              </Button>
            );
          })}
        </div>
      )}

      {/* Reports Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {role !== "parent" && <TableHead>Student</TableHead>}
                {role !== "parent" && <TableHead>Adm No</TableHead>}
                <TableHead>Grade</TableHead>
                <TableHead>Term</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Mean Score</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={role === "parent" ? 7 : 9} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : filteredReports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={role === "parent" ? 7 : 9} className="text-center py-8 text-muted-foreground">
                    No reports found for {term} {year}
                  </TableCell>
                </TableRow>
              ) : (
                pagedReports.map((report) => (
                  <TableRow key={report.studentUuid}>
                    {role !== "parent" && <TableCell className="font-medium">{report.studentName}</TableCell>}
                    {role !== "parent" && <TableCell>{report.admissionNumber}</TableCell>}
                    <TableCell>{report.grade} {report.stream}</TableCell>
                    <TableCell>{report.term}</TableCell>
                    <TableCell>{report.year}</TableCell>
                    <TableCell>
                      <span className={report.meanScore >= 80 ? "text-green-600 font-semibold" : report.meanScore >= 60 ? "text-amber-600 font-semibold" : "text-red-600 font-semibold"}>
                        {report.meanScore}%
                      </span>
                    </TableCell>
                    <TableCell>{report.position}</TableCell>
                    <TableCell>
                      <Badge variant={report.status === "Published" ? "default" : "secondary"}>
                        {report.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" title="Preview" onClick={() => openDetail(report)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDownload(report)} title="Download PDF">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <Pagination currentPage={reportsPage} totalPages={totalReportPages} onPageChange={setReportsPage}
            itemsPerPage={reportsPerPage} onItemsPerPageChange={v => { setReportsPerPage(v); setReportsPage(1); }} />
        </CardContent>
      </Card>

      {/* Parent: Performance trend */}
      {role === "parent" && filteredReports.length > 1 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold mb-3">Performance Trend</h3>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {filteredReports.map((r) => (
                <div key={r.studentUuid} className="flex flex-col items-center min-w-[100px] p-3 rounded-lg bg-muted/50">
                  <span className="text-xs text-muted-foreground">{r.term} {r.year}</span>
                  <span className="text-lg font-bold mt-1">{r.meanScore}%</span>
                  <span className="text-xs text-muted-foreground">{r.grade} {r.stream}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{detail?.studentName} — {detail?.term} {detail?.year}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{detail.grade} {detail.stream} · {detail.admissionNumber}</span>
                <span>Position {detail.position}</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead className="text-center">Grade</TableHead>
                    <TableHead className="text-center">Points</TableHead>
                    <TableHead>Remark</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.subjects.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">No marks recorded yet</TableCell></TableRow>
                  ) : detail.subjects.map((s: any) => (
                    <TableRow key={s.subjectName}>
                      <TableCell className="text-sm">{s.subjectName}</TableCell>
                      <TableCell className="text-right text-sm">{s.score}%</TableCell>
                      <TableCell className="text-center text-sm font-semibold">{s.grade}</TableCell>
                      <TableCell className="text-center text-sm">{s.points}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{s.remark}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between font-semibold text-sm pt-2 border-t border-border">
                <span>Mean Score</span>
                <span>{detail.meanScore}%</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TermReportsPage;
