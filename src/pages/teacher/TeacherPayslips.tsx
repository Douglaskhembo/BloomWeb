import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, DollarSign, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import StatCard from "@/components/dashboard/StatCard";
import { useToast } from "@/hooks/use-toast";
import { PayrollApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { formatKES } from "@/lib/payroll/kenya";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Payslip {
  runId: number;
  monthLabel: string;
  year: number;
  monthIndex: number;
  basicSalary: number;
  taxableAllowances: number;
  nonTaxableAllowances: number;
  grossSalary: number;
  nssf: number;
  nhif: number;
  housingLevy: number;
  paye: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  paymentMethod: string | null;
  payoutDestination: string | null;
  lineStatus: "PAID" | "PENDING";
}

const toPayslip = (raw: any): Payslip => ({
  runId: raw.runId,
  monthLabel: raw.monthLabel,
  year: raw.year,
  monthIndex: raw.monthIndex,
  basicSalary: raw.basicSalary ?? 0,
  taxableAllowances: raw.taxableAllowances ?? 0,
  nonTaxableAllowances: raw.nonTaxableAllowances ?? 0,
  grossSalary: raw.grossSalary ?? 0,
  nssf: raw.nssf ?? 0,
  nhif: raw.nhif ?? 0,
  housingLevy: raw.housingLevy ?? 0,
  paye: raw.paye ?? 0,
  otherDeductions: raw.otherDeductions ?? 0,
  totalDeductions: raw.totalDeductions ?? 0,
  netSalary: raw.netSalary ?? 0,
  paymentMethod: raw.paymentMethod ?? null,
  payoutDestination: raw.payoutDestination ?? null,
  lineStatus: raw.lineStatus === "PAID" ? "PAID" : "PENDING",
});

const TeacherPayslips = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewPayslip, setPreviewPayslip] = useState<Payslip | null>(null);

  useEffect(() => {
    PayrollApi.getMyPayslips()
      .then((rows) => setPayslips((Array.isArray(rows) ? rows : []).map(toPayslip)))
      .catch(() => setPayslips([]))
      .finally(() => setLoading(false));
  }, []);

  const currentYear = new Date().getFullYear();
  const ytdPayslips = payslips.filter((p) => p.year === currentYear);
  const latestNet = payslips[0]?.netSalary ?? 0;
  const ytdGross = ytdPayslips.reduce((sum, p) => sum + p.grossSalary, 0);
  const ytdDeductions = ytdPayslips.reduce((sum, p) => sum + p.totalDeductions, 0);

  const downloadPayslip = (p: Payslip) => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Payslip — ${p.monthLabel}`, 14, 16);
    doc.setFontSize(10);
    doc.text(`${user?.firstName ?? ""} ${user?.otherNames ?? ""}`.trim(), 14, 24);
    doc.text(`Staff ID: ${user?.profileRef ?? "—"}`, 14, 29);

    autoTable(doc, {
      startY: 36,
      head: [["Earnings", "Amount (KES)"]],
      body: [
        ["Basic Salary", p.basicSalary.toLocaleString()],
        ["Taxable Allowances", p.taxableAllowances.toLocaleString()],
        ["Non-Taxable Allowances", p.nonTaxableAllowances.toLocaleString()],
        ["Gross Pay", p.grossSalary.toLocaleString()],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 41, 59] },
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 6,
      head: [["Deductions", "Amount (KES)"]],
      body: [
        ["PAYE", p.paye.toLocaleString()],
        ["NSSF", p.nssf.toLocaleString()],
        ["SHIF/NHIF", p.nhif.toLocaleString()],
        ["Housing Levy", p.housingLevy.toLocaleString()],
        ["Other Deductions", p.otherDeductions.toLocaleString()],
        ["Total Deductions", p.totalDeductions.toLocaleString()],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 41, 59] },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text(`Net Pay: KES ${p.netSalary.toLocaleString()}`, 14, finalY);
    if (p.paymentMethod) {
      doc.setFontSize(9);
      doc.text(`Paid via: ${p.paymentMethod.replace("_", " ")}${p.payoutDestination ? " — " + p.payoutDestination : ""}`, 14, finalY + 6);
    }

    doc.save(`Payslip-${p.monthLabel.replace(/\s+/g, "-")}.pdf`);
    toast({ title: "Payslip downloaded" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Payslips</h1>
        <p className="text-muted-foreground">View your monthly salary and payslip details</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Latest Net Pay" value={formatKES(latestNet)} icon={DollarSign} iconColor="bg-success/10 text-success" />
        <StatCard title={`${currentYear} YTD Gross`} value={formatKES(ytdGross)} icon={DollarSign} iconColor="bg-primary/10 text-primary" />
        <StatCard title={`${currentYear} YTD Deductions`} value={formatKES(ytdDeductions)} icon={DollarSign} iconColor="bg-destructive/10 text-destructive" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payslip History</CardTitle>
          <CardDescription>Monthly salary breakdown — only finalized (approved) payroll runs appear here</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Basic (KES)</TableHead>
                <TableHead className="text-right">Allowances</TableHead>
                <TableHead className="text-right">Deductions</TableHead>
                <TableHead className="text-right">Net Pay</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                    Loading your payslips…
                  </TableCell>
                </TableRow>
              )}
              {!loading && payslips.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                    No payslips yet — they'll appear here once a payroll run including you is approved.
                  </TableCell>
                </TableRow>
              )}
              {payslips.map((p) => (
                <TableRow key={p.runId}>
                  <TableCell className="font-medium">{p.monthLabel}</TableCell>
                  <TableCell className="text-right">{p.basicSalary.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-success">{(p.taxableAllowances + p.nonTaxableAllowances).toLocaleString()}</TableCell>
                  <TableCell className="text-right text-destructive">{p.totalDeductions.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-semibold">{p.netSalary.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={p.lineStatus === "PAID" ? "default" : "secondary"} className="text-[10px]">
                      {p.lineStatus === "PAID" ? "Paid" : "Processing"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setPreviewPayslip(p)}>
                        <Eye className="w-3 h-3 mr-1" /> Preview
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => downloadPayslip(p)}>
                        <Download className="w-3 h-3 mr-1" /> Download
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payslip Preview Dialog */}
      <Dialog open={!!previewPayslip} onOpenChange={(open) => !open && setPreviewPayslip(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payslip — {previewPayslip?.monthLabel}</DialogTitle>
          </DialogHeader>
          {previewPayslip && (
            <div className="space-y-4">
              {/* Employee Info */}
              <div className="p-4 rounded-lg bg-muted/50 space-y-1">
                <p className="text-sm font-semibold">{user?.firstName} {user?.otherNames}</p>
                <p className="text-xs text-muted-foreground">Staff ID: {user?.profileRef ?? "—"}</p>
                <p className="text-xs text-muted-foreground">Pay Period: {previewPayslip.monthLabel}</p>
              </div>

              {/* Earnings */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Earnings</h4>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Basic Salary</span>
                    <span>{formatKES(previewPayslip.basicSalary)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Taxable Allowances</span>
                    <span>{formatKES(previewPayslip.taxableAllowances)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Non-Taxable Allowances</span>
                    <span>{formatKES(previewPayslip.nonTaxableAllowances)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Gross Pay</span>
                    <span>{formatKES(previewPayslip.grossSalary)}</span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Deductions</h4>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">PAYE</span>
                    <span className="text-destructive">{formatKES(previewPayslip.paye)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">NSSF</span>
                    <span className="text-destructive">{formatKES(previewPayslip.nssf)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">SHIF / NHIF</span>
                    <span className="text-destructive">{formatKES(previewPayslip.nhif)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Housing Levy</span>
                    <span className="text-destructive">{formatKES(previewPayslip.housingLevy)}</span>
                  </div>
                  {previewPayslip.otherDeductions > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Other Deductions</span>
                      <span className="text-destructive">{formatKES(previewPayslip.otherDeductions)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Total Deductions</span>
                    <span className="text-destructive">{formatKES(previewPayslip.totalDeductions)}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Net Pay */}
              <div className="flex justify-between items-center p-3 rounded-lg bg-primary/10">
                <span className="font-semibold">Net Pay</span>
                <span className="text-lg font-bold text-primary">{formatKES(previewPayslip.netSalary)}</span>
              </div>

              {previewPayslip.paymentMethod && (
                <p className="text-xs text-muted-foreground">
                  Paid via {previewPayslip.paymentMethod.replace("_", " ")}
                  {previewPayslip.payoutDestination ? ` — ${previewPayslip.payoutDestination}` : ""}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setPreviewPayslip(null)}>Close</Button>
                <Button onClick={() => downloadPayslip(previewPayslip)}><Download className="w-4 h-4 mr-1" /> Download PDF</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherPayslips;
