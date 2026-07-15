import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Download, CreditCard } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";

const payments = [
  { date: "2026-01-15", description: "Term 1 Fees", amount: "KES 35,000", method: "M-Pesa", receipt: "REC-001" },
  { date: "2026-02-10", description: "Transport Fee", amount: "KES 8,000", method: "M-Pesa", receipt: "REC-002" },
  { date: "2026-03-05", description: "Activity Fee", amount: "KES 5,000", method: "Bank", receipt: "REC-003" },
];

const ParentFees = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Fees & Payments</h1>
        <p className="text-muted-foreground">Joy Kamau · Grade 5A</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Fees" value="KES 60,500" icon={DollarSign} iconColor="bg-primary/10 text-primary" />
        <StatCard title="Paid" value="KES 48,000" changeType="positive" change="79% paid" icon={CreditCard} iconColor="bg-success/10 text-success" />
        <StatCard title="Balance" value="KES 12,500" changeType="negative" change="Due by May 1" icon={DollarSign} iconColor="bg-destructive/10 text-destructive" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment History</CardTitle>
          <CardDescription>All payments made this academic year</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p, i) => (
                <TableRow key={i}>
                  <TableCell className="text-muted-foreground">{p.date}</TableCell>
                  <TableCell className="font-medium">{p.description}</TableCell>
                  <TableCell className="font-semibold">{p.amount}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{p.method}</Badge></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm"><Download className="w-3 h-3 mr-1" />{p.receipt}</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ParentFees;
