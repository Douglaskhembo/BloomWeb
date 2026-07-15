import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, DollarSign, Eye, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import StatCard from "@/components/dashboard/StatCard";

interface Payslip {
  month: string;
  basic: number;
  allowances: number;
  houseAllowance: number;
  transportAllowance: number;
  deductions: number;
  nhif: number;
  nssf: number;
  paye: number;
  net: number;
  status: string;
}

const payslips: Payslip[] = [
  { month: "April 2026", basic: 65000, allowances: 12000, houseAllowance: 8000, transportAllowance: 4000, deductions: 8500, nhif: 1700, nssf: 1080, paye: 5720, net: 68500, status: "Processing" },
  { month: "March 2026", basic: 65000, allowances: 12000, houseAllowance: 8000, transportAllowance: 4000, deductions: 8500, nhif: 1700, nssf: 1080, paye: 5720, net: 68500, status: "Paid" },
  { month: "February 2026", basic: 65000, allowances: 12000, houseAllowance: 8000, transportAllowance: 4000, deductions: 8500, nhif: 1700, nssf: 1080, paye: 5720, net: 68500, status: "Paid" },
  { month: "January 2026", basic: 65000, allowances: 10000, houseAllowance: 6000, transportAllowance: 4000, deductions: 8200, nhif: 1700, nssf: 1080, paye: 5420, net: 66800, status: "Paid" },
];

const TeacherPayslips = () => {
  const [previewPayslip, setPreviewPayslip] = useState<Payslip | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Payslips</h1>
        <p className="text-muted-foreground">View your monthly salary and payslip details</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Latest Net Pay" value="KES 68,500" icon={DollarSign} iconColor="bg-success/10 text-success" />
        <StatCard title="YTD Gross" value="KES 308,000" icon={DollarSign} iconColor="bg-primary/10 text-primary" />
        <StatCard title="YTD Deductions" value="KES 34,200" icon={DollarSign} iconColor="bg-destructive/10 text-destructive" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payslip History</CardTitle>
          <CardDescription>Monthly salary breakdown</CardDescription>
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
              {payslips.map((p, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{p.month}</TableCell>
                  <TableCell className="text-right">{p.basic.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-success">{p.allowances.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-destructive">{p.deductions.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-semibold">{p.net.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "Paid" ? "default" : "secondary"} className="text-[10px]">{p.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setPreviewPayslip(p)}>
                        <Eye className="w-3 h-3 mr-1" /> Preview
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs">
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
            <DialogTitle>Payslip — {previewPayslip?.month}</DialogTitle>
          </DialogHeader>
          {previewPayslip && (
            <div className="space-y-4">
              {/* Employee Info */}
              <div className="p-4 rounded-lg bg-muted/50 space-y-1">
                <p className="text-sm font-semibold">Jane Wambui Muthoni</p>
                <p className="text-xs text-muted-foreground">Employee ID: EMP-0042 · Department: Mathematics</p>
                <p className="text-xs text-muted-foreground">Pay Period: {previewPayslip.month}</p>
              </div>

              {/* Earnings */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Earnings</h4>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Basic Salary</span>
                    <span>KES {previewPayslip.basic.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">House Allowance</span>
                    <span>KES {previewPayslip.houseAllowance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Transport Allowance</span>
                    <span>KES {previewPayslip.transportAllowance.toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Gross Pay</span>
                    <span>KES {(previewPayslip.basic + previewPayslip.allowances).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Deductions</h4>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">PAYE</span>
                    <span className="text-destructive">KES {previewPayslip.paye.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">NHIF</span>
                    <span className="text-destructive">KES {previewPayslip.nhif.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">NSSF</span>
                    <span className="text-destructive">KES {previewPayslip.nssf.toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Total Deductions</span>
                    <span className="text-destructive">KES {previewPayslip.deductions.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Net Pay */}
              <div className="flex justify-between items-center p-3 rounded-lg bg-primary/10">
                <span className="font-semibold">Net Pay</span>
                <span className="text-lg font-bold text-primary">KES {previewPayslip.net.toLocaleString()}</span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setPreviewPayslip(null)}>Close</Button>
                <Button><Download className="w-4 h-4 mr-1" /> Download PDF</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherPayslips;
