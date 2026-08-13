import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Download, Printer, FileText, RotateCcw } from "lucide-react";
import Swal from "sweetalert2";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FeeApi, StudentApi } from "@/services/api";
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

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [rawStudents, items, rawStructures, rawCharges] = await Promise.all([
          StudentApi.getAll(),
          FeeApi.getItems(),
          FeeApi.getStructures(),
          FeeApi.getCurrentCharges(),
        ]);
        const mapped = rawStudents.map((s: any) => toStudent(s, rawCharges, items));
        setStudents(mapped);
        setFeeItems(items);
        setStructures(rawStructures);
        setCharges(rawCharges);
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

  const student = useMemo(() => students.find((s) => s.id === selectedId) ?? null, [students, selectedId]);
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

  // Debit lines come from the school's actual approved fee-structure history for this grade — one
  // charge per (academicYear, term), using the most recently approved version for that period (a
  // fee structure can be revised over time; only the latest approved revision is what was really
  // billed). If the grade has never been through the Maker/Approver fee-structure workflow at all,
  // fall back to a single standing-charge line from currently active fee items so the statement
  // isn't just empty.
  const debitLines = useMemo(() => {
    if (!student) return [] as LedgerEntry[];
    const approved = structures.filter((s) => s.status === "APPROVED" && s.grade === student.grade);
    const latestByPeriod = new Map<string, any>();
    for (const s of approved) {
      const key = `${s.academicYear}::${s.term}`;
      const existing = latestByPeriod.get(key);
      if (!existing || new Date(s.reviewedAt ?? s.updatedAt).getTime() > new Date(existing.reviewedAt ?? existing.updatedAt).getTime()) {
        latestByPeriod.set(key, s);
      }
    }
    if (latestByPeriod.size === 0) {
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
    return Array.from(latestByPeriod.values()).map((s) => {
      // Prefer the persisted, eligibility-correct StudentFeeCharge rows generated for this exact
      // structure version; only fall back to summing the structure's own lines (today's blanket
      // "every student in the grade owes every enabled line" assumption) if none were found —
      // belt-and-braces for a structure the backend hasn't backfilled charges for yet.
      const studentCharges = charges.filter((c) => c.admissionNumber === student.id && c.feeStructureUuid === s.uuid);
      const amount = studentCharges.length > 0
        ? studentCharges.reduce((a: number, c: any) => a + (Number(c.amount) || 0), 0)
        : (s.lines ?? []).reduce((a: number, l: any) => a + (l.enabled ? Number(l.amount) || 0 : 0), 0);
      return {
        id: s.uuid,
        date: s.reviewedAt ?? s.updatedAt,
        kind: "Debit" as const,
        description: `${s.term} Fees — ${s.academicYear}`,
        term: s.term as string,
        academicYear: s.academicYear as number,
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

  const totalFeeItemPages = Math.ceil(gradeItems.length / feeItemsPerPage);
  const pagedFeeItems = gradeItems.slice((feeItemsPage - 1) * feeItemsPerPage, feeItemsPage * feeItemsPerPage);

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
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
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

          {/* Fee items making up current standing charges */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fee Structure — {student.grade}</CardTitle>
              <CardDescription>Currently active standing charges for this grade</CardDescription>
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
                  {gradeItems.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No fee items configured for this grade.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              <Pagination currentPage={feeItemsPage} totalPages={totalFeeItemPages} onPageChange={setFeeItemsPage}
                itemsPerPage={feeItemsPerPage} onItemsPerPageChange={v => { setFeeItemsPerPage(v); setFeeItemsPage(1); }} />
            </CardContent>
          </Card>

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
    </div>
  );
};

export default FeeStatementPage;
