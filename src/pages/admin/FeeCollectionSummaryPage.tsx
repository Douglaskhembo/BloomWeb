import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Search, Download, Wallet, TrendingUp, TrendingDown, PieChart } from "lucide-react";
import { FeeApi } from "@/services/api";
import { downloadFeeCollectionSummaryReport, FeeCollectionSummaryRow } from "@/lib/feeReportExport";
import StatCard from "@/components/dashboard/StatCard";
import Swal from "sweetalert2";

const TERMS = ["Term 1", "Term 2", "Term 3", "Full Year"];
const money = (v: number) => `KES ${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const FeeCollectionSummaryPage = () => {
  const navigate = useNavigate();
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear());
  const [term, setTerm] = useState("Term 1");
  const [rows, setRows] = useState<FeeCollectionSummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<"csv" | "excel" | "pdf">("pdf");

  const search = async () => {
    setLoading(true);
    try {
      setRows(await FeeApi.getCollectionSummary(academicYear, term));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { search(); }, []);

  const totals = rows.reduce(
    (acc, r) => ({ expected: acc.expected + r.expected, collected: acc.collected + r.collected, balance: acc.balance + r.balance }),
    { expected: 0, collected: 0, balance: 0 }
  );
  const overallPercent = totals.expected > 0 ? (totals.collected / totals.expected) * 100 : 0;

  const handleDownload = () => {
    if (rows.length === 0) {
      Swal.fire({ icon: "error", title: "No data to export", showConfirmButton: true });
      return;
    }
    downloadFeeCollectionSummaryReport(downloadFormat, `Fee-Collection-Summary-${academicYear}-${term}`, rows);
    setDownloadOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/reports")}><ArrowLeft className="w-5 h-5" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Fee Collection Summary</h1>
          <p className="text-muted-foreground">Expected vs collected fees by grade and stream</p>
        </div>
        <Button size="sm" onClick={() => setDownloadOpen(true)}><Download className="w-4 h-4 mr-1" /> Export</Button>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
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
          <Button size="sm" onClick={search}><Search className="w-4 h-4 mr-1" /> Generate</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Expected" value={money(totals.expected)} icon={Wallet} />
        <StatCard title="Collected" value={money(totals.collected)} icon={TrendingUp} iconColor="bg-success/10 text-success" />
        <StatCard title="Outstanding" value={money(totals.balance)} icon={TrendingDown} iconColor="bg-destructive/10 text-destructive" />
        <StatCard title="Collection Rate" value={`${overallPercent.toFixed(1)}%`} icon={PieChart} />
      </div>

      <p className="text-xs text-muted-foreground">
        Note: payments aren't tagged to a specific term in this system yet, so "Collected" reflects cumulative confirmed
        payments matched by grade/stream, not payments verified against this specific term's charges.
      </p>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grade</TableHead>
                  <TableHead>Stream</TableHead>
                  <TableHead className="text-right">Expected</TableHead>
                  <TableHead className="text-right">Collected</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Collection %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No data for this year/term — generate a report above.</TableCell></TableRow>
                ) : rows.map((r, i) => (
                  <TableRow key={`${r.grade}-${r.stream}-${i}`}>
                    <TableCell className="font-medium">{r.grade}</TableCell>
                    <TableCell className="text-muted-foreground">{r.stream || "—"}</TableCell>
                    <TableCell className="text-right">{money(r.expected)}</TableCell>
                    <TableCell className="text-right">{money(r.collected)}</TableCell>
                    <TableCell className="text-right">{money(r.balance)}</TableCell>
                    <TableCell className="text-right">{r.collectionPercent.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={downloadOpen} onOpenChange={setDownloadOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Export Fee Collection Summary</DialogTitle></DialogHeader>
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

export default FeeCollectionSummaryPage;
