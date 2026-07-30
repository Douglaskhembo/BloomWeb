import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import Swal from "sweetalert2";
import { FeeApi, StudentApi } from "@/services/api";
import { getBackendErrorMessage } from "@/utils/errorHandler";
import { toStudent, toPayment, isConfirmed, computeStudentAgg } from "@/utils/feePayment";
import type { Payment, Student } from "@/data/feesMock";
import Pagination from "@/utils/Pagination";

const fmt = (n: number) => `KES ${Math.round(n).toLocaleString()}`;
const fmtCompact = (n: number) => {
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `KES ${(n / 1_000).toFixed(0)}K`;
  return fmt(n);
};

const FinancePage = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsPerPage, setPaymentsPerPage] = useState(10);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [rawStudents, feeItems, rawPayments] = await Promise.all([
          StudentApi.getAll(),
          FeeApi.getItems(),
          FeeApi.getPayments(),
        ]);
        if (cancelled) return;
        setStudents(rawStudents.map((s: any) => toStudent(s, feeItems)));
        setPayments(rawPayments.map(toPayment).sort((a, b) => b.date.localeCompare(a.date)));
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: `Failed to load finance data — ${getBackendErrorMessage(err)}`,
          showConfirmButton: true,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const confirmedPayments = useMemo(() => payments.filter(isConfirmed), [payments]);
  const studentAgg = useMemo(() => computeStudentAgg(students, confirmedPayments), [students, confirmedPayments]);

  const totals = useMemo(() => {
    const invoiced = students.reduce((a, s) => a + s.expected, 0);
    const collected = studentAgg.reduce((a, s) => a + s.paid, 0);
    const outstanding = Math.max(0, invoiced - collected);
    const weekStart = Date.now() - 7 * 86400000;
    const thisWeek = confirmedPayments.filter((p) => new Date(p.date).getTime() >= weekStart);
    const weekTotal = thisWeek.reduce((a, p) => a + p.amount, 0);
    return { invoiced, collected, outstanding, weekTotal, weekCount: thisWeek.length };
  }, [students, studentAgg, confirmedPayments]);

  const totalPaymentPages = Math.ceil(payments.length / paymentsPerPage);
  const pagedPayments = payments.slice((paymentsPage - 1) * paymentsPerPage, paymentsPage * paymentsPerPage);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Finance</h1>
        <p className="text-muted-foreground">Fee management, payments, and financial reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Invoiced" value={loading ? "…" : fmtCompact(totals.invoiced)} icon={DollarSign} iconColor="bg-primary/10 text-primary" />
        <StatCard
          title="Collected"
          value={loading ? "…" : fmtCompact(totals.collected)}
          change={`${(totals.invoiced ? (totals.collected / totals.invoiced) * 100 : 0).toFixed(0)}% of target`}
          changeType="positive"
          icon={TrendingUp}
          iconColor="bg-success/10 text-success"
        />
        <StatCard
          title="Outstanding"
          value={loading ? "…" : fmtCompact(totals.outstanding)}
          change={`${studentAgg.filter((s) => s.balance > 0).length} students`}
          changeType="negative"
          icon={AlertCircle}
          iconColor="bg-destructive/10 text-destructive"
        />
        <StatCard
          title="This Week"
          value={loading ? "…" : fmtCompact(totals.weekTotal)}
          change={`${totals.weekCount} transactions`}
          changeType="neutral"
          icon={CheckCircle}
          iconColor="bg-info/10 text-info"
        />
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
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
              ) : pagedPayments.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No payments recorded yet.</TableCell></TableRow>
              ) : pagedPayments.map((payment) => {
                const s = students.find((x) => x.id === payment.studentId);
                return (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{s?.name ?? payment.studentId}</TableCell>
                    <TableCell className="font-semibold">{fmt(payment.amount)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{payment.method}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{new Date(payment.date).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "2-digit" })}</TableCell>
                    <TableCell>
                      <Badge variant={payment.verificationStatus === "Confirmed" ? "default" : payment.verificationStatus === "Rejected" ? "destructive" : "secondary"} className="text-[10px]">
                        {payment.verificationStatus ?? "Confirmed"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Pagination currentPage={paymentsPage} totalPages={totalPaymentPages} onPageChange={setPaymentsPage}
            itemsPerPage={paymentsPerPage} onItemsPerPageChange={v => { setPaymentsPerPage(v); setPaymentsPage(1); }} />
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancePage;
