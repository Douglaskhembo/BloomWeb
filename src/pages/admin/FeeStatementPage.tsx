import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Download, Printer, FileText, RotateCcw, Plus, Ban } from "lucide-react";
import Swal from "sweetalert2";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FeeApi, StudentApi, AdHocChargeApi, AcademicCalendarApi } from "@/services/api";
import { getBackendErrorMessage } from "@/utils/errorHandler";
import { toStudent, toPayment, expectedForGrade } from "@/utils/feePayment";
import type { Payment, Student } from "@/data/feesMock";
import Pagination from "@/utils/Pagination";

const fmt = (n: number) => `KES ${Math.round(n).toLocaleString()}`;
const fmtD = (iso: string) => new Date(iso).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "2-digit" });
const fmtDT = (iso: string) => new Date(iso).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" });

const TERMS = ["Term 1", "Term 2", "Term 3", "Full Year"] as const;
const CURRENT_YEAR = new Date().getFullYear();
const ACADEMIC_YEARS: number[] = Array.from({ length: 5 }, (_, idx) => CURRENT_YEAR + 1 - idx);

interface LedgerEntry {
  id: string;
  date: string;
  kind: "Debit" | "Credit";
  description: string;
  term?: string;
  academicYear?: number;
  method?: string;
  reference?: string;
  status?: string;
  debit: number;
  credit: number;
  balance: number;
}

