import { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DollarSign, Download, Send, TrendingUp, Search, ArrowLeft, Calculator,
  FileText, FileSpreadsheet, FileType, CheckCircle2, XCircle, Banknote, RotateCcw, Smartphone,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import StatCard from "@/components/dashboard/StatCard";
import PayrollWorkflowStatus from "@/components/payroll/PayrollWorkflowStatus";
import { useToast } from "@/hooks/use-toast";
import { StaffApi, SchoolApi } from "@/services/api";
import { getBackendErrorMessage } from "@/utils/errorHandler";
import { getStaffIdentifier } from "@/utils/staff";
import { useAuth } from "@/context/AuthContext";
import { usePayroll, StaffSalary } from "@/context/PayrollContext";
import { PayrollApi } from "@/services/api";
import { formatKES } from "@/lib/payroll/kenya";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { STATUS_LABEL, STATUS_BADGE_VARIANT } from "@/pages/admin/PayrollPage";

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" }) : "";

const PayrollRunDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const {
    getSalary, payrollHistory, workflowSteps, makers, refreshRuns,
    generateRun, submitRun, approveRun, rejectRun, markSentToBank,
  } = usePayroll();
  const [search, setSearch] = useState("");
  const [initialStaff, setInitialStaff] = useState<any[]>([]);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [viewingStaffUuid, setViewingStaffUuid] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [approvals, setApprovals] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<Record<string, any>>({});
  const [payrollAccount, setPayrollAccount] = useState<{ accountNumber: string; bankUuid: string | null } | null>(null);

  const permissions = user?.permissions ?? [];
  const canSendToBank = permissions.includes("PAYROLL_SEND_TO_BANK");
  const isMakerUser = makers.some((m) => m.user.uuid === user?.userUuid);

  useEffect(() => {
    StaffApi.getAll().then((data) => {
      const list = Array.isArray(data) ? data : [];
      setInitialStaff(list.map((s: any) => ({
        uuid: s.uuid,
        firstName: s.firstName,
        lastName: s.lastName,
        staffType: s.staffType,
        status: s.status,
        idNumber: s.idNumber,
        passportNumber: s.passportNumber,
        staffId: s.staffId,
      })));
    }).catch(() => setInitialStaff([]));

    PayrollApi.getAllStaffPaymentDetails().then((rows) => {
      const byStaffId: Record<string, any> = {};
      (Array.isArray(rows) ? rows : []).forEach((d: any) => { byStaffId[d.staffId] = d; });
      setPaymentDetails(byStaffId);
    }).catch(() => setPaymentDetails({}));

    SchoolApi.getBankAccounts().then((rows) => {
      const acc = (Array.isArray(rows) ? rows : []).find((a: any) => a.useForPayroll);
      setPayrollAccount(acc ? { accountNumber: acc.accountNumber, bankUuid: acc.bank?.uuid ?? null } : null);
    }).catch(() => setPayrollAccount(null));
  }, []);

  // Refetch the run list every time this screen is opened — including navigating from one run's
  // detail page straight to another's, which doesn't remount the component (only `id` changes).
  useEffect(() => { refreshRuns().catch(() => {}); }, [id, refreshRuns]);

  const selectedRun = payrollHistory.find((r) => r.id === Number(id));

  useEffect(() => {
    if (!selectedRun) { setApprovals([]); return; }
    PayrollApi.getRunApprovals(selectedRun.id).then(setApprovals).catch(() => setApprovals([]));
  }, [selectedRun?.id, selectedRun?.status]);

  const runTotalNet = selectedRun ? Object.values(selectedRun.lines).reduce((sum, l) => sum + l.net, 0) : 0;
  const activeSteps = useMemo(
    () => workflowSteps
      .filter((s) => s.active && (!s.thresholdAmount || runTotalNet >= s.thresholdAmount))
      .sort((a, b) => a.sequenceOrder - b.sequenceOrder),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workflowSteps, runTotalNet],
  );
  const currentStepIndex = selectedRun?.currentStepOrder != null
    ? activeSteps.findIndex((s) => s.sequenceOrder === selectedRun.currentStepOrder)
    : -1;
  const currentStep = currentStepIndex >= 0 ? activeSteps[currentStepIndex] : undefined;

  const displayRows = useMemo(() => {
    if (!selectedRun) return [];
    // Show exactly what was frozen into this run's lines at generation/submit time — never a live
    // recompute, so a staff member's *current* salary/status never retroactively changes a past run.
    return initialStaff
      .filter((s) => s.status !== "Resigned" && selectedRun.lines[s.uuid])
      .map((s) => {
        const rawLine = selectedRun.rawLines.find((l) => l.staffId === s.uuid);
        return {
          staff: s,
          sal: getSalary(s.uuid),
          line: selectedRun.lines[s.uuid],
          isPaid: rawLine?.status === "PAID",
          payoutDestination: rawLine?.payoutDestination,
          prorationNote: rawLine?.prorationNote,
          configured: true,
        };
      });
  }, [selectedRun, getSalary, initialStaff]);

  const displayTotals = displayRows.reduce(
    (acc, r) => {
      acc.gross += r.line.gross;
      acc.net += r.line.net;
      acc.deductions += r.line.totalDeductions;
      return acc;
    },
    { gross: 0, net: 0, deductions: 0 },
  );
  const displayPaidCount = displayRows.filter((r) => r.isPaid).length;
  const displayConfiguredCount = displayRows.filter((r) => r.configured).length;

  const q = search.trim().toLowerCase();
  const filteredRows = q
    ? displayRows.filter(({ staff }) => {
        const hay = `${getStaffIdentifier(staff)} ${staff.firstName} ${staff.lastName} ${(staff as any).email ?? ""} ${(staff as any).role ?? ""} ${(staff as any).department ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
    : displayRows;

  const monthLabel = selectedRun?.monthLabel ?? "";

  const handleSubmit = async () => {
    if (!selectedRun) return;
    setBusy(true);
    try {
      await submitRun(selectedRun.id);
      toast({ title: "Submitted for authorization", description: `${selectedRun.monthLabel} payroll is now awaiting authorization.` });
    } catch (err) {
      toast({ title: "Could not submit", description: getBackendErrorMessage(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRun) return;
    setBusy(true);
    try {
      await approveRun(selectedRun.id);
      toast({ title: "Step approved", description: `Your authorization on "${currentStep?.label}" has been recorded.` });
    } catch (err) {
      toast({ title: "Could not approve", description: getBackendErrorMessage(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const confirmReject = async () => {
    if (!selectedRun || !rejectReason.trim()) return;
    setBusy(true);
    try {
      await rejectRun(selectedRun.id, rejectReason.trim());
      setRejectDialogOpen(false);
      setRejectReason("");
      toast({ title: "Payroll rejected", description: "The maker can revise and resubmit." });
    } catch (err) {
      toast({ title: "Could not reject", description: getBackendErrorMessage(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleRegenerate = async () => {
    if (!selectedRun) return;
    setBusy(true);
    try {
      const run = await generateRun(selectedRun.year, selectedRun.monthIndex, selectedRun.monthLabel);
      toast({ title: "Payroll regenerated", description: "A fresh draft has been created — review and submit it when ready." });
      navigate(`/admin/payroll/runs/${run.id}`);
    } catch (err) {
      toast({ title: "Could not regenerate payroll", description: getBackendErrorMessage(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleMarkSentToBank = async () => {
    if (!selectedRun) return;
    setBusy(true);
    try {
      await markSentToBank(selectedRun.id);
      toast({ title: "Marked as sent to bank", description: "Staff in this run are now recorded as paid." });
    } catch (err) {
      toast({ title: "Could not update", description: getBackendErrorMessage(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const canDownloadDraft = !!selectedRun;
  const isBankReady = selectedRun?.status === "APPROVED" || selectedRun?.status === "SENT_TO_BANK";

  const viewingRow = viewingStaffUuid ? displayRows.find((r) => r.staff.uuid === viewingStaffUuid) : undefined;
  const viewingPaymentDetails = viewingStaffUuid ? paymentDetails[viewingStaffUuid] : undefined;

  const buildExportRows = () =>
    filteredRows
      .filter((r) => r.configured)
      .map(({ staff, line, isPaid }) => ({
        ID: getStaffIdentifier(staff),
        Name: `${staff.firstName} ${staff.lastName}`,
        Basic: line.basic,
        Allowances: line.taxableAllowances + line.nonTaxableAllowances,
        Gross: line.gross,
        PAYE: line.paye,
        NSSF: line.nssf,
        SHIF: line.nhif,
        Housing: line.housingLevy,
        Other: line.otherDeductions,
        "Net Pay": line.net,
        Status: isPaid ? "Paid" : "Pending",
      }));

  /** Same bank as the payroll debit account = an intra-bank transfer, always "WITHIN BANK" regardless
   *  of whatever settlement rail is on file — there's no inter-bank rail to name in that case. A
   *  different bank with no rail explicitly configured falls back to PESALINK (Kenya's standard
   *  low-value interbank rail, no special agreement needed unlike RTGS) rather than being left blank —
   *  admins only need to override to RTGS/EFT for exceptional cases. This is the single source of truth
   *  for the export; a future live bank-API integration should reuse it. */
  const resolvePaymentTypeCode = (d: any): string => {
    if (d?.paymentMethod === "BANK_TRANSFER") {
      if (payrollAccount?.bankUuid && d?.bank?.uuid === payrollAccount.bankUuid) return "WITHIN BANK";
      return d?.paymentType?.code || "PESALINK";
    }
    if (d?.paymentMethod === "MOBILE_MONEY") return d?.paymentType?.code ?? "";
    return "";
  };

  const buildBankExportRows = () =>
    filteredRows
      .filter((r) => r.configured)
      .map(({ staff, line }) => {
        const d = paymentDetails[staff.uuid];
        const isBank = d?.paymentMethod === "BANK_TRANSFER";
        const isMobile = d?.paymentMethod === "MOBILE_MONEY";
        return {
          "Debit Account": payrollAccount?.accountNumber ?? "",
          "Beneficiary Account": isBank ? (d?.bankAccountNumber ?? "") : isMobile ? (d?.mobileNumber ?? "") : "",
          "Beneficiary Name": `${staff.firstName} ${staff.lastName}`,
          "Bank Code/ SWIFT Code": isBank ? (d?.bank?.bankCode || d?.bank?.swiftCode || "") : isMobile ? (d?.mobileMoneyProvider?.shortCode ?? "") : "",
          "Payment Type": resolvePaymentTypeCode(d),
          Currency: "KES",
          Amount: line.net,
        };
      });

  const fileTag = () => (isBankReady ? monthLabel.replace(/\s+/g, "-") : `DRAFT-${monthLabel.replace(/\s+/g, "-")}`);

  const exportCSV = (bank = false) => {
    const data = bank ? buildBankExportRows() : buildExportRows();
    if (!data.length) return toast({ title: "Nothing to export" });
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(","),
      ...data.map((row: any) => headers.map((h) => JSON.stringify(row[h] ?? "")).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Payroll${bank ? "-Bank" : ""}-${fileTag()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exported" });
  };

  /** Force specific columns to Excel's native Text cell format ("@") so account/code numbers that
   *  start with 0 survive being opened in Excel — without the "'" prefix hack, which some bank
   *  portals ingest literally as part of the value instead of Excel's typed-as-text marker. */
  const forceTextColumns = (ws: XLSX.WorkSheet, headers: string[], columnNames: string[]) => {
    if (!ws["!ref"]) return;
    const range = XLSX.utils.decode_range(ws["!ref"]);
    columnNames.forEach((name) => {
      const col = headers.indexOf(name);
      if (col === -1) return;
      for (let r = range.s.r + 1; r <= range.e.r; r++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c: col })];
        if (!cell) continue;
        cell.v = String(cell.v ?? "");
        cell.t = "s";
        cell.z = "@";
      }
    });
  };

  const exportExcel = (bank = false) => {
    const data = bank ? buildBankExportRows() : buildExportRows();
    if (!data.length) return toast({ title: "Nothing to export" });
    const headers = Object.keys(data[0]);
    const ws = XLSX.utils.json_to_sheet(data);
    forceTextColumns(ws, headers, bank
      ? ["Debit Account", "Beneficiary Account", "Bank Code/ SWIFT Code"]
      : ["ID"]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payroll");
    XLSX.writeFile(wb, `Payroll${bank ? "-Bank" : ""}-${fileTag()}.xlsx`);
    toast({ title: "Excel exported" });
  };

  const exportPDF = (bank = false) => {
    const data = bank ? buildBankExportRows() : buildExportRows();
    if (!data.length) return toast({ title: "Nothing to export" });
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(`Payroll — ${monthLabel}${bank ? " (Bank Submission)" : ""}`, 14, 14);
    if (!isBankReady) {
      doc.setFontSize(10);
      doc.setTextColor(200, 0, 0);
      doc.text("DRAFT — not valid for bank submission", 14, 20);
      doc.setTextColor(0, 0, 0);
    }
    const headers = Object.keys(data[0]);
    autoTable(doc, {
      startY: isBankReady ? 20 : 26,
      head: [headers],
      body: data.map((r: any) => headers.map((h) => r[h])),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 41, 59] },
    });
    doc.save(`Payroll${bank ? "-Bank" : ""}-${fileTag()}.pdf`);
    toast({ title: "PDF exported" });
  };

  const isMaker = selectedRun ? selectedRun.makerUuid === user?.userUuid : false;
  const isAssignedToCurrentStep = !!(currentStep && user?.userUuid &&
    currentStep.assignedUsers.some((u) => u.uuid === user.userUuid));
  // A sole approver — the only person assigned to the current step — may act on their own submission,
  // since requiring a second person would leave the run un-actionable by anyone.
  const isSoleApproverOnStep = !!(currentStep && currentStep.assignedUsers.length === 1);
  const canActOnCurrentStep = isAssignedToCurrentStep && (!isMaker || isSoleApproverOnStep);

  if (!selectedRun) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/payroll")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to payroll runs
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            This payroll run couldn't be found — it may still be loading, or no longer exists.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <Button variant="ghost" size="sm" className="-ml-2 mb-1" onClick={() => navigate("/admin/payroll")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to payroll runs
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{monthLabel} Payroll</h1>
            <Badge variant={STATUS_BADGE_VARIANT[selectedRun.status]}>{STATUS_LABEL[selectedRun.status]}</Badge>
          </div>
          <div className="text-xs text-muted-foreground space-y-0.5 pt-1">
            <div>Generated by {selectedRun.makerName} on {formatDate(selectedRun.processedAt)}</div>
            {selectedRun.submittedAt && <div>Submitted for authorization on {formatDate(selectedRun.submittedAt)}</div>}
            {selectedRun.status === "PENDING_APPROVAL" && currentStep && (
              <div>Awaiting: <span className="font-medium">{currentStep.label}</span> (step {currentStepIndex + 1} of {activeSteps.length})</div>
            )}
            {selectedRun.status === "PENDING_APPROVAL" && isMaker && !canActOnCurrentStep && (
              <div>You generated this run and cannot authorize or reject it yourself.</div>
            )}
            {selectedRun.status === "PENDING_APPROVAL" && isMaker && canActOnCurrentStep && (
              <div>You're the sole authorizer for this step — you may review and act on your own submission.</div>
            )}
            {selectedRun.status === "PENDING_APPROVAL" && !isMaker && currentStep && !isAssignedToCurrentStep && (
              <div>Awaiting action from an assigned authorizer for "{currentStep.label}" — you are not assigned to this step.</div>
            )}
            {selectedRun.status === "REJECTED" && (
              <div className="text-destructive">Rejected — "{selectedRun.rejectionReason}"</div>
            )}
            {selectedRun.status === "APPROVED" && (
              <div>Fully authorized — ready to download and send to the bank.</div>
            )}
            {selectedRun.sentToBankByName && (
              <div>Sent to bank by {selectedRun.sentToBankByName} on {formatDate(selectedRun.sentToBankAt)}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={!canDownloadDraft}><Download className="w-4 h-4 mr-1" /> Download</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportPDF(false)}><FileText className="w-4 h-4 mr-2" /> Preview as PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportExcel(false)}><FileSpreadsheet className="w-4 h-4 mr-2" /> Preview as Excel</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportCSV(false)}><FileType className="w-4 h-4 mr-2" /> Preview as CSV</DropdownMenuItem>
              {isBankReady && (
                <>
                  <DropdownMenuItem onClick={() => exportPDF(true)}><Banknote className="w-4 h-4 mr-2" /> Bank Submission File (PDF)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportExcel(true)}><Banknote className="w-4 h-4 mr-2" /> Bank Submission File (Excel)</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {selectedRun.status === "DRAFT" && isMakerUser && (
            <Button size="sm" onClick={handleSubmit} disabled={busy}><Send className="w-4 h-4 mr-1" /> Submit for Authorization</Button>
          )}

          {selectedRun.status === "PENDING_APPROVAL" && canActOnCurrentStep && (
            <>
              <Button size="sm" variant="outline" onClick={() => setRejectDialogOpen(true)} disabled={busy}>
                <XCircle className="w-4 h-4 mr-1 text-destructive" /> Reject
              </Button>
              <Button size="sm" onClick={handleApprove} disabled={busy}><CheckCircle2 className="w-4 h-4 mr-1" /> Approve</Button>
            </>
          )}

          {selectedRun.status === "REJECTED" && isMakerUser && (
            <Button size="sm" onClick={handleRegenerate} disabled={busy}><RotateCcw className="w-4 h-4 mr-1" /> Revise &amp; Regenerate</Button>
          )}

          {selectedRun.status === "APPROVED" && canSendToBank && (
            <Button size="sm" onClick={handleMarkSentToBank} disabled={busy}><Banknote className="w-4 h-4 mr-1" /> Mark Sent to Bank</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Gross" value={formatKES(displayTotals.gross)} icon={DollarSign} iconColor="bg-primary/10 text-primary" />
        <StatCard title="Total Net Pay" value={formatKES(displayTotals.net)} icon={TrendingUp} iconColor="bg-success/10 text-success" />
        <StatCard title="Total Deductions" value={formatKES(displayTotals.deductions)} icon={Calculator} iconColor="bg-destructive/10 text-destructive" />
        <StatCard title="Staff Paid" value={`${displayPaidCount} / ${displayConfiguredCount}`} icon={Send} iconColor="bg-info/10 text-info" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <CardTitle className="text-lg">Transactions</CardTitle>
                <CardDescription>Net pay = Gross − (PAYE + NSSF + SHIF + Housing Levy + Other Deductions)</CardDescription>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search staff by name, ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 w-[220px]"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Basic</TableHead>
                  <TableHead className="text-right">Allow.</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">PAYE</TableHead>
                  <TableHead className="text-right">NSSF</TableHead>
                  <TableHead className="text-right">SHIF</TableHead>
                  <TableHead className="text-right">Housing</TableHead>
                  <TableHead className="text-right">Other</TableHead>
                  <TableHead className="text-right">Net Pay</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-sm text-muted-foreground py-8">
                      No staff match "{search}"
                    </TableCell>
                  </TableRow>
                )}
                {filteredRows.map(({ staff, line, isPaid, prorationNote }) => {
                  const allow = line.taxableAllowances + line.nonTaxableAllowances;
                  return (
                    <TableRow key={staff.uuid} className="cursor-pointer hover:bg-muted/50" onClick={() => setViewingStaffUuid(staff.uuid)}>
                      <TableCell className="font-mono text-xs">{getStaffIdentifier(staff)}</TableCell>
                      <TableCell className="font-medium">
                        {staff.firstName} {staff.lastName}
                        {prorationNote && (
                          <div className="text-[10px] font-normal text-amber-600 dark:text-amber-500">{prorationNote}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{line.basic.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-success">{allow.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{line.gross.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-destructive">{line.paye.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-destructive">{line.nssf.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-destructive">{line.nhif.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-destructive">{line.housingLevy.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-destructive">{line.otherDeductions.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-semibold">{line.net.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={isPaid ? "default" : STATUS_BADGE_VARIANT[selectedRun.status]} className="text-[10px]">
                          {isPaid ? "Paid" : STATUS_LABEL[selectedRun.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Authorization Workflow</CardTitle>
            <CardDescription>Who has authorized this run and who's still pending</CardDescription>
          </CardHeader>
          <CardContent>
            <PayrollWorkflowStatus run={selectedRun} steps={activeSteps} approvals={approvals} />
          </CardContent>
        </Card>
      </div>

      <Dialog open={rejectDialogOpen} onOpenChange={(open) => { setRejectDialogOpen(open); if (!open) setRejectReason(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payroll Run</DialogTitle>
            <DialogDescription>{`${selectedRun.monthLabel} payroll will be returned to ${selectedRun.makerName} for correction.`}</DialogDescription>
          </DialogHeader>
          <Textarea rows={4} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection (required)" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={!rejectReason.trim() || busy} onClick={confirmReject}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingStaffUuid} onOpenChange={(open) => !open && setViewingStaffUuid(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payslip — {monthLabel}</DialogTitle>
            <DialogDescription>
              {viewingRow ? `${viewingRow.staff.firstName} ${viewingRow.staff.lastName} — ${getStaffIdentifier(viewingRow.staff)}` : ""}
            </DialogDescription>
          </DialogHeader>
          {viewingRow && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">Pay Period: {monthLabel}</div>
                <Badge variant={viewingRow.isPaid ? "default" : STATUS_BADGE_VARIANT[selectedRun.status]} className="text-[10px]">
                  {viewingRow.isPaid ? "Paid" : STATUS_LABEL[selectedRun.status]}
                </Badge>
              </div>

              {viewingRow.prorationNote && (
                <p className="text-xs text-amber-600 dark:text-amber-500">{viewingRow.prorationNote}</p>
              )}

              <div>
                <h4 className="text-sm font-semibold mb-2">Earnings</h4>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Basic Salary</span>
                    <span>{formatKES(viewingRow.line.basic)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Taxable Allowances</span>
                    <span>{formatKES(viewingRow.line.taxableAllowances)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Non-Taxable Allowances</span>
                    <span>{formatKES(viewingRow.line.nonTaxableAllowances)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Gross Pay</span>
                    <span>{formatKES(viewingRow.line.gross)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Deductions</h4>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">PAYE</span>
                    <span className="text-destructive">{formatKES(viewingRow.line.paye)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">NSSF</span>
                    <span className="text-destructive">{formatKES(viewingRow.line.nssf)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">SHIF</span>
                    <span className="text-destructive">{formatKES(viewingRow.line.nhif)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Housing Levy</span>
                    <span className="text-destructive">{formatKES(viewingRow.line.housingLevy)}</span>
                  </div>
                  {viewingRow.line.otherDeductions > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Other Deductions</span>
                      <span className="text-destructive">{formatKES(viewingRow.line.otherDeductions)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Total Deductions</span>
                    <span className="text-destructive">{formatKES(viewingRow.line.totalDeductions)}</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between items-center p-3 rounded-lg bg-primary/10">
                <span className="font-semibold">Net Pay</span>
                <span className="text-lg font-bold text-primary">{formatKES(viewingRow.line.net)}</span>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Payment Details</h4>
                {!viewingPaymentDetails ? (
                  <p className="text-xs text-muted-foreground">Not configured — set up under Staff Payment Details.</p>
                ) : (
                  <div className="p-3 rounded-lg border space-y-2">
                    <div className="flex items-center gap-2">
                      {viewingPaymentDetails.paymentMethod === "MOBILE_MONEY" ? (
                        <Smartphone className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Banknote className="w-4 h-4 text-muted-foreground" />
                      )}
                      <Badge variant="secondary" className="text-[10px]">{viewingPaymentDetails.paymentMethod?.replace("_", " ")}</Badge>
                    </div>
                    {viewingPaymentDetails.paymentMethod === "BANK_TRANSFER" && (
                      <dl className="grid grid-cols-2 gap-y-1.5 text-sm">
                        <dt className="text-muted-foreground">Bank</dt>
                        <dd className="text-right">{viewingPaymentDetails.bank?.name ?? "—"}</dd>
                        <dt className="text-muted-foreground">Account Number</dt>
                        <dd className="text-right font-mono">{viewingPaymentDetails.bankAccountNumber || "—"}</dd>
                        <dt className="text-muted-foreground">Account Name</dt>
                        <dd className="text-right">{viewingPaymentDetails.bankAccountName || "—"}</dd>
                        <dt className="text-muted-foreground">Branch</dt>
                        <dd className="text-right">{viewingPaymentDetails.bankBranch || "—"}</dd>
                        <dt className="text-muted-foreground">Payment Type</dt>
                        <dd className="text-right">{resolvePaymentTypeCode(viewingPaymentDetails) || "—"}</dd>
                      </dl>
                    )}
                    {viewingPaymentDetails.paymentMethod === "MOBILE_MONEY" && (
                      <dl className="grid grid-cols-2 gap-y-1.5 text-sm">
                        <dt className="text-muted-foreground">Provider</dt>
                        <dd className="text-right">{viewingPaymentDetails.mobileMoneyProvider?.name ?? "—"}</dd>
                        <dt className="text-muted-foreground">Mobile Number</dt>
                        <dd className="text-right font-mono">{viewingPaymentDetails.mobileNumber || "—"}</dd>
                        <dt className="text-muted-foreground">Registered Name</dt>
                        <dd className="text-right">{viewingPaymentDetails.mobileAccountName || "—"}</dd>
                        <dt className="text-muted-foreground">Payment Type</dt>
                        <dd className="text-right">{resolvePaymentTypeCode(viewingPaymentDetails) || "—"}</dd>
                      </dl>
                    )}
                    {viewingPaymentDetails.paymentMethod === "CHEQUE" && (
                      <p className="text-sm text-muted-foreground">Paid by physical cheque — no account details required.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setViewingStaffUuid(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PayrollRunDetailPage;
