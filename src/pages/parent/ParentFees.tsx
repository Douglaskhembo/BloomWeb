import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DollarSign, Download, CreditCard, Smartphone } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import { useToast } from "@/hooks/use-toast";
import { PaymentApi } from "@/services/api";
import { getBackendErrorMessage } from "@/utils/errorHandler";

const payments = [
  { date: "2026-01-15", description: "Term 1 Fees", amount: "KES 35,000", method: "M-Pesa", receipt: "REC-001" },
  { date: "2026-02-10", description: "Transport Fee", amount: "KES 8,000", method: "M-Pesa", receipt: "REC-002" },
  { date: "2026-03-05", description: "Activity Fee", amount: "KES 5,000", method: "Bank", receipt: "REC-003" },
];

const ParentFees = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ admissionNumber: "", phone: "", amount: "" });

  const openPay = () => { setForm({ admissionNumber: "", phone: "", amount: "" }); setOpen(true); };

  const handlePay = async () => {
    const amount = Number(form.amount);
    if (!form.admissionNumber || !amount || amount <= 0) {
      toast({ title: "Enter admission number and a valid amount", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await PaymentApi.initiateStkPush({
        admissionNumber: form.admissionNumber,
        phone: form.phone || undefined,
        amount,
      });
      toast({ title: "STK push sent", description: "Check your phone to complete the payment." });
      setOpen(false);
    } catch (err) {
      toast({ title: "Failed to send STK push", description: getBackendErrorMessage(err), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fees & Payments</h1>
          <p className="text-muted-foreground">Joy Kamau · Grade 5A</p>
        </div>
        <Button size="sm" onClick={openPay}><Smartphone className="w-4 h-4 mr-1" /> Pay via M-Pesa</Button>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay via M-Pesa</DialogTitle>
            <DialogDescription>You'll receive an STK prompt on your phone to enter your M-Pesa PIN.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Admission Number</Label>
              <Input
                value={form.admissionNumber}
                onChange={(e) => setForm({ ...form, admissionNumber: e.target.value })}
                placeholder="e.g. ADM-2026-0123"
              />
            </div>
            <div className="space-y-2">
              <Label>M-Pesa Phone Number</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="07XXXXXXXX (defaults to parent's phone on file)"
              />
            </div>
            <div className="space-y-2">
              <Label>Amount (KES)</Label>
              <Input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="e.g. 5000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handlePay} disabled={submitting}>{submitting ? "Sending..." : "Send STK Push"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ParentFees;