const FeeStatementPage = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [feeItems, setFeeItems] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [charges, setCharges] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerPerPage, setLedgerPerPage] = useState(10);
  const [feeItemsPage, setFeeItemsPage] = useState(1);
  const [feeItemsPerPage, setFeeItemsPerPage] = useState(10);

  // Optional filters — narrow which rows are shown, never recompute the running balance itself.
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterTerm, setFilterTerm] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");

  // Ad-hoc (one-off, per-student) charge allocation
  const [adHocCharges, setAdHocCharges] = useState<any[]>([]);
  const [termPeriods, setTermPeriods] = useState<any[]>([]);
  const [studentUuidByAdmission, setStudentUuidByAdmission] = useState<Record<string, string>>({});
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [allocateSaving, setAllocateSaving] = useState(false);
  const [allocateForm, setAllocateForm] = useState({
    itemId: "custom", amount: "", academicYear: "", term: "", dueDate: "", note: "",
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [rawStudents, items, rawStructures, rawCharges, rawTermPeriods] = await Promise.all([
          StudentApi.getAll(),
          FeeApi.getItems(),
          FeeApi.getStructures(),
          FeeApi.getCurrentCharges(),
          AcademicCalendarApi.getTermPeriods(),
        ]);
        const mapped = rawStudents.map((s: any) => toStudent(s, rawCharges, items));
        setStudents(mapped);
        setFeeItems(items);
        setStructures(rawStructures);
        setCharges(rawCharges);
        setTermPeriods(rawTermPeriods);
        setStudentUuidByAdmission(Object.fromEntries(rawStudents.map((s: any) => [s.admissionNumber, s.uuid])));
        if (mapped.length > 0) setSelectedId(mapped[0].id);
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: `Failed to load students — ${getBackendErrorMessage(err)}`,
          showConfirmButton: true,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    setLedgerPage(1);
    setFeeItemsPage(1);
    if (!selectedId) { setPayments([]); return; }
    let cancelled = false;
    (async () => {
      setLoadingPayments(true);
      try {
        const raw = await FeeApi.getPayments(selectedId);
        if (!cancelled) setPayments(raw.map(toPayment).sort((a, b) => a.date.localeCompare(b.date)));
      } catch (err) {
        if (!cancelled) Swal.fire({
          icon: "error",
          title: "Error",
          text: `Failed to load payment history — ${getBackendErrorMessage(err)}`,
          showConfirmButton: true,
        });
      } finally {
        if (!cancelled) setLoadingPayments(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedId]);

  const loadAdHocCharges = async () => {
    if (!selectedId) { setAdHocCharges([]); return; }
    setAdHocCharges(await AdHocChargeApi.getAll(selectedId));
  };
  useEffect(() => { loadAdHocCharges(); }, [selectedId]);

  const student = useMemo(() => students.find((s) => s.id === selectedId) ?? null, [students, selectedId]);

  // Only already-started periods can receive an ad-hoc charge (mirrors the backend's own
  // periodHasStarted gate) so a doomed request never reaches the server.
  const startedTermPeriods = useMemo(
    () => termPeriods.filter((tp) => new Date(tp.startDate).getTime() <= Date.now()),
    [termPeriods],
  );

  const openAllocate = () => {
    setAllocateForm({ itemId: "custom", amount: "", academicYear: "", term: "", dueDate: "", note: "" });
    setAllocateOpen(true);
  };

  const handleAllocateItemChange = (itemId: string) => {
    const item = feeItems.find((it) => String(it.id) === itemId);
    setAllocateForm((f) => ({ ...f, itemId, amount: item ? String(item.amount) : f.amount }));
  };

  const handleAllocate = async () => {
    if (allocateSaving || !student) return;
    const item = allocateForm.itemId !== "custom" ? feeItems.find((it) => String(it.id) === allocateForm.itemId) : null;
    if (!item && !allocateForm.note.trim()) {
      Swal.fire("Validation", "Give this custom charge a name/description.", "warning");
      return;
    }
    if (!allocateForm.academicYear || !allocateForm.term) {
      Swal.fire("Validation", "Select the term to bill this into.", "warning");
      return;
    }
    if (!allocateForm.amount || Number(allocateForm.amount) <= 0) {
      Swal.fire("Validation", "Amount must be greater than zero.", "warning");
      return;
    }
    if (!studentUuidByAdmission[student.id]) {
      Swal.fire("Error", "Could not resolve this student's record — try reloading the page.", "error");
      return;
    }
    setAllocateSaving(true);
    try {
      await AdHocChargeApi.allocate({
        studentUuid: studentUuidByAdmission[student.id],
        itemId: item ? Number(item.id) : undefined,
        itemName: item ? undefined : allocateForm.note.trim(),
        amount: Number(allocateForm.amount),
        academicYear: Number(allocateForm.academicYear),
        term: allocateForm.term,
        dueDate: allocateForm.dueDate || undefined,
        note: allocateForm.note.trim() || undefined,
      });
      Swal.fire({ icon: "success", title: "Charge allocated", timer: 1500, showConfirmButton: false });
      setAllocateOpen(false);
      await Promise.all([loadAdHocCharges(), FeeApi.getCurrentCharges().then(setCharges)]);
    } catch (err) {
      Swal.fire("Error", getBackendErrorMessage(err), "error");
    } finally {
      setAllocateSaving(false);
    }
  };

  const handleVoidAdHoc = async (charge: any) => {
    const { value: reason } = await Swal.fire({
      title: "Void this charge?",
      input: "text",
      inputLabel: `${charge.itemName} — KES ${Number(charge.amount).toLocaleString()}`,
      inputPlaceholder: "Reason for voiding",
      showCancelButton: true,
      inputValidator: (v) => (!v ? "A reason is required" : undefined),
    });
    if (!reason) return;
    try {
      await AdHocChargeApi.void(charge.uuid, reason);
      Swal.fire({ icon: "success", title: "Charge voided", timer: 1500, showConfirmButton: false });
      await Promise.all([loadAdHocCharges(), FeeApi.getCurrentCharges().then(setCharges)]);
    } catch (err) {
      Swal.fire("Error", getBackendErrorMessage(err), "error");
    }
  };

  // What THIS student is actually billed for the CURRENT term — sourced from their own persisted
  // StudentFeeCharge rows, not the raw grade-wide catalog. Those rows only ever exist for a period
  // that's actually started (never a future term) and only for items the student is eligible for
  // (boarding/transport charges only generate for actual subscribers — see FeeService.isEligible)
  // so this list is automatically correct on both counts: current term only, and only what they're
  // really subscribed to. A student who later joins a transport route picks up that line the next
  // time this page loads — no manual step, the backend regenerates charges lazily on every fetch.
  const currentPeriodCharges = useMemo(() => {
    if (!student) return [] as any[];
    const own = charges.filter((c) => c.admissionNumber === student.id);
    if (own.length === 0) return [];
    const rank = (t: string) => ({ "Term 1": 1, "Term 2": 2, "Term 3": 3, "Full Year": 1 } as Record<string, number>)[t] ?? 3;
    const latest = own.reduce((best: any, c: any) => {
      if (!best) return c;
      if (c.academicYear !== best.academicYear) return c.academicYear > best.academicYear ? c : best;
      return rank(c.period) > rank(best.period) ? c : best;
    }, null as any);
    return own.filter((c: any) => c.academicYear === latest.academicYear && c.period === latest.period);
  }, [charges, student]);

  // Fallback only for a grade that has never been through the Maker/Approver workflow at all (no
  // persisted charges exist for anyone) — same fallback FeeStatementPage's debit lines already use.
  const gradeItems = useMemo(
    () => feeItems.filter((it) => it.active && (!it.gradeLevels?.length || it.gradeLevels.some((g: any) => g.name === student?.grade))),
    [feeItems, student],
  );

  const studentOptions = useMemo(
    () => students.map((s) => ({
      value: s.id,
      label: `${s.name} — ${s.admissionNo}`,
      keywords: `${s.name} ${s.admissionNo} ${s.birthCertificateNumber ?? ""}`,
    })),
    [students],
  );

  // Debit lines come strictly from this student's own persisted StudentFeeCharge rows
  // (FeeApi.getCurrentCharges) — the backend only ever generates those for a period whose
  // TermPeriod has actually started AND for students who were already enrolled by that period's
  // end (see fee-billing-term-gating memory). So a period this student has zero charge rows for
  // means exactly "hasn't started yet" or "was before they joined" — it must never appear on the
  // statement, not be backfilled from the structure's raw catalog lines. If the grade has never
  // been through the Maker/Approver fee-structure workflow at all, fall back to a single
  // standing-charge line from currently active fee items so the statement isn't just empty.
  const debitLines = useMemo(() => {
    if (!student) return [] as LedgerEntry[];
    const approved = structures.filter((s) => s.status === "APPROVED" && s.grade === student.grade);
    if (approved.length === 0) {
      const standing = expectedForGrade(student.grade, feeItems);
      if (standing <= 0) return [];
      const openingDate = payments[0]?.date ?? new Date().toISOString();
      return [{
        id: "standing-charge",
        date: openingDate,
        kind: "Debit" as const,
        description: "Standing Fee Charges (no approved fee structure on file for this grade)",
        debit: standing,
        credit: 0,
        balance: 0,
      }];
    }

    const structureByUuid = new Map(structures.map((s) => [s.uuid, s]));
    const byStructure = new Map<string, any[]>();
    for (const c of charges) {
      if (c.admissionNumber !== student.id) continue;
      const list = byStructure.get(c.feeStructureUuid);
      if (list) list.push(c); else byStructure.set(c.feeStructureUuid, [c]);
    }

    return Array.from(byStructure.entries()).map(([uuid, cs]) => {
      const s = structureByUuid.get(uuid);
      const amount = cs.reduce((a: number, c: any) => a + (Number(c.amount) || 0), 0);
      const term = s?.term ?? cs[0].period;
      const academicYear = s?.academicYear ?? cs[0].academicYear;
      // No matching structure means this bucket is an ad-hoc (one-off, per-student) charge —
      // structures aren't deletable, so `s` is only ever undefined for those. Label it by its
      // actual item name rather than the generic "Term Fees" line.
      const description = s ? `${term} Fees — ${academicYear}` : cs[0].itemName;
      return {
        id: uuid,
        date: s?.reviewedAt ?? s?.updatedAt ?? cs[0].generatedAt,
        kind: "Debit" as const,
        description,
        term: term as string,
        academicYear: academicYear as number,
        debit: amount,
        credit: 0,
        balance: 0,
      };
    });
  }, [student, structures, feeItems, payments, charges]);

  const creditLines = useMemo<LedgerEntry[]>(() => payments.map((p) => ({
    id: p.id,
    date: p.date,
    kind: "Credit",
    description: `Payment via ${p.method}${p.reference ? ` — ${p.reference}` : ""}`,
    method: p.method,
    reference: p.reference,
    status: p.verificationStatus ?? "Confirmed",
    debit: 0,
    credit: p.amount,
    balance: 0,
  })), [payments]);

  // Full ledger, chronological, with a running balance computed over the COMPLETE history —
  // filters below only control which rows are displayed, they never change this calculation.
  const fullLedger = useMemo(() => {
    const combined = [...debitLines, ...creditLines].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let running = 0;
    return combined.map((entry) => {
      running += entry.debit;
      if (entry.kind === "Credit" && (entry.status ?? "Confirmed") === "Confirmed") running -= entry.credit;
      return { ...entry, balance: running };
    });
  }, [debitLines, creditLines]);

  const totalInvoiced = useMemo(() => debitLines.reduce((a, l) => a + l.debit, 0), [debitLines]);
  const totalPaid = useMemo(() => creditLines.filter((l) => (l.status ?? "Confirmed") === "Confirmed").reduce((a, l) => a + l.credit, 0), [creditLines]);
  const currentBalance = Math.max(0, fullLedger.length ? fullLedger[fullLedger.length - 1].balance : 0);

  const filteredLedger = useMemo(() => {
    return fullLedger.filter((entry) => {
      if (filterFrom && new Date(entry.date).getTime() < new Date(filterFrom).getTime()) return false;
      if (filterTo && new Date(entry.date).getTime() > new Date(filterTo).getTime() + 86_399_000) return false;
      if (filterTerm !== "all" && entry.kind === "Debit" && entry.term !== filterTerm) return false;
      if (filterYear !== "all" && entry.kind === "Debit" && entry.academicYear !== Number(filterYear)) return false;
      return true;
    });
  }, [fullLedger, filterFrom, filterTo, filterTerm, filterYear]);

  const hasActiveFilters = Boolean(filterFrom || filterTo || filterTerm !== "all" || filterYear !== "all");
  const resetFilters = () => { setFilterFrom(""); setFilterTo(""); setFilterTerm("all"); setFilterYear("all"); setLedgerPage(1); };

  const totalLedgerPages = Math.ceil(filteredLedger.length / ledgerPerPage);
  const pagedLedger = filteredLedger.slice((ledgerPage - 1) * ledgerPerPage, ledgerPage * ledgerPerPage);

  // Prefer this student's actual current-term charges (already term-correct and eligibility-
  // correct); only fall back to the raw grade catalog when the grade has no persisted charges at
  // all yet (never been through the Maker/Approver workflow — see gradeItems above).
  const usingCurrentCharges = currentPeriodCharges.length > 0;
  const displayFeeItems = usingCurrentCharges
    ? currentPeriodCharges.map((c: any) => ({ id: `${c.feeStructureUuid}-${c.itemId}`, name: c.itemName, term: c.period, amount: c.amount }))
    : gradeItems.map((it: any) => ({ id: it.id, name: it.name, term: it.term, amount: it.amount }));
  const totalFeeItemPages = Math.ceil(displayFeeItems.length / feeItemsPerPage);
  const pagedFeeItems = displayFeeItems.slice((feeItemsPage - 1) * feeItemsPerPage, feeItemsPage * feeItemsPerPage);

  function buildStatementDoc() {
    if (!student) return null;
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text("Fee Statement", 14, 16);
    doc.setFontSize(10);
    doc.text(`${student.name}  •  ${student.admissionNo}  •  ${student.grade} ${student.stream}`, 14, 24);
    doc.text(`Parent: ${student.parent}    Phone: ${student.phone}`, 14, 30);
    doc.text(`Invoiced: ${fmt(totalInvoiced)}    Paid: ${fmt(totalPaid)}    Balance: ${fmt(currentBalance)}`, 14, 36);
    autoTable(doc, {
      startY: 42,
      head: [["Date", "Description", "Status", "Debit (KES)", "Credit (KES)", "Balance (KES)"]],
      body: filteredLedger.map((e) => [
        fmtDT(e.date),
        e.description,
        e.kind === "Credit" ? (e.status ?? "Confirmed") : "Billed",
        e.debit ? e.debit.toLocaleString() : "",
        e.credit ? e.credit.toLocaleString() : "",
        e.balance.toLocaleString(),
      ]),
      styles: { fontSize: 8 },
    });
    return doc;
  }

  function downloadPDF() {
    const doc = buildStatementDoc();
    if (!doc || !student) return;
    doc.save(`Statement-${student.admissionNo}.pdf`);
  }

  function printStatement() {
    if (!student) return;
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(`
      <html><head><title>Statement ${student.admissionNo}</title>
      <style>body{font-family:system-ui;padding:24px;color:#111}h1{margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ddd;padding:8px;font-size:13px;text-align:left}th{background:#f5f5f5}.r{text-align:right}.muted{color:#666;font-size:12px}</style>
      </head><body>
      <h1>Fee Statement</h1>
      <div class="muted">Generated ${new Date().toLocaleString()}</div>
      <p><b>${student.name}</b> &middot; ${student.admissionNo} &middot; ${student.grade} ${student.stream}<br/>Parent: ${student.parent} &middot; Phone: ${student.phone}</p>
      <p>Invoiced: <b>${fmt(totalInvoiced)}</b> &middot; Paid: <b>${fmt(totalPaid)}</b> &middot; Balance: <b>${fmt(currentBalance)}</b></p>
      <table><thead><tr><th>Date</th><th>Description</th><th>Status</th><th class="r">Debit (KES)</th><th class="r">Credit (KES)</th><th class="r">Balance (KES)</th></tr></thead><tbody>
      ${filteredLedger.map((e) => `<tr><td>${fmtDT(e.date)}</td><td>${e.description}</td><td>${e.kind === "Credit" ? (e.status ?? "Confirmed") : "Billed"}</td><td class="r">${e.debit ? e.debit.toLocaleString() : ""}</td><td class="r">${e.credit ? e.credit.toLocaleString() : ""}</td><td class="r">${e.balance.toLocaleString()}</td></tr>`).join("")}
      </tbody></table>
      </body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fee Statement</h1>
          <p className="text-muted-foreground">Individual student fee statement and payment history</p>
        </div>
        <div className="flex gap-2">
          <Combobox
            options={studentOptions}
            value={selectedId}
            onChange={setSelectedId}
            placeholder="Select a student"
            searchPlaceholder="Search name, admission no, birth cert no..."
            emptyText="No students found."
            disabled={loading || students.length === 0}
            className="w-[280px]"
          />
          <Button variant="outline" size="sm" onClick={openAllocate} disabled={!student}><Plus className="w-4 h-4 mr-1" /> Allocate Charge</Button>
          <Button variant="outline" size="sm" onClick={printStatement} disabled={!student}><Printer className="w-4 h-4 mr-1" /> Print</Button>
          <Button variant="outline" size="sm" onClick={downloadPDF} disabled={!student}><Download className="w-4 h-4 mr-1" /> PDF</Button>
        </div>
      </div>

      {loading ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Loading students…</CardContent></Card>
      ) : !student ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">No students found.</CardContent></Card>
      ) : (
        <>
          {/* Student Info Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Student Name</p>
                  <p className="font-semibold">{student.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Admission No.</p>
                  <p className="font-mono font-semibold">{student.admissionNo}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Grade</p>
                  <p className="font-semibold">{student.grade} {student.stream}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Join Date</p>
                  <p className="font-semibold">{student.joinDate ? fmtD(student.joinDate) : "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Parent/Guardian</p>
                  <p className="font-semibold">{student.parent || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Phone</p>
                  <p className="font-semibold">{student.phone || "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-xs text-muted-foreground mb-1">Total Invoiced</p>
                <p className="text-2xl font-bold">{fmt(totalInvoiced)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-xs text-muted-foreground mb-1">Total Paid</p>
                <p className="text-2xl font-bold text-success">{fmt(totalPaid)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-xs text-muted-foreground mb-1">Outstanding Balance</p>
                <p className="text-2xl font-bold text-destructive">{fmt(currentBalance)}</p>
              </CardContent>
            </Card>
          </div>

          {/* What this student is actually billed for, right now */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {usingCurrentCharges
                  ? `Current Charges — ${currentPeriodCharges[0].period} ${currentPeriodCharges[0].academicYear}`
                  : `Fee Structure — ${student.grade}`}
              </CardTitle>
              <CardDescription>
                {usingCurrentCharges
                  ? `${student.name}'s own billed items for the current term — only what they're actually subscribed to (e.g. transport/boarding only if applicable)`
                  : "No approved fee structure on file yet for this grade — showing the active catalog instead"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Item</TableHead><TableHead>Term</TableHead><TableHead className="text-right">Amount (KES)</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {pagedFeeItems.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="font-medium">{it.name}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{it.term}</TableCell>
                      <TableCell className="text-right">{Number(it.amount).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {displayFeeItems.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No fee items configured for this grade.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              <Pagination currentPage={feeItemsPage} totalPages={totalFeeItemPages} onPageChange={setFeeItemsPage}
                itemsPerPage={feeItemsPerPage} onItemsPerPageChange={v => { setFeeItemsPerPage(v); setFeeItemsPage(1); }} />
            </CardContent>
          </Card>

          {/* Ad-hoc (one-off, per-student) charges — trips, and anything else outside the standard structure */}
          {adHocCharges.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ad-hoc Charges</CardTitle>
                <CardDescription>One-off charges allocated directly to {student.name}, outside the standard fee structure</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Term</TableHead>
                      <TableHead className="text-right">Amount (KES)</TableHead>
                      <TableHead>Allocated By</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adHocCharges.map((c) => (
                      <TableRow key={c.uuid}>
                        <TableCell className="font-medium">{c.itemName}{c.note ? <span className="block text-xs text-muted-foreground">{c.note}</span> : null}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{c.term} {c.academicYear}</TableCell>
                        <TableCell className="text-right">{Number(c.amount).toLocaleString()}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{c.allocatedByName}</TableCell>
                        <TableCell>
                          {c.voided
                            ? <Badge variant="destructive" className="text-[10px]">Voided</Badge>
                            : <Badge variant="default" className="text-[10px]">Active</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          {!c.voided && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Void charge" onClick={() => handleVoidAdHoc(c)}>
                              <Ban className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Statement Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><FileText className="w-5 h-5" /> Statement of Account</CardTitle>
              <CardDescription>Every charge and payment for this student, in date order, with running balance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-wrap items-end gap-2">
                <div className="flex flex-col">
                  <Label className="text-xs text-muted-foreground mb-1">From</Label>
                  <Input type="date" className="w-[160px]" value={filterFrom} onChange={(e) => { setFilterFrom(e.target.value); setLedgerPage(1); }} />
                </div>
                <div className="flex flex-col">
                  <Label className="text-xs text-muted-foreground mb-1">To</Label>
                  <Input type="date" className="w-[160px]" value={filterTo} onChange={(e) => { setFilterTo(e.target.value); setLedgerPage(1); }} />
                </div>
                <div className="flex flex-col">
                  <Label className="text-xs text-muted-foreground mb-1">Term</Label>
                  <Select value={filterTerm} onValueChange={(v) => { setFilterTerm(v); setLedgerPage(1); }}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Terms</SelectItem>
                      {TERMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col">
                  <Label className="text-xs text-muted-foreground mb-1">Year</Label>
                  <Select value={filterYear} onValueChange={(v) => { setFilterYear(v); setLedgerPage(1); }}>
                    <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {ACADEMIC_YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={resetFilters}><RotateCcw className="h-4 w-4" /> Reset</Button>
                )}
              </div>
              <p className="mb-3 text-xs text-muted-foreground">Term/Year narrow which charges are shown; payments are always listed by their actual date. The balance column always reflects the full history, even when filtered.</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Debit (KES)</TableHead>
                    <TableHead className="text-right">Credit (KES)</TableHead>
                    <TableHead className="text-right">Balance (KES)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingPayments ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
                  ) : filteredLedger.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No charges or payments in range.</TableCell></TableRow>
                  ) : pagedLedger.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-sm whitespace-nowrap">{fmtD(e.date)}</TableCell>
                      <TableCell className="text-sm">{e.description}</TableCell>
                      <TableCell>
                        {e.kind === "Credit" ? (
                          <Badge
                            variant={e.status === "Confirmed" ? "default" : e.status === "Rejected" ? "destructive" : "secondary"}
                            className="text-[10px]"
                          >
                            {e.status}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Billed</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold">{e.debit ? e.debit.toLocaleString() : ""}</TableCell>
                      <TableCell className={`text-right font-semibold ${e.kind === "Credit" && e.status === "Rejected" ? "text-muted-foreground line-through" : "text-success"}`}>
                        {e.credit ? e.credit.toLocaleString() : ""}
                      </TableCell>
                      <TableCell className="text-right font-semibold">{e.balance.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination currentPage={ledgerPage} totalPages={totalLedgerPages} onPageChange={setLedgerPage}
                itemsPerPage={ledgerPerPage} onItemsPerPageChange={v => { setLedgerPerPage(v); setLedgerPage(1); }} />
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={allocateOpen} onOpenChange={setAllocateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Allocate Charge</DialogTitle>
            <DialogDescription>Bill {student?.name} a one-off amount — e.g. a trip — outside the standard fee structure.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Item</Label>
              <Select value={allocateForm.itemId} onValueChange={handleAllocateItemChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom / Other</SelectItem>
                  {feeItems.filter((it) => it.active).map((it) => (
                    <SelectItem key={it.id} value={String(it.id)}>{it.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount (KES) <span className="text-destructive">*</span></Label>
                <Input type="number" value={allocateForm.amount} onChange={(e) => setAllocateForm((f) => ({ ...f, amount: e.target.value }))} placeholder="e.g. 3000" />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input type="date" value={allocateForm.dueDate} onChange={(e) => setAllocateForm((f) => ({ ...f, dueDate: e.target.value }))} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Term <span className="text-destructive">*</span></Label>
                <Select
                  value={allocateForm.academicYear && allocateForm.term ? `${allocateForm.academicYear}::${allocateForm.term}` : ""}
                  onValueChange={(v) => { const [academicYear, term] = v.split("::"); setAllocateForm((f) => ({ ...f, academicYear, term })); }}
                >
                  <SelectTrigger><SelectValue placeholder="Select the term to bill this into" /></SelectTrigger>
                  <SelectContent>
                    {startedTermPeriods.map((tp) => (
                      <SelectItem key={`${tp.academicYear}-${tp.term}`} value={`${tp.academicYear}::${tp.term}`}>{tp.term} {tp.academicYear}</SelectItem>
                    ))}
                    {startedTermPeriods.length === 0 && (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">No started term periods configured — set one up under Academic Calendar first.</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{allocateForm.itemId === "custom" ? "Description" : "Note"} {allocateForm.itemId === "custom" && <span className="text-destructive">*</span>}</Label>
              <Textarea
                value={allocateForm.note}
                onChange={(e) => setAllocateForm((f) => ({ ...f, note: e.target.value }))}
                placeholder={allocateForm.itemId === "custom" ? "e.g. Grade 5 Nairobi National Park trip" : "Optional note"}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAllocateOpen(false)} disabled={allocateSaving}>Cancel</Button>
            <Button onClick={handleAllocate} disabled={allocateSaving}>{allocateSaving ? "Allocating…" : "Allocate Charge"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeeStatementPage;
