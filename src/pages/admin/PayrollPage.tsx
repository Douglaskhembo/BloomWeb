import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calculator, History, ChevronRight, RefreshCw } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PayrollNavTabs from "@/components/payroll/PayrollNavTabs";
import { useToast } from "@/hooks/use-toast";
import { getBackendErrorMessage } from "@/utils/errorHandler";
import { useAuth } from "@/context/AuthContext";
import { usePayroll, PayrollRun, PayrollRunStatus, PayrollWorkflowStep } from "@/context/PayrollContext";
import { formatKES } from "@/lib/payroll/kenya";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

export const STATUS_LABEL: Record<PayrollRunStatus, string> = {
  DRAFT: "Pending Review",
  PENDING_APPROVAL: "Ready for Authorization",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  SENT_TO_BANK: "Sent to Bank",
};

export const STATUS_BADGE_VARIANT: Record<PayrollRunStatus, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  PENDING_APPROVAL: "outline",
  APPROVED: "default",
  REJECTED: "destructive",
  SENT_TO_BANK: "default",
};

const TABS: { value: PayrollRunStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "DRAFT", label: "Pending Review" },
  { value: "PENDING_APPROVAL", label: "Ready for Authorization" },
  { value: "APPROVED", label: "Approved" },
  { value: "SENT_TO_BANK", label: "Sent to Bank" },
  { value: "REJECTED", label: "Rejected" },
];

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" }) : "";

const personName = (u: { firstName?: string; otherNames?: string; userName: string }) => {
  const name = `${u.firstName ?? ""} ${u.otherNames ?? ""}`.trim();
  return name || u.userName;
};

/** One-line summary of who is currently blocking this run — the maker (if still in review),
 *  the named authorizer(s) on the current step, or a terminal-state summary. Only looks at the
 *  current step's assignees, not the full approval history (that detail lives on the run's own page). */
const authorizationSummary = (run: PayrollRun, workflowSteps: PayrollWorkflowStep[], currentUserUuid?: string): string => {
  if (run.status === "DRAFT") {
    return run.makerUuid === currentUserUuid ? "Pending your review" : `Pending review by ${run.makerName}`;
  }
  if (run.status === "REJECTED") return "Rejected — see reason";
  if (run.status === "APPROVED") return "Fully authorized — ready to send";
  if (run.status === "SENT_TO_BANK") return "Sent to bank";

  const runNet = Object.values(run.lines).reduce((sum, l) => sum + l.net, 0);
  const applicable = workflowSteps
    .filter((s) => s.active && (!s.thresholdAmount || runNet >= s.thresholdAmount))
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  const step = applicable.find((s) => s.sequenceOrder === run.currentStepOrder);
  if (!step) return "Awaiting authorization";
  const names = step.assignedUsers.map((u) => (u.uuid === currentUserUuid ? "You" : personName(u)));
  return `Pending: ${names.join(", ")} (${step.label})`;
};

const PayrollPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { payrollHistory, workflowSteps, makers, generateRun, refreshRuns } = usePayroll();
  const [statusTab, setStatusTab] = useState<PayrollRunStatus | "ALL">("ALL");
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Refetch every time this screen is navigated to, not just once at app boot.
  useEffect(() => { refreshRuns().catch(() => {}); }, [refreshRuns]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshRuns();
    } catch (err) {
      toast({ title: "Could not refresh", description: getBackendErrorMessage(err), variant: "destructive" });
    } finally {
      setRefreshing(false);
    }
  };

  const isMakerUser = makers.some((m) => m.user.uuid === user?.userUuid);

  const now = new Date();
  const currentMonthLabel = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;

  // A non-rejected run already exists for the current month — block creating a duplicate.
  const activeRunForMonth = payrollHistory.find(
    (r) => r.year === now.getFullYear() && r.monthIndex === now.getMonth() && r.status !== "REJECTED",
  );

  const filteredHistory = statusTab === "ALL" ? payrollHistory : payrollHistory.filter((r) => r.status === statusTab);

  const handleGenerate = async () => {
    setBusy(true);
    try {
      const run = await generateRun(now.getFullYear(), now.getMonth(), currentMonthLabel);
      toast({ title: "Payroll draft generated", description: "Review it and submit for authorization when ready." });
      navigate(`/admin/payroll/runs/${run.id}`);
    } catch (err) {
      const message = getBackendErrorMessage(err);
      // The backend already has a run for this month but our local list didn't — re-sync so the
      // "Open ... run" button appears instead of a dead-end "Generate" button next time.
      if (message.toLowerCase().includes("already has an active run")) {
        await refreshRuns().catch(() => {});
        toast({ title: "Payroll list was out of date", description: "Refreshed — the existing run for this month should now be visible below." });
      } else {
        toast({ title: "Could not generate payroll", description: message, variant: "destructive" });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payroll</h1>
          <p className="text-muted-foreground">Computes from Staff Salaries + Kenya statutory rules (PAYE, NSSF, SHIF, Housing Levy)</p>
        </div>
        <div className="flex items-center gap-2">
          <PayrollNavTabs />

          <Button size="sm" variant="ghost" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>

          {activeRunForMonth ? (
            <Button size="sm" variant="outline" onClick={() => navigate(`/admin/payroll/runs/${activeRunForMonth.id}`)}>
              <History className="w-4 h-4 mr-1" /> Open {currentMonthLabel} run ({STATUS_LABEL[activeRunForMonth.status]})
            </Button>
          ) : isMakerUser ? (
            <Button size="sm" onClick={handleGenerate} disabled={busy}><Calculator className="w-4 h-4 mr-1" /> Generate Payroll</Button>
          ) : (
            <Button size="sm" disabled title="You're not set up as a payroll maker — ask an admin to add you under Payroll Setup → Approval Workflow">
              <Calculator className="w-4 h-4 mr-1" /> Generate Payroll
            </Button>
          )}
        </div>
      </div>

      <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as PayrollRunStatus | "ALL")}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
              {t.value !== "ALL" && (
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">
                  {payrollHistory.filter((r) => r.status === t.value).length}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payroll Batches</CardTitle>
          <CardDescription>Click a run to view its transactions and authorization progress</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Maker</TableHead>
                <TableHead className="text-right">Staff</TableHead>
                <TableHead className="text-right">Net Total</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Authorization</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHistory.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                    No payroll runs {statusTab !== "ALL" ? `in "${STATUS_LABEL[statusTab as PayrollRunStatus]}"` : "yet"} — generate one to get started.
                  </TableCell>
                </TableRow>
              )}
              {filteredHistory.map((run) => {
                const staffCount = Object.keys(run.lines).length;
                const netTotal = Object.values(run.lines).reduce((sum, l) => sum + l.net, 0);
                return (
                  <TableRow
                    key={run.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/admin/payroll/runs/${run.id}`)}
                  >
                    <TableCell className="font-medium">{run.monthLabel}</TableCell>
                    <TableCell><Badge variant={STATUS_BADGE_VARIANT[run.status]}>{STATUS_LABEL[run.status]}</Badge></TableCell>
                    <TableCell className="text-sm">{run.makerName}</TableCell>
                    <TableCell className="text-right">{staffCount}</TableCell>
                    <TableCell className="text-right font-semibold">{formatKES(netTotal)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{run.submittedAt ? formatDate(run.submittedAt) : "—"}</TableCell>
                    <TableCell className="text-xs">{authorizationSummary(run, workflowSteps, user?.userUuid)}</TableCell>
                    <TableCell><ChevronRight className="w-4 h-4 text-muted-foreground" /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayrollPage;
