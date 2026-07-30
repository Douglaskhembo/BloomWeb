import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Download, Search, Activity, Users, AlertTriangle, CheckCircle, DollarSign,
  Calendar, TrendingUp, FileText, FileSpreadsheet, Printer, Radio, Bell, Eye,
  Plus, ShieldCheck, XCircle, Clock,
} from "lucide-react";
import { ArrowLeft, Wallet, CalendarDays, School } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Swal from "sweetalert2";
import StatCard from "@/components/dashboard/StatCard";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip as RTooltip, CartesianGrid, Legend,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  GRADES, STREAMS, METHODS, ROLES, type Payment, type Student, type Role, type PaymentMethod,
} from "@/data/feesMock";
import { FeeApi, StudentApi } from "@/services/api";
import { getBackendErrorMessage } from "@/utils/errorHandler";
import { useAuth } from "@/context/AuthContext";
import { METHOD_TO_BACKEND, toPayment, toStudent, computeStudentAgg } from "@/utils/feePayment";

// Methods a real-world walk-in payer could hand over in person, or that staff might need to
// backfill if the live M-Pesa/bank integration is temporarily down.
const MANUAL_METHODS: PaymentMethod[] = ["Cash", "Cheque", "Bank", "Card", "M-Pesa"];

const fmt = (n: number) => `KES ${Math.round(n).toLocaleString()}`;
const fmtDT = (iso: string) =>
  new Date(iso).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" });
const fmtD = (iso: string) =>
  new Date(iso).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "2-digit" });

const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--info))", "hsl(var(--destructive))", "hsl(var(--muted-foreground))"];

