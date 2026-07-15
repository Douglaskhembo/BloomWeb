import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Search, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface TermReport {
  id: string;
  studentName: string;
  admissionNo: string;
  grade: string;
  term: string;
  year: string;
  meanScore: number;
  position: string;
  status: "Published" | "Draft";
  generatedDate: string;
}

const sampleReports: TermReport[] = [
  { id: "1", studentName: "John Kamau", admissionNo: "ADM001", grade: "Grade 5", term: "Term 1", year: "2025", meanScore: 78, position: "5/45", status: "Published", generatedDate: "2025-04-01" },
  { id: "2", studentName: "John Kamau", admissionNo: "ADM001", grade: "Grade 5", term: "Term 3", year: "2024", meanScore: 72, position: "8/45", status: "Published", generatedDate: "2024-11-20" },
  { id: "3", studentName: "John Kamau", admissionNo: "ADM001", grade: "Grade 4", term: "Term 2", year: "2024", meanScore: 75, position: "6/42", status: "Published", generatedDate: "2024-08-15" },
  { id: "4", studentName: "John Kamau", admissionNo: "ADM001", grade: "Grade 4", term: "Term 1", year: "2024", meanScore: 70, position: "10/42", status: "Published", generatedDate: "2024-04-05" },
  { id: "5", studentName: "Mary Wanjiku", admissionNo: "ADM002", grade: "Grade 5", term: "Term 1", year: "2025", meanScore: 85, position: "2/45", status: "Published", generatedDate: "2025-04-01" },
  { id: "6", studentName: "Mary Wanjiku", admissionNo: "ADM002", grade: "Grade 5", term: "Term 3", year: "2024", meanScore: 82, position: "3/45", status: "Published", generatedDate: "2024-11-20" },
  { id: "7", studentName: "Peter Ochieng", admissionNo: "ADM003", grade: "Grade 6", term: "Term 1", year: "2025", meanScore: 68, position: "12/40", status: "Draft", generatedDate: "2025-04-01" },
  { id: "8", studentName: "Grace Akinyi", admissionNo: "ADM004", grade: "Grade 3", term: "Term 1", year: "2025", meanScore: 90, position: "1/38", status: "Published", generatedDate: "2025-04-01" },
];

interface TermReportsPageProps {
  role: "admin" | "teacher" | "parent";
}

const TermReportsPage = ({ role }: TermReportsPageProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTerm, setFilterTerm] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [filterGrade, setFilterGrade] = useState("all");

  // Parent sees only their student's reports
  const parentStudentAdmNo = "ADM001";

  const filteredReports = sampleReports.filter((r) => {
    if (role === "parent" && r.admissionNo !== parentStudentAdmNo) return false;
    if (filterTerm !== "all" && r.term !== filterTerm) return false;
    if (filterYear !== "all" && r.year !== filterYear) return false;
    if (filterGrade !== "all" && r.grade !== filterGrade) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return r.studentName.toLowerCase().includes(q) || r.admissionNo.toLowerCase().includes(q);
    }
    return true;
  });

  const handleDownload = (report: TermReport) => {
    toast.success(`Downloading ${report.term} ${report.year} report for ${report.studentName}`);
  };

  const handleBulkDownload = () => {
    toast.success(`Downloading ${filteredReports.length} report(s) as ZIP`);
  };

  const uniqueYears = [...new Set(sampleReports.map((r) => r.year))].sort().reverse();
  const uniqueGrades = [...new Set(sampleReports.map((r) => r.grade))].sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Term Reports</h1>
          <p className="text-muted-foreground">
            {role === "parent"
              ? "View and download your child's academic term reports"
              : "Generate and manage student academic term reports"}
          </p>
        </div>
        {role !== "parent" && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleBulkDownload}>
              <Download className="w-4 h-4 mr-2" /> Bulk Download
            </Button>
            {role === "admin" && (
              <Button>
                <FileText className="w-4 h-4 mr-2" /> Generate Reports
              </Button>
            )}
          </div>
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
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            )}
            <Select value={filterTerm} onValueChange={setFilterTerm}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Term" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Terms</SelectItem>
                <SelectItem value="Term 1">Term 1</SelectItem>
                <SelectItem value="Term 2">Term 2</SelectItem>
                <SelectItem value="Term 3">Term 3</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {uniqueYears.map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {role !== "parent" && (
              <Select value={filterGrade} onValueChange={setFilterGrade}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  {uniqueGrades.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

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
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={role === "parent" ? 8 : 10} className="text-center py-8 text-muted-foreground">
                    No reports found
                  </TableCell>
                </TableRow>
              ) : (
                filteredReports.map((report) => (
                  <TableRow key={report.id}>
                    {role !== "parent" && <TableCell className="font-medium">{report.studentName}</TableCell>}
                    {role !== "parent" && <TableCell>{report.admissionNo}</TableCell>}
                    <TableCell>{report.grade}</TableCell>
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
                    <TableCell className="text-muted-foreground text-sm">{report.generatedDate}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" title="Preview">
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
        </CardContent>
      </Card>

      {/* Parent: Performance trend */}
      {role === "parent" && filteredReports.length > 1 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold mb-3">Performance Trend</h3>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {filteredReports
                .sort((a, b) => `${a.year}-${a.term}`.localeCompare(`${b.year}-${b.term}`))
                .map((r) => (
                  <div key={r.id} className="flex flex-col items-center min-w-[100px] p-3 rounded-lg bg-muted/50">
                    <span className="text-xs text-muted-foreground">{r.term} {r.year}</span>
                    <span className="text-lg font-bold mt-1">{r.meanScore}%</span>
                    <span className="text-xs text-muted-foreground">{r.grade}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TermReportsPage;
