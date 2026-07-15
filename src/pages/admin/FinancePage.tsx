import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";

const recentPayments = [
  { student: "Joy Kamau", amount: "KES 15,000", method: "M-Pesa", date: "2026-04-07", status: "Confirmed" },
  { student: "Brian Odhiambo", amount: "KES 25,000", method: "Bank Transfer", date: "2026-04-06", status: "Confirmed" },
  { student: "Faith Wanjiku", amount: "KES 10,000", method: "M-Pesa", date: "2026-04-06", status: "Pending" },
  { student: "Kevin Mwangi", amount: "KES 35,000", method: "M-Pesa", date: "2026-04-05", status: "Confirmed" },
  { student: "Mercy Chelimo", amount: "KES 8,000", method: "Cash", date: "2026-04-05", status: "Confirmed" },
];

const FinancePage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Finance</h1>
        <p className="text-muted-foreground">Fee management, payments, and financial reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Invoiced" value="KES 3.2M" icon={DollarSign} iconColor="bg-primary/10 text-primary" />
        <StatCard title="Collected" value="KES 2.4M" change="78% of target" changeType="positive" icon={TrendingUp} iconColor="bg-success/10 text-success" />
        <StatCard title="Outstanding" value="KES 780K" change="156 students" changeType="negative" icon={AlertCircle} iconColor="bg-destructive/10 text-destructive" />
        <StatCard title="This Week" value="KES 93K" change="12 transactions" changeType="neutral" icon={CheckCircle} iconColor="bg-info/10 text-info" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Payments</CardTitle>
          <CardDescription>Latest fee payments received</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentPayments.map((payment, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{payment.student}</TableCell>
                  <TableCell className="font-semibold">{payment.amount}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{payment.method}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{payment.date}</TableCell>
                  <TableCell>
                    <Badge variant={payment.status === "Confirmed" ? "default" : "secondary"} className="text-[10px]">
                      {payment.status}
                    </Badge>
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

export default FinancePage;