const SchoolFeesPage = () => {
  const { user } = useAuth();
  const verifierName = user?.userName || user?.firstName || "Finance Officer";

  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveMode, setLiveMode] = useState(true);
  const [role, setRole] = useState<Role>("Administrator");
  const canAct = role !== "Auditor";

  // Manual payment capture (cash / cheque / bank-slip walk-ins, or a fallback when the live
  // M-Pesa/bank integration is down)
  const [recordOpen, setRecordOpen] = useState(false);
  const [rpQuery, setRpQuery] = useState("");
  const [rpStudent, setRpStudent] = useState<Student | null>(null);
  const [rpMethod, setRpMethod] = useState<PaymentMethod>("Cash");
  const [rpAmount, setRpAmount] = useState("");
  const [rpReference, setRpReference] = useState("");
  const [rpBankName, setRpBankName] = useState("");
  const [rpNotes, setRpNotes] = useState("");
  const [rpDate, setRpDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [rpSubmitting, setRpSubmitting] = useState(false);

  function resetRecordForm() {
    setRpQuery(""); setRpStudent(null); setRpMethod("Cash"); setRpAmount(""); setRpReference("");
    setRpBankName(""); setRpNotes(""); setRpDate(new Date().toISOString().slice(0, 16));
  }

  async function submitManualPayment() {
    if (!rpStudent) { Swal.fire({ icon: "error", title: "Error", text: "Select a student", showConfirmButton: true }); return; }
    const amt = Number(rpAmount);
    if (!amt || amt <= 0) { Swal.fire({ icon: "error", title: "Error", text: "Enter a valid amount", showConfirmButton: true }); return; }
    if (!rpReference.trim()) { Swal.fire({ icon: "error", title: "Error", text: "Receipt / reference number is required", showConfirmButton: true }); return; }
    const isBankLike = rpMethod === "Cheque" || rpMethod === "Bank";
    setRpSubmitting(true);
    try {
      const saved = await FeeApi.recordPayment({
        studentId: rpStudent.id,
        studentName: rpStudent.name,
        grade: rpStudent.grade,
        stream: rpStudent.stream,
        amount: amt,
        expectedAmount: rpStudent.expected,
        method: METHOD_TO_BACKEND[rpMethod],
        reference: rpReference.trim(),
        paymentDate: new Date(rpDate).toISOString(),
        bankName: isBankLike ? rpBankName.trim() || undefined : undefined,
        slipOrChequeNumber: isBankLike ? rpReference.trim() : undefined,
        notes: rpNotes.trim() || undefined,
      });
      const mapped = toPayment(saved);
      setPayments((prev) => [mapped, ...prev]);
      if (mapped.verificationStatus === "Pending Verification") {
        Swal.fire({
          title: "Success",
          text: `Payment recorded — pending verification — ${rpStudent.name} • ${fmt(amt)} • won't count toward balance until confirmed`,
          icon: "success",
          showConfirmButton: true,
        });
        refreshPendingVerification();
      } else {
        Swal.fire({ title: "Success", text: `Payment recorded — ${rpStudent.name} • ${fmt(amt)}`, icon: "success", showConfirmButton: true });
      }
      setRecordOpen(false);
      resetRecordForm();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: `Failed to record payment — ${getBackendErrorMessage(err)}`, showConfirmButton: true });
    } finally {
      setRpSubmitting(false);
    }
  }

  // Pending verification queue (maker-checker for manual cheque / bank-slip / integration-fallback entries)
  const [pendingVerification, setPendingVerification] = useState<Payment[]>([]);
  const [rejectFor, setRejectFor] = useState<Payment | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  async function refreshPendingVerification() {
    const raw = await FeeApi.getPendingVerification();
    setPendingVerification(raw.map(toPayment));
  }

  useEffect(() => { refreshPendingVerification(); }, []);

  async function handleVerify(p: Payment) {
    try {
      await FeeApi.verifyPayment(Number(p.id), verifierName);
      Swal.fire({ title: "Success", text: `Payment verified — ${fmt(p.amount)} confirmed and now counts toward the balance`, icon: "success", showConfirmButton: true });
      setPendingVerification((prev) => prev.filter((x) => x.id !== p.id));
      setPayments((prev) => prev.map((x) => (x.id === p.id ? { ...x, verificationStatus: "Confirmed" } : x)));
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: `Failed to verify payment — ${getBackendErrorMessage(err)}`, showConfirmButton: true });
    }
  }

  async function confirmReject() {
    if (!rejectFor) return;
    if (!rejectReason.trim()) { Swal.fire({ icon: "error", title: "Error", text: "Rejection reason is required", showConfirmButton: true }); return; }
    try {
      await FeeApi.rejectPayment(Number(rejectFor.id), verifierName, rejectReason.trim());
      Swal.fire({ title: "Success", text: "Payment rejected", icon: "success", showConfirmButton: true });
      setPendingVerification((prev) => prev.filter((x) => x.id !== rejectFor.id));
      setPayments((prev) => prev.map((x) => (x.id === rejectFor.id ? { ...x, verificationStatus: "Rejected", rejectionReason: rejectReason.trim() } : x)));
      setRejectFor(null); setRejectReason("");
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: `Failed to reject payment — ${getBackendErrorMessage(err)}`, showConfirmButton: true });
    }
  }

  // Initial load from backend
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [rawStudents, rawItems, rawPayments] = await Promise.all([
          StudentApi.getAll(),
          FeeApi.getItems(),
          FeeApi.getPayments(),
        ]);
        if (cancelled) return;
        setStudents(rawStudents.map((s: any) => toStudent(s, rawItems)));
        setPayments(rawPayments.map(toPayment));
      } catch (err) {
        Swal.fire({ icon: "error", title: "Error", text: `Failed to load fee data — ${getBackendErrorMessage(err)}`, showConfirmButton: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Filters
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState<string>("all");
  const [stream, setStream] = useState<string>("all");
  const [method, setMethod] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  // Selected student profile
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Live mode: poll the backend for newly recorded payments (M-Pesa/bank/manual)
  useEffect(() => {
    if (!liveMode) return;
    const id = setInterval(async () => {
      let rawPayments: any[];
      try {
        rawPayments = await FeeApi.getPayments();
      } catch {
        return; // transient network/poll error — try again next tick
      }
      const mapped = rawPayments.map(toPayment);
      setPayments((prev) => {
        const prevIds = new Set(prev.map((p) => p.id));
        const newOnes = mapped.filter((p) => !prevIds.has(p.id));
        newOnes.forEach((p) => {
          const s = students.find((x) => x.id === p.studentId);
          const paidNow = mapped
            .filter((x) => x.studentId === p.studentId)
            .reduce((a, b) => a + b.amount, 0);
          if (s) {
            if (paidNow >= s.expected) {
              Swal.fire({
                title: "Success",
                text: `${s.name} has cleared their balance — ${s.admissionNo} • ${fmt(paidNow)} / ${fmt(s.expected)}`,
                icon: "success",
                showConfirmButton: true,
              });
            } else {
              Swal.fire({
                icon: "info",
                title: `New payment: ${fmt(p.amount)}`,
                text: `${s.name} (${s.admissionNo}) • ${p.method} • ${p.reference}`,
                showConfirmButton: true,
              });
            }
          }
        });
        return mapped;
      });
    }, 9000);
    return () => clearInterval(id);
  }, [liveMode, students]);

  // Only CONFIRMED payments count toward balances/collections — a manual cheque or bank-slip entry
  // sitting in Pending Verification hasn't cleared yet and shouldn't understate what a student still owes.
  const confirmedPayments = useMemo(
    () => payments.filter((p) => (p.verificationStatus ?? "Confirmed") === "Confirmed"),
    [payments],
  );

  // Per-student aggregates
  const studentAgg = useMemo(
    () => computeStudentAgg(students, confirmedPayments),
    [confirmedPayments, students],
  );

  // High-level metrics
  const totals = useMemo(() => {
    const expected = students.reduce((a, s) => a + s.expected, 0);
    const collected = studentAgg.reduce((a, s) => a + s.paid, 0);
    const outstanding = expected - collected;
    const fullyPaid = studentAgg.filter((s) => s.status === "Cleared").length;
    const withBalance = studentAgg.filter((s) => s.balance > 0).length;
    const today = new Date().toDateString();
    const monthKey = new Date().toISOString().slice(0, 7);
    const todayTotal = confirmedPayments.filter((p) => new Date(p.date).toDateString() === today).reduce((a, b) => a + b.amount, 0);
    const monthTotal = confirmedPayments.filter((p) => p.date.slice(0, 7) === monthKey).reduce((a, b) => a + b.amount, 0);
    return { expected, collected, outstanding, fullyPaid, withBalance, todayTotal, monthTotal };
  }, [studentAgg, confirmedPayments, students]);

  // Apply filters to payments (live table)
  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payments.filter((p) => {
      const s = students.find((x) => x.id === p.studentId);
      if (!s) return false;
      if (grade !== "all" && s.grade !== grade) return false;
      if (stream !== "all" && s.stream !== stream) return false;
      if (method !== "all" && p.method !== method) return false;
      if (from && p.date < new Date(from).toISOString()) return false;
      if (to && p.date > new Date(new Date(to).getTime() + 86400000).toISOString()) return false;
      if (q) {
        const hay = `${s.name} ${s.admissionNo} ${s.phone} ${p.reference}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [payments, search, grade, stream, method, from, to]);

  // Apply filters to students (records table)
  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return studentAgg.filter((s) => {
      if (grade !== "all" && s.grade !== grade) return false;
      if (stream !== "all" && s.stream !== stream) return false;
      if (status !== "all" && s.status !== status) return false;
      if (q) {
        const hay = `${s.name} ${s.admissionNo} ${s.phone}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [studentAgg, search, grade, stream, status]);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;
  useEffect(() => setPage(1), [search, grade, stream, status]);
  const pagedStudents = filteredStudents.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));

  // Charts data
  const trendData = useMemo(() => {
    const days = 14;
    const out: { date: string; amount: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toDateString();
      const amount = confirmedPayments.filter((p) => new Date(p.date).toDateString() === key).reduce((a, b) => a + b.amount, 0);
      out.push({ date: d.toLocaleDateString("en-KE", { month: "short", day: "2-digit" }), amount });
    }
    return out;
  }, [confirmedPayments]);

  const monthlyData = useMemo(() => {
    const map = new Map<string, number>();
    confirmedPayments.forEach((p) => {
      const k = p.date.slice(0, 7);
      map.set(k, (map.get(k) ?? 0) + p.amount);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => ({ month: k, amount: v }));
  }, [confirmedPayments]);

  const outstandingByGrade = useMemo(() => {
    const map = new Map<string, number>();
    studentAgg.forEach((s) => map.set(s.grade, (map.get(s.grade) ?? 0) + s.balance));
    return GRADES.map((g) => ({ grade: g, outstanding: map.get(g) ?? 0 })).filter((d) => d.outstanding > 0);
  }, [studentAgg]);

  const outstandingByStream = useMemo(() => {
    const map = new Map<string, number>();
    studentAgg.forEach((s) => map.set(s.stream, (map.get(s.stream) ?? 0) + s.balance));
    return STREAMS.map((s) => ({ stream: s, outstanding: map.get(s) ?? 0 }));
  }, [studentAgg]);

  const methodBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    confirmedPayments.forEach((p) => map.set(p.method, (map.get(p.method) ?? 0) + p.amount));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [confirmedPayments]);

  // Exports
  function exportStudentsPDF(title: string, rows: typeof studentAgg) {
    const doc = new jsPDF();
    doc.text(title, 14, 14);
    autoTable(doc, {
      startY: 20,
      head: [["Adm No", "Name", "Grade", "Stream", "Expected", "Paid", "Balance", "Status"]],
      body: rows.map((s) => [s.admissionNo, s.name, s.grade, s.stream, s.expected, s.paid, s.balance, s.status]),
      styles: { fontSize: 8 },
    });
    doc.save(`${title}.pdf`);
  }
  function exportStudentsExcel(title: string, rows: typeof studentAgg) {
    const ws = XLSX.utils.json_to_sheet(rows.map((s) => ({
      "Adm No": s.admissionNo, Name: s.name, Grade: s.grade, Stream: s.stream,
      Expected: s.expected, Paid: s.paid, Balance: s.balance, Status: s.status,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${title}.xlsx`);
  }
  function exportStudentsCSV(title: string, rows: typeof studentAgg) {
    const header = ["Adm No","Name","Grade","Stream","Expected","Paid","Balance","Status"];
    const lines = [header.join(",")].concat(rows.map((s) => [s.admissionNo,`"${s.name}"`,s.grade,s.stream,s.expected,s.paid,s.balance,s.status].join(",")));
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${title}.csv`;
    a.click();
  }
  function exportPaymentsPDF(title: string, rows: Payment[]) {
    const doc = new jsPDF();
    doc.text(title, 14, 14);
    autoTable(doc, {
      startY: 20,
      head: [["Date", "Adm No", "Student", "Grade/Stream", "Method", "Reference", "Amount"]],
      body: rows.map((p) => {
        const s = students.find((x) => x.id === p.studentId)!;
        return [fmtDT(p.date), s.admissionNo, s.name, `${s.grade} / ${s.stream}`, p.method, p.reference, p.amount];
      }),
      styles: { fontSize: 8 },
    });
    doc.save(`${title}.pdf`);
  }

  function printStatement(s: typeof studentAgg[number]) {
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    const history = payments.filter((p) => p.studentId === s.id).sort((a, b) => a.date.localeCompare(b.date));
    win.document.write(`
      <html><head><title>Statement ${s.admissionNo}</title>
      <style>body{font-family:system-ui;padding:24px;color:#111}h1{margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ddd;padding:8px;font-size:13px;text-align:left}th{background:#f5f5f5}.r{text-align:right}.muted{color:#666;font-size:12px}</style>
      </head><body>
      <h1>Fee Statement</h1>
      <div class="muted">Generated ${new Date().toLocaleString()}</div>
      <p><b>${s.name}</b> &middot; ${s.admissionNo} &middot; ${s.grade} ${s.stream}<br/>Parent: ${s.parent} &middot; Phone: ${s.phone}</p>
      <p>Expected: <b>${fmt(s.expected)}</b> &middot; Paid: <b>${fmt(s.paid)}</b> &middot; Balance: <b>${fmt(s.balance)}</b></p>
      <table><thead><tr><th>Date</th><th>Method</th><th>Reference</th><th class="r">Amount (KES)</th></tr></thead><tbody>
      ${history.map((p) => `<tr><td>${fmtDT(p.date)}</td><td>${p.method}</td><td>${p.reference}</td><td class="r">${p.amount.toLocaleString()}</td></tr>`).join("")}
      </tbody></table>
      </body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  function downloadStatement(s: typeof studentAgg[number]) {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text("Fee Statement", 14, 16);
    doc.setFontSize(10);
    doc.text(`${s.name}  •  ${s.admissionNo}  •  ${s.grade} ${s.stream}`, 14, 24);
    doc.text(`Parent: ${s.parent}    Phone: ${s.phone}`, 14, 30);
    doc.text(`Expected: ${fmt(s.expected)}    Paid: ${fmt(s.paid)}    Balance: ${fmt(s.balance)}`, 14, 36);
    const rows = payments.filter((p) => p.studentId === s.id).sort((a, b) => a.date.localeCompare(b.date));
    autoTable(doc, {
      startY: 42,
      head: [["Date", "Method", "Reference", "Amount (KES)"]],
      body: rows.map((p) => [fmtDT(p.date), p.method, p.reference, p.amount.toLocaleString()]),
      styles: { fontSize: 9 },
    });
    doc.save(`Statement-${s.admissionNo}.pdf`);
  }

  // Reports
  type ReportKey = "fee" | "month" | "outstanding" | "today" | "school";
  const reportCards: { key: ReportKey; label: string; description: string; icon: typeof FileText; color: string }[] = [
    { key: "fee", label: "Fee Report", description: "All students with expected vs paid", icon: FileText, color: "bg-primary/10 text-primary" },
    { key: "month", label: "This Month Collection", description: "Payments received this month", icon: CalendarDays, color: "bg-success/10 text-success" },
    { key: "outstanding", label: "Outstanding Balance", description: "Students with unpaid balances", icon: AlertTriangle, color: "bg-destructive/10 text-destructive" },
    { key: "today", label: "Today's Collection", description: "Payments received today", icon: Wallet, color: "bg-info/10 text-info" },
    { key: "school", label: "School-Wide Collection", description: "Full school payment summary", icon: School, color: "bg-warning/10 text-warning" },
  ];

  const [activeReport, setActiveReport] = useState<ReportKey | null>(null);

  const reportData = useMemo(() => {
    if (!activeReport) return [];
    const today = new Date().toDateString();
    const monthKey = new Date().toISOString().slice(0, 7);
    switch (activeReport) {
      case "fee": return studentAgg;
      case "month": return studentAgg.filter((s) => s.lastDate && s.lastDate.slice(0, 7) === monthKey);
      case "outstanding": return studentAgg.filter((s) => s.balance > 0);
      case "today": return studentAgg.filter((s) => s.lastDate && new Date(s.lastDate).toDateString() === today);
      case "school": return studentAgg;
    }
  }, [activeReport, studentAgg]);

  const activeReportLabel = reportCards.find((r) => r.key === activeReport)?.label ?? "";

  // Download dialog
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [dlFrom, setDlFrom] = useState("");
  const [dlTo, setDlTo] = useState("");
  const [dlType, setDlType] = useState<"" | "pdf" | "excel" | "csv">("");
  const [dlStudent, setDlStudent] = useState("");
  const [dlStream, setDlStream] = useState<string>("all");

  function runDownload() {
    if (!dlType) {
      Swal.fire({ icon: "error", title: "Error", text: "Please select a report format", showConfirmButton: true });
      return;
    }
    let rows = reportData;
    if (dlStream !== "all") rows = rows.filter((s) => s.stream === dlStream);
    if (dlStudent.trim()) {
      const q = dlStudent.trim().toLowerCase();
      rows = rows.filter((s) => s.name.toLowerCase().includes(q) || s.admissionNo.toLowerCase().includes(q));
    }
    if (dlFrom || dlTo) {
      const fromIso = dlFrom ? new Date(dlFrom).toISOString() : "";
      const toIso = dlTo ? new Date(new Date(dlTo).getTime() + 86400000).toISOString() : "";
      rows = rows.filter((s) => {
        if (!s.lastDate) return !fromIso && !toIso ? true : false;
        if (fromIso && s.lastDate < fromIso) return false;
        if (toIso && s.lastDate > toIso) return false;
        return true;
      });
    }
    const title = `${activeReportLabel}${dlFrom || dlTo ? ` (${dlFrom || "…"} to ${dlTo || "…"})` : ""}`;
    if (dlType === "pdf") exportStudentsPDF(title, rows);
    else if (dlType === "excel") exportStudentsExcel(title, rows);
    else exportStudentsCSV(title, rows);
    Swal.fire({ title: "Success", text: `Downloaded ${rows.length} record(s)`, icon: "success", showConfirmButton: true });
    setDownloadOpen(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">School Fees Dashboard</h1>
          <p className="text-muted-foreground">Real-time fee collection, balances and reporting</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {loading && <Badge variant="outline" className="gap-1 animate-pulse">Loading…</Badge>}
          <Badge variant={liveMode ? "default" : "outline"} className="gap-1">
            <Radio className={`w-3 h-3 ${liveMode ? "animate-pulse" : ""}`} />
            {liveMode ? "Live" : "Paused"}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => setLiveMode((v) => !v)}>
            {liveMode ? "Pause" : "Resume"} Live
          </Button>
          <Select value={role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          {canAct && (
            <Button size="sm" onClick={() => setRecordOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Record Payment
            </Button>
          )}
        </div>
      </div>

      {role === "Auditor" && (
        <Card className="border-info/40 bg-info/5">
          <CardContent className="p-3 text-sm flex items-center gap-2">
            <Eye className="w-4 h-4 text-info" /> Auditor (read-only) — payments and changes are disabled.
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Expected" value={fmt(totals.expected)} icon={DollarSign} iconColor="bg-primary/10 text-primary" />
        <StatCard title="Total Collected" value={fmt(totals.collected)} icon={CheckCircle} iconColor="bg-success/10 text-success" change={`${(totals.expected ? (totals.collected / totals.expected) * 100 : 0).toFixed(1)}% of expected`} changeType="positive" />
        <StatCard title="Outstanding" value={fmt(totals.outstanding)} icon={AlertTriangle} iconColor="bg-destructive/10 text-destructive" />
        <StatCard title="Fully Paid" value={`${totals.fullyPaid} / ${students.length}`} icon={Users} iconColor="bg-info/10 text-info" />
        <StatCard title="With Balance" value={totals.withBalance} icon={AlertTriangle} iconColor="bg-warning/10 text-warning" />
        <StatCard title="Today's Collections" value={fmt(totals.todayTotal)} icon={Calendar} iconColor="bg-success/10 text-success" />
        <StatCard title="This Month" value={fmt(totals.monthTotal)} icon={TrendingUp} iconColor="bg-primary/10 text-primary" />
        <StatCard title="Transactions" value={payments.length} icon={Activity} iconColor="bg-info/10 text-info" />
      </div>




      <Tabs defaultValue="live">
        <TabsList className="flex-wrap">
          <TabsTrigger value="live"><Radio className="w-4 h-4 mr-1" /> Live Payments</TabsTrigger>
          <TabsTrigger value="verification">
            <ShieldCheck className="w-4 h-4 mr-1" /> Pending Verification
            {pendingVerification.length > 0 && (
              <Badge variant="destructive" className="ml-1.5 text-[10px] px-1.5">{pendingVerification.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="students"><Users className="w-4 h-4 mr-1" /> Students</TabsTrigger>
          <TabsTrigger value="reports"><FileText className="w-4 h-4 mr-1" /> Reports</TabsTrigger>
          <TabsTrigger value="analytics"><TrendingUp className="w-4 h-4 mr-1" /> Analytics</TabsTrigger>
        </TabsList>

        {/* LIVE PAYMENTS */}
        <TabsContent value="live" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Incoming Payments</CardTitle>
                <CardDescription>{filteredPayments.length} transactions • newest first</CardDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" /> Export</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => exportPaymentsPDF("Payments", filteredPayments)}><FileText className="w-4 h-4 mr-2" /> PDF</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    const ws = XLSX.utils.json_to_sheet(filteredPayments.map((p) => {
                      const s = students.find((x) => x.id === p.studentId)!;
                      return { Date: fmtDT(p.date), "Adm No": s.admissionNo, Student: s.name, Grade: s.grade, Stream: s.stream, Method: p.method, Reference: p.reference, Amount: p.amount };
                    }));
                    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Payments");
                    XLSX.writeFile(wb, "Payments.xlsx");
                  }}><FileSpreadsheet className="w-4 h-4 mr-2" /> Excel</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="mb-4 flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search name, adm no, phone, ref…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <Select value={grade} onValueChange={setGrade}>
                  <SelectTrigger className="w-[140px]"><SelectValue placeholder="Grade" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    {GRADES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={stream} onValueChange={setStream}>
                  <SelectTrigger className="w-[140px]"><SelectValue placeholder="Stream" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Streams</SelectItem>
                    {STREAMS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger className="w-[150px]"><SelectValue placeholder="Method" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    {METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="date" className="w-[150px]" value={from} onChange={(e) => setFrom(e.target.value)} />
                <Input type="date" className="w-[150px]" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>

                    <TableHead>Adm No</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Stream</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.slice(0, 50).map((p, i) => {
                    const s = studentAgg.find((x) => x.id === p.studentId);
                    if (!s) return null;
                    const vStatus = p.verificationStatus ?? "Confirmed";
                    return (
                      <TableRow key={p.id} className={i === 0 && liveMode ? "bg-success/5" : vStatus === "Pending Verification" ? "bg-warning/5" : ""}>
                        <TableCell className="text-xs whitespace-nowrap">{fmtDT(p.date)}</TableCell>
                        <TableCell className="font-mono text-xs">{s.admissionNo}</TableCell>
                        <TableCell className="font-medium">
                          <button className="hover:underline text-left" onClick={() => setSelectedStudent(s)}>{s.name}</button>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{s.grade}</Badge></TableCell>
                        <TableCell className="text-xs">{s.stream}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-[10px]">{p.method}</Badge></TableCell>
                        <TableCell className="font-mono text-xs">{p.reference}</TableCell>
                        <TableCell className={`text-right font-semibold ${vStatus === "Rejected" ? "text-muted-foreground line-through" : "text-success"}`}>{p.amount.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-destructive">{s.balance.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge
                            variant={vStatus === "Confirmed" ? "default" : vStatus === "Rejected" ? "destructive" : "secondary"}
                            className="text-[10px]"
                          >
                            {vStatus}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredPayments.length === 0 && (
                    <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No payments match the current filters.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PENDING VERIFICATION — manual cheque / bank-slip / integration-fallback entries awaiting a second check */}
        <TabsContent value="verification" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pending Verification</CardTitle>
              <CardDescription>
                Manually captured cheque, bank-slip, or fallback entries that haven't been confirmed yet — these do not count toward a student's balance until verified. A matching bank-transfer webhook will auto-confirm the entry on its own if it arrives first.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Bank / Ref</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Recorded By</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingVerification.map((p) => {
                    const s = students.find((x) => x.id === p.studentId);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="text-xs whitespace-nowrap">{fmtDT(p.date)}</TableCell>
                        <TableCell className="font-medium">{s ? `${s.name} (${s.admissionNo})` : p.studentId}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-[10px]">{p.method}</Badge></TableCell>
                        <TableCell className="text-xs">
                          {p.bankName && <div>{p.bankName}</div>}
                          <div className="font-mono text-muted-foreground">{p.reference}</div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{p.amount.toLocaleString()}</TableCell>
                        <TableCell className="text-xs">{p.recordedBy ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{p.notes ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          {canAct ? (
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleVerify(p)}>
                                <ShieldCheck className="w-4 h-4 mr-1 text-success" /> Verify
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setRejectFor(p)}>
                                <XCircle className="w-4 h-4 mr-1 text-destructive" /> Reject
                              </Button>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-[10px]"><Clock className="w-3 h-3 mr-1" /> Awaiting review</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {pendingVerification.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nothing awaiting verification.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* STUDENTS */}
        <TabsContent value="students" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-lg">Student Fee Records</CardTitle>
                <CardDescription>{filteredStudents.length} students</CardDescription>
              </div>
              <div className="flex gap-2 items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" /> Export</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => exportStudentsPDF("Student Fees", filteredStudents)}><FileText className="w-4 h-4 mr-2" /> PDF</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportStudentsExcel("Student Fees", filteredStudents)}><FileSpreadsheet className="w-4 h-4 mr-2" /> Excel</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportStudentsCSV("Student Fees", filteredStudents)}><FileText className="w-4 h-4 mr-2" /> CSV</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="mb-4 flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search name, adm no, phone…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <Select value={grade} onValueChange={setGrade}>
                  <SelectTrigger className="w-[140px]"><SelectValue placeholder="Grade" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    {GRADES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={stream} onValueChange={setStream}>
                  <SelectTrigger className="w-[140px]"><SelectValue placeholder="Stream" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Streams</SelectItem>
                    {STREAMS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Cleared">Fully Paid</SelectItem>
                    <SelectItem value="Partial">Partially Paid</SelectItem>
                    <SelectItem value="Unpaid">Outstanding</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Adm No</TableHead>

                    <TableHead>Student</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Stream</TableHead>
                    <TableHead className="text-right">Expected</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedStudents.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.admissionNo}</TableCell>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{s.grade}</Badge></TableCell>
                      <TableCell className="text-xs">{s.stream}</TableCell>
                      <TableCell className="text-right">{s.expected.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-success">{s.paid.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-destructive font-semibold">{s.balance.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={s.status === "Cleared" ? "default" : s.status === "Partial" ? "secondary" : "destructive"} className="text-[10px]">
                          {s.status === "Cleared" ? "Fully Paid" : s.status === "Partial" ? "Partial" : "Unpaid"}
                        </Badge>
                      </TableCell>
                      <TableCell><Button size="sm" variant="ghost" onClick={() => setSelectedStudent(s)}><Eye className="w-4 h-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                  {filteredStudents.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No students match.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
                <div>Page {page} of {totalPages}</div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
                  <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* REPORTS */}
        <TabsContent value="reports" className="mt-4 space-y-4">
          {!activeReport ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {reportCards.map((rc) => {
                const Icon = rc.icon;
                return (
                  <button
                    key={rc.key}
                    onClick={() => setActiveReport(rc.key)}
                    className="text-left group"
                  >
                    <Card className="h-full hover:shadow-lg hover:border-primary/40 transition-all cursor-pointer">
                      <CardContent className="p-5 space-y-3">
                        <div className={`p-3 rounded-xl w-fit ${rc.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-base group-hover:text-primary transition-colors">{rc.label}</p>
                          <p className="text-xs text-muted-foreground mt-1">{rc.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </button>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setActiveReport(null)}>
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <div>
                    <CardTitle className="text-lg">{activeReportLabel}</CardTitle>
                    <CardDescription>{reportData.length} student(s) • {fmt(reportData.reduce((a, b) => a + b.balance, 0))} outstanding</CardDescription>
                  </div>
                </div>
                <Button size="sm" onClick={() => setDownloadOpen(true)}>
                  <Download className="w-4 h-4 mr-1" /> Download
                </Button>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Adm No</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Stream</TableHead>
                      <TableHead className="text-right">Expected</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-xs">{s.admissionNo}</TableCell>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{s.grade}</Badge></TableCell>
                        <TableCell className="text-xs">{s.stream}</TableCell>
                        <TableCell className="text-right">{s.expected.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-success">{s.paid.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-destructive font-semibold">{s.balance.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={s.status === "Cleared" ? "default" : s.status === "Partial" ? "secondary" : "destructive"} className="text-[10px]">
                            {s.status === "Cleared" ? "Fully Paid" : s.status === "Partial" ? "Partial" : "Unpaid"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {reportData.length === 0 && (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No records found.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ANALYTICS */}
        <TabsContent value="analytics" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Daily Collection Trend (14 days)</CardTitle></CardHeader>
              <CardContent style={{ height: 280 }}>
                <ResponsiveContainer>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RTooltip />
                    <Line type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Monthly Revenue</CardTitle></CardHeader>
              <CardContent style={{ height: 280 }}>
                <ResponsiveContainer>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RTooltip />
                    <Bar dataKey="amount" fill="hsl(var(--success))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Outstanding by Grade</CardTitle></CardHeader>
              <CardContent style={{ height: 280 }}>
                <ResponsiveContainer>
                  <BarChart data={outstandingByGrade}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="grade" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RTooltip />
                    <Bar dataKey="outstanding" fill="hsl(var(--destructive))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Outstanding by Stream</CardTitle></CardHeader>
              <CardContent style={{ height: 280 }}>
                <ResponsiveContainer>
                  <BarChart data={outstandingByStream}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="stream" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RTooltip />
                    <Bar dataKey="outstanding" fill="hsl(var(--warning))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base">Payment Method Breakdown</CardTitle></CardHeader>
              <CardContent style={{ height: 280 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={methodBreakdown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={100} label>
                      {methodBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Legend />
                    <RTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Student profile dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={(o) => !o && setSelectedStudent(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedStudent && (() => {
            const s = studentAgg.find((x) => x.id === selectedStudent.id)!;
            const history = payments.filter((p) => p.studentId === s.id).sort((a, b) => b.date.localeCompare(a.date));
            return (
              <>
                <DialogHeader>
                  <DialogTitle>{s.name}</DialogTitle>
                  <DialogDescription>{s.admissionNo} • {s.grade} {s.stream} • Parent: {s.parent} ({s.phone})</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-3 gap-3 my-3">
                  <Card><CardContent className="p-3 text-center"><div className="text-xs text-muted-foreground">Expected</div><div className="text-lg font-bold">{fmt(s.expected)}</div></CardContent></Card>
                  <Card><CardContent className="p-3 text-center"><div className="text-xs text-muted-foreground">Paid</div><div className="text-lg font-bold text-success">{fmt(s.paid)}</div></CardContent></Card>
                  <Card><CardContent className="p-3 text-center"><div className="text-xs text-muted-foreground">Balance</div><div className="text-lg font-bold text-destructive">{fmt(s.balance)}</div></CardContent></Card>
                </div>
                <div className="flex gap-2 mb-3">
                  <Button size="sm" onClick={() => downloadStatement(s)}><Download className="w-4 h-4 mr-1" />Download Statement</Button>
                  <Button size="sm" variant="outline" onClick={() => printStatement(s)}><Printer className="w-4 h-4 mr-1" />Print Statement</Button>
                </div>
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Method</TableHead><TableHead>Reference</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {history.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-xs">{fmtDT(p.date)}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-[10px]">{p.method}</Badge></TableCell>
                        <TableCell className="font-mono text-xs">{p.reference}</TableCell>
                        <TableCell className="text-right font-semibold">{p.amount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    {history.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No payments yet.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Download report dialog */}
      <Dialog open={downloadOpen} onOpenChange={setDownloadOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Download {activeReportLabel}</DialogTitle>
            <DialogDescription>Format is required. All other filters are optional.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Date From</Label>
                <Input type="date" value={dlFrom} onChange={(e) => setDlFrom(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Date To</Label>
                <Input type="date" value={dlTo} onChange={(e) => setDlTo(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Report Format <span className="text-destructive">*</span></Label>
              <Select value={dlType} onValueChange={(v) => setDlType(v as typeof dlType)}>
                <SelectTrigger><SelectValue placeholder="Select format" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Student (name or admission no.)</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search by name or admission number" className="pl-9" value={dlStudent} onChange={(e) => setDlStudent(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Stream</Label>
              <Select value={dlStream} onValueChange={setDlStream}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Streams</SelectItem>
                  {STREAMS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDownloadOpen(false)}>Cancel</Button>
            <Button onClick={runDownload} disabled={!dlType}>
              <Download className="w-4 h-4 mr-1" /> Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record manual payment — cash / cheque / bank-slip walk-ins, or an integration-down fallback */}
      <Dialog open={recordOpen} onOpenChange={(o) => { setRecordOpen(o); if (!o) resetRecordForm(); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Manual Payment</DialogTitle>
            <DialogDescription>
              For cash handed in, a cheque, or a bank deposit slip — also use this if the M-Pesa/bank integration is down and a payment needs to be logged by hand. Cash and card are confirmed immediately; cheque, bank-slip and M-Pesa entries go to Pending Verification until checked.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Student <span className="text-destructive">*</span></Label>
              {rpStudent ? (
                <div className="flex items-center justify-between rounded-md border p-2">
                  <div>
                    <div className="font-medium text-sm">{rpStudent.name}</div>
                    <div className="text-xs text-muted-foreground">{rpStudent.admissionNo} • {rpStudent.grade} {rpStudent.stream}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setRpStudent(null)}>Change</Button>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input autoFocus placeholder="Search name or admission no…" className="pl-9" value={rpQuery} onChange={(e) => setRpQuery(e.target.value)} />
                  </div>
                  {rpQuery.trim() && (() => {
                    const q = rpQuery.trim().toLowerCase();
                    const matches = students.filter((s) => `${s.name} ${s.admissionNo}`.toLowerCase().includes(q)).slice(0, 8);
                    return (
                      <div className="max-h-40 overflow-y-auto border rounded-md divide-y">
                        {matches.map((s) => (
                          <button
                            key={s.id} type="button"
                            className="w-full text-left p-2 text-sm hover:bg-muted"
                            onClick={() => { setRpStudent(s); setRpQuery(""); }}
                          >
                            <div className="font-medium">{s.name}</div>
                            <div className="text-xs text-muted-foreground">{s.admissionNo} • {s.grade} {s.stream}</div>
                          </button>
                        ))}
                        {matches.length === 0 && <div className="p-2 text-xs text-muted-foreground">No matching students.</div>}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Payment Method <span className="text-destructive">*</span></Label>
                <Select value={rpMethod} onValueChange={(v) => setRpMethod(v as PaymentMethod)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MANUAL_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>{m === "Bank" ? "Bank Transfer / Slip" : m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Amount (KES) <span className="text-destructive">*</span></Label>
                <Input type="number" min="0" value={rpAmount} onChange={(e) => setRpAmount(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  {rpMethod === "Cheque" ? "Cheque No." : rpMethod === "Bank" ? "Deposit Slip / Txn No." : "Receipt / Reference No."}
                  <span className="text-destructive"> *</span>
                </Label>
                <Input value={rpReference} onChange={(e) => setRpReference(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Date</Label>
                <Input type="datetime-local" value={rpDate} onChange={(e) => setRpDate(e.target.value)} />
              </div>
            </div>

            {(rpMethod === "Cheque" || rpMethod === "Bank") && (
              <div className="space-y-1.5">
                <Label className="text-xs">Bank Name</Label>
                <Input value={rpBankName} onChange={(e) => setRpBankName(e.target.value)} placeholder="e.g. Equity Bank" />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea rows={2} placeholder="Optional — e.g. received by, branch, teller name" value={rpNotes} onChange={(e) => setRpNotes(e.target.value)} />
            </div>

            {rpMethod !== "Cash" && rpMethod !== "Card" && (
              <div className="rounded-md bg-warning/10 text-warning text-xs p-2 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>This will be recorded as <b>Pending Verification</b> and won't count toward the student's balance until a finance officer confirms it against the bank/cheque.</span>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRecordOpen(false)}>Cancel</Button>
            <Button onClick={submitManualPayment} disabled={rpSubmitting}>
              <Plus className="w-4 h-4 mr-1" /> Record Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject a pending manual payment */}
      <Dialog open={!!rejectFor} onOpenChange={(o) => { if (!o) { setRejectFor(null); setRejectReason(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Payment</DialogTitle>
            <DialogDescription>
              {rejectFor && `${fmt(rejectFor.amount)} • ${rejectFor.method} • ${rejectFor.reference}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label className="text-xs">Reason <span className="text-destructive">*</span></Label>
            <Textarea rows={3} placeholder="e.g. cheque bounced, slip doesn't match bank statement" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setRejectFor(null); setRejectReason(""); }}>Cancel</Button>
            <Button variant="destructive" disabled={!rejectReason.trim()} onClick={confirmReject}>
              <XCircle className="w-4 h-4 mr-1" /> Reject
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SchoolFeesPage;
