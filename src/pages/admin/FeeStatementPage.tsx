import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Download, Search, Printer, FileText } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const studentInfo = {
  name: "Faith Wanjiru",
  id: "STU-002",
  grade: "Grade 5",
  parent: "Mrs. Anne Wanjiru",
  phone: "0712 345 678",
};

const statementData = [
  { date: "2026-01-10", description: "Term 1 Fees — Tuition", type: "Invoice", amount: 30000, balance: 30000 },
  { date: "2026-01-10", description: "Term 1 Fees — Activity", type: "Invoice", amount: 8000, balance: 38000 },
  { date: "2026-01-10", description: "Term 1 Fees — Transport", type: "Invoice", amount: 7000, balance: 45000 },
  { date: "2026-01-15", description: "M-Pesa Payment — Ref: QKL3X9R7", type: "Payment", amount: -15000, balance: 30000 },
  { date: "2026-02-05", description: "M-Pesa Payment — Ref: MNB8Y2K4", type: "Payment", amount: -10000, balance: 20000 },
  { date: "2026-03-01", description: "Bank Transfer — Ref: BK20260301", type: "Payment", amount: -5000, balance: 15000 },
];

const formatKES = (n: number) => `KES ${Math.abs(n).toLocaleString()}`;

const FeeStatementPage = () => {
  const totalInvoiced = statementData.filter((t) => t.type === "Invoice").reduce((a, b) => a + b.amount, 0);
  const totalPaid = Math.abs(statementData.filter((t) => t.type === "Payment").reduce((a, b) => a + b.amount, 0));
  const currentBalance = statementData[statementData.length - 1].balance;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fee Statement</h1>
          <p className="text-muted-foreground">Individual student fee statement and payment history</p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="STU-002">
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="STU-001">Brian Kamau — STU-001</SelectItem>
              <SelectItem value="STU-002">Faith Wanjiru — STU-002</SelectItem>
              <SelectItem value="STU-003">Kevin Ochieng — STU-003</SelectItem>
              <SelectItem value="STU-004">Mercy Akinyi — STU-004</SelectItem>
              <SelectItem value="STU-005">James Mwangi — STU-005</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm"><Printer className="w-4 h-4 mr-1" /> Print</Button>
          <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" /> PDF</Button>
        </div>
      </div>

      {/* Student Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Student Name</p>
              <p className="font-semibold">{studentInfo.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Student ID</p>
              <p className="font-mono font-semibold">{studentInfo.id}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Grade</p>
              <p className="font-semibold">{studentInfo.grade}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Parent/Guardian</p>
              <p className="font-semibold">{studentInfo.parent}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Phone</p>
              <p className="font-semibold">{studentInfo.phone}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total Invoiced</p>
            <p className="text-2xl font-bold">{formatKES(totalInvoiced)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total Paid</p>
            <p className="text-2xl font-bold text-success">{formatKES(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground mb-1">Outstanding Balance</p>
            <p className="text-2xl font-bold text-destructive">{formatKES(currentBalance)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Statement Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><FileText className="w-5 h-5" /> Transaction History</CardTitle>
          <CardDescription>Term 1 — 2026 fee statement</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount (KES)</TableHead>
                <TableHead className="text-right">Balance (KES)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statementData.map((t, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm">{t.date}</TableCell>
                  <TableCell className="font-medium text-sm">{t.description}</TableCell>
                  <TableCell>
                    <Badge variant={t.type === "Payment" ? "default" : "outline"} className="text-[10px]">
                      {t.type}
                    </Badge>
                  </TableCell>
                  <TableCell className={`text-right font-semibold ${t.amount < 0 ? "text-success" : ""}`}>
                    {t.amount < 0 ? `(${Math.abs(t.amount).toLocaleString()})` : t.amount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-semibold">{t.balance.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeeStatementPage;
