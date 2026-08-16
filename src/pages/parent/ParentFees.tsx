import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DollarSign, CreditCard, Smartphone, Printer } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import Swal from "sweetalert2";
import { useAuth } from "@/context/AuthContext";
import { FeeApi, PaymentApi, StudentApi } from "@/services/api";
import { getBackendErrorMessage } from "@/utils/errorHandler";
import { toStudent, toPayment, isConfirmed, computeStudentAgg, feeStandingHtml } from "@/utils/feePayment";
import type { Payment, Student } from "@/data/feesMock";
import Pagination from "@/utils/Pagination";
import { usePrintDocument } from "@/hooks/usePrintDocument";

const fmt = (n: number) => `KES ${Math.round(n).toLocaleString()}`;

const fmtDT = (iso: string) => new Date(iso).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" });

const ParentFees = () => {
  const { user } = useAuth();
  const { escapeHtml, openPrintDocument } = usePrintDocument();

  const printReceipt = (p: Payment, s: Pick<Student, "name" | "admissionNo" | "grade" | "stream" | "parent" | "phone">, balance?: number, credit?: number) => {
    const body = `
      <div class="doc-title">
        <h1>Payment Receipt</h1>
        <h2>Receipt No. ${escapeHtml(p.receiptNumber || p.reference)}</h2>
      </div>
      <div class="meta">
        <div><span>Date:</span>${escapeHtml(fmtDT(p.date))}</div>
        <div><span>Method:</span>${escapeHtml(p.method)}</div>
        <div><span>Student:</span>${escapeHtml(s.name)}</div>
        <div><span>Admission No.:</span>${escapeHtml(s.admissionNo)}</div>
        <div><span>Grade:</span>${escapeHtml(s.grade)} ${escapeHtml(s.stream)}</div>
        <div><span>Reference:</span>${escapeHtml(p.reference)}</div>
      </div>
      <div class="grand"><span>Amount Received</span><span>KES ${p.amount.toLocaleString()}</span></div>
      ${feeStandingHtml(balance, credit)}
      <div class="signatures">
        <div class="sig"><div class="sig-line">School Finance Office</div></div>
        <div class="sig"><div class="sig-line">Parent/Guardian Copy</div></div>
      </div>`;
    openPrintDocument(`Receipt - ${p.receiptNumber || p.reference}`, body, "This is an official payment receipt — retain for your records.");
  };

  const [children, setChildren] = useState<Student[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ admissionNumber: "", phone: "", amount: "" });
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsPerPage, setPaymentsPerPage] = useState(10);

  useEffect(() => {
    if (!user?.userUuid) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [rawChildren, rawCharges, rawItems] = await Promise.all([
          StudentApi.getMyChildren(user.userUuid),
          FeeApi.getCurrentCharges(),
          FeeApi.getItems(),
        ]);
        if (cancelled) return;
        const kids = rawChildren.map((c: any) => toStudent(c, rawCharges, rawItems));
        setChildren(kids);
        if (kids.length === 0) return;
        const paymentLists = await Promise.all(kids.map((c) => FeeApi.getPayments(c.id)));
        if (cancelled) return;
        setPayments(paymentLists.flat().map(toPayment).sort((a, b) => b.date.localeCompare(a.date)));
      } catch (err) {
        if (!cancelled) Swal.fire({ icon: "error", title: "Failed to load fee data", text: getBackendErrorMessage(err), showConfirmButton: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.userUuid]);

  const visibleChildren = useMemo(
    () => (selectedChild ? children.filter((c) => c.id === selectedChild) : children),
    [children, selectedChild],
  );
  const visiblePayments = useMemo(
    () => (selectedChild ? payments.filter((p) => p.studentId === selectedChild) : payments),
    [payments, selectedChild],
  );

  const totalPaymentsPages = Math.ceil(visiblePayments.length / paymentsPerPage);
  const pagedPayments = visiblePayments.slice((paymentsPage - 1) * paymentsPerPage, paymentsPage * paymentsPerPage);

  const totals = useMemo(() => {
    const expected = visibleChildren.reduce((a, c) => a + c.expected, 0);
    const paidRaw = visiblePayments.filter(isConfirmed).reduce((a, p) => a + p.amount, 0);
    const paid = Math.min(paidRaw, expected);
    const balance = Math.max(0, expected - paid);
    return { expected, paid, balance };
  }, [visibleChildren, visiblePayments]);

  // Per-child balance/credit for receipts — a family with more than one child must never have one
  // child's overpayment silently offset another's arrears on a receipt naming a specific student.
  const childAgg = useMemo(
    () => computeStudentAgg(children, payments.filter(isConfirmed)),
    [children, payments],
  );

  const openPay = () => {
    setForm({
      admissionNumber: selectedChild || children[0]?.id || "",
      phone: "",
      amount: "",
    });
    setOpen(true);
  };

  const handlePay = async () => {
    const amount = Number(form.amount);
    if (!form.admissionNumber || !amount || amount <= 0) {
      Swal.fire({ icon: "error", title: "Enter admission number and a valid amount", showConfirmButton: true });
      return;
    }
    setSubmitting(true);
    try {
      await PaymentApi.initiateStkPush({
        admissionNumber: form.admissionNumber,
        phone: form.phone || undefined,
        amount,
      });
      Swal.fire({ icon: "success", title: "STK push sent", text: "Check your phone to complete the payment.", showConfirmButton: true });
      setOpen(false);
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to send STK push", text: getBackendErrorMessage(err), showConfirmButton: true });
    } finally {
      setSubmitting(false);
    }
  };

  if (user?.userUuid && !loading && children.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fees & Payments</h1>
          <p className="text-muted-foreground">No active students are currently linked to your account. Contact the school office if this looks wrong.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fees & Payments</h1>
          <p className="text-muted-foreground">
            {children.length > 1
              ? children.map((c) => `${c.name} · ${c.grade}${c.stream ? " " + c.stream : ""}`).join("  •  ")
              : children[0] ? `${children[0].name} · ${children[0].grade}${children[0].stream ? " " + children[0].stream : ""}` : ""}
          </p>
        </div>
        <Button size="sm" onClick={openPay} disabled={children.length === 0}><Smartphone className="w-4 h-4 mr-1" /> Pay via M-Pesa</Button>
      </div>

      {children.length > 1 && (
        <div className="flex gap-1">
          <Button size="sm" variant={selectedChild === "" ? "default" : "outline"} onClick={() => { setSelectedChild(""); setPaymentsPage(1); }}>All</Button>
          {children.map((c) => (
            <Button key={c.id} size="sm" variant={selectedChild === c.id ? "default" : "outline"} onClick={() => { setSelectedChild(c.id); setPaymentsPage(1); }}>
              {c.name.split(" ")[0]}
            </Button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Fees" value={fmt(totals.expected)} icon={DollarSign} iconColor="bg-primary/10 text-primary" />
        <StatCard
          title="Paid"
          value={fmt(totals.paid)}
          changeType="positive"
          change={`${(totals.expected ? (totals.paid / totals.expected) * 100 : 0).toFixed(0)}% paid`}
          icon={CreditCard}
          iconColor="bg-success/10 text-success"
        />
        <StatCard title="Balance" value={fmt(totals.balance)} changeType="negative" icon={DollarSign} iconColor="bg-destructive/10 text-destructive" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment History</CardTitle>
          <CardDescription>All payments recorded for {children.length > 1 && !selectedChild ? "your children" : "your child"}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                {children.length > 1 && !selectedChild && <TableHead>Student</TableHead>}
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
              ) : pagedPayments.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No payments recorded yet.</TableCell></TableRow>
              ) : pagedPayments.map((p) => {
                const c = children.find((x) => x.id === p.studentId);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">{new Date(p.date).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "2-digit" })}</TableCell>
                    {children.length > 1 && !selectedChild && <TableCell className="text-xs">{c?.name ?? p.studentId}</TableCell>}
                    <TableCell className="font-semibold">{fmt(p.amount)}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{p.method}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{p.reference}</TableCell>
                    <TableCell>
                      <Badge
                        variant={p.verificationStatus === "Confirmed" ? "default" : p.verificationStatus === "Rejected" ? "destructive" : "secondary"}
                        className="text-[10px]"
                      >
                        {p.verificationStatus ?? "Confirmed"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {isConfirmed(p) && c && (
                        <Button variant="ghost" size="sm" title="Print receipt" onClick={() => {
                          const agg = childAgg.find((x) => x.id === c.id);
                          printReceipt(p, c, agg?.balance, agg?.credit);
                        }}>
                          <Printer className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Pagination currentPage={paymentsPage} totalPages={totalPaymentsPages} onPageChange={setPaymentsPage}
            itemsPerPage={paymentsPerPage} onItemsPerPageChange={v => { setPaymentsPerPage(v); setPaymentsPage(1); }} />
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
              <Label>Student</Label>
              {children.length > 1 ? (
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={form.admissionNumber}
                  onChange={(e) => setForm({ ...form, admissionNumber: e.target.value })}
                >
                  {children.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.admissionNo}</option>)}
                </select>
              ) : (
                <Input value={form.admissionNumber ? `${children[0]?.name} — ${form.admissionNumber}` : ""} disabled />
              )}
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
