import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Search, Download, AlertTriangle } from "lucide-react";
import { FeeApi } from "@/services/api";
import { downloadFeeArrearsReport, FeeArrearsRow } from "@/lib/feeReportExport";
import Pagination from "@/utils/Pagination";
import Swal from "sweetalert2";

const TERMS = ["Term 1", "Term 2", "Term 3", "Full Year"];
const money = (v: number) => `KES ${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const FeeArrearsPage = () => {
  const navigate = useNavigate();
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear());
  const [term, setTerm] = useState("Term 1");
  const [grade, setGrade] = useState("");
  const [stream, setStream] = useState("");
  const [rows, setRows] = useState<FeeArrearsRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<"csv" | "excel" | "pdf">("pdf");

  const search = async () => {
    setLoading(true);
    try {
      const data = await FeeApi.getArrears({ academicYear, term, grade: grade || undefined, stream: stream || undefined });
      setRows(data);
      setPage(1);
    } finally {
      setLoading(false);
    }
  };

  const totalBalance = rows.reduce((sum, r) => sum + r.balance, 0);
  const totalPages = Math.ceil(rows.length / perPage);
  const pagedRows = rows.slice((page - 1) * perPage, page * perPage);

  const handleDownload = () => {
    if (rows.length === 0) {
      Swal.fire({ icon: "error", title: "No data to export — generate the report first", showConfirmButton: true });
      return;
    }
    downloadFeeArrearsReport(downloadFormat, `Fee-Arrears-${academicYear}-${term}`, rows);
    setDownloadOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/reports")}><ArrowLeft className="w-5 h-5" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Fee Arrears</h1>
          <p className="text-muted-foreground">Students ranked by outstanding balance, highest first</p>
        </div>
        <Button size="sm" onClick={() => setDownloadOpen(true)}><Download className="w-4 h-4 mr-1" /> Export</Button>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Academic Year</Label>
            <Input type="number" value={academicYear} onChange={(e) => setAcademicYear(Number(e.target.value))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Term</Label>
            <Select value={term} onValueChange={setTerm}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TERMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="text-xs">Grade (optional)</Label><Input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="e.g. Grade 5" /></div>
          <div className="space-y-1"><Label className="text-xs">Stream (optional)</Label><Input value={stream} onChange={(e) => setStream(e.target.value)} placeholder="e.g. A" /></div>
          <Button size="sm" onClick={search}><Search className="w-4 h-4 mr-1" /> Generate</Button>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <p className="text-sm"><span className="font-semibold">{rows.length}</span> students with arrears totalling <span className="font-semibold">{money(totalBalance)}</span></p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admission No</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Stream</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">Billed</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">No arrears found — generate a report above.</TableCell></TableRow>
                  ) : pagedRows.map((r) => (
                    <TableRow key={r.admissionNumber}>
                      <TableCell className="font-mono text-xs">{r.admissionNumber}</TableCell>
                      <TableCell className="font-medium">{r.studentName}</TableCell>
                      <TableCell>{r.grade}</TableCell>
                      <TableCell className="text-muted-foreground">{r.stream || "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{r.parentName ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{r.parentPhone ?? "—"}</TableCell>
                      <TableCell className="text-right">{money(r.billed)}</TableCell>
                      <TableCell className="text-right">{money(r.paid)}</TableCell>
                      <TableCell className="text-right font-semibold text-destructive">{money(r.balance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage}
                itemsPerPage={perPage} onItemsPerPageChange={(v) => { setPerPage(v); setPage(1); }} />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={downloadOpen} onOpenChange={setDownloadOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Export Fee Arrears</DialogTitle></DialogHeader>
          <div className="space-y-1">
            <Label className="text-xs">Format</Label>
            <Select value={downloadFormat} onValueChange={(v) => setDownloadFormat(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDownloadOpen(false)}>Cancel</Button>
            <Button onClick={handleDownload}><Download className="w-4 h-4 mr-1" /> Download</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeeArrearsPage;
