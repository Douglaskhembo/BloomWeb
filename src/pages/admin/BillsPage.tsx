import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Receipt, DollarSign, Clock, CheckCircle, AlertCircle } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";

const bills = [
  { id: "BILL-001", supplier: "Nairobi Book Suppliers", description: "Term 1 Textbooks - Grade 1-5", amount: 185000, due: "2026-04-15", status: "Unpaid" },
  { id: "BILL-002", supplier: "Kenya Stationery Ltd", description: "Exam papers & stationery", amount: 42000, due: "2026-04-10", status: "Overdue" },
  { id: "BILL-003", supplier: "CleanPro Services", description: "Monthly cleaning - March", amount: 35000, due: "2026-04-05", status: "Paid" },
  { id: "BILL-004", supplier: "FoodMaster Catering", description: "School lunch program - March", amount: 280000, due: "2026-04-08", status: "Paid" },
  { id: "BILL-005", supplier: "TechEd Solutions", description: "10x Laptops for ICT lab", amount: 450000, due: "2026-04-20", status: "Unpaid" },
  { id: "BILL-006", supplier: "Safaricom Business", description: "Internet & SMS bundle - Q2", amount: 28000, due: "2026-04-12", status: "Unpaid" },
  { id: "BILL-007", supplier: "ABC Uniforms", description: "New student uniforms batch", amount: 96000, due: "2026-03-30", status: "Paid" },
];

const formatKES = (n: number) => `KES ${n.toLocaleString()}`;

const BillsPage = () => {
  const totalUnpaid = bills.filter(b => b.status !== "Paid").reduce((a, b) => a + b.amount, 0);
  const totalPaid = bills.filter(b => b.status === "Paid").reduce((a, b) => a + b.amount, 0);
  const overdue = bills.filter(b => b.status === "Overdue").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bills & Expenses</h1>
          <p className="text-muted-foreground">Track supplier invoices and school expenses</p>
        </div>
        <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Bill</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Outstanding" value={formatKES(totalUnpaid)} icon={DollarSign} iconColor="bg-destructive/10 text-destructive" />
        <StatCard title="Paid This Month" value={formatKES(totalPaid)} icon={CheckCircle} iconColor="bg-success/10 text-success" />
        <StatCard title="Overdue" value={overdue} change="Needs attention" changeType="negative" icon={AlertCircle} iconColor="bg-warning/10 text-warning" />
        <StatCard title="Total Bills" value={bills.length} icon={Receipt} iconColor="bg-info/10 text-info" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Bills</CardTitle>
          <CardDescription>Supplier invoices and expense tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill #</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-xs">{b.id}</TableCell>
                  <TableCell className="font-medium">{b.supplier}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{b.description}</TableCell>
                  <TableCell className="text-right font-semibold">{b.amount.toLocaleString()}</TableCell>
                  <TableCell className="text-xs">{b.due}</TableCell>
                  <TableCell>
                    <Badge
                      variant={b.status === "Paid" ? "default" : b.status === "Overdue" ? "destructive" : "secondary"}
                      className="text-[10px]"
                    >
                      {b.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {b.status !== "Paid" && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs">Mark Paid</Button>
                    )}
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

export default BillsPage;
