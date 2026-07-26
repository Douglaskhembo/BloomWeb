import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { PayrollLine as KenyaPayrollLine } from "@/lib/payroll/kenya";
import { PayrollApi } from "@/services/api";

export interface StaffSalary {
  basic: number;
  allowances: Record<number, number>; // allowanceId -> amount (0 = not assigned)
  deductions: Record<number, number>; // deductionId -> amount
}

export type PayrollRunStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "SENT_TO_BANK";

export interface PayrollWorkflowStepUser {
  uuid: string;
  userName: string;
  firstName?: string;
  otherNames?: string;
}

export interface PayrollWorkflowStep {
  uuid: string;
  sequenceOrder: number;
  label: string;
  approvalRule: "ALL_MUST_APPROVE" | "ANY_ONE_APPROVES" | "AT_LEAST";
  /** Only set when approvalRule is AT_LEAST — how many of the assigned people must approve. */
  minApprovals?: number;
  active: boolean;
  assignedUsers: PayrollWorkflowStepUser[];
  /** Step only applies once the run's total net pay reaches this amount; undefined/0 = always applies. */
  thresholdAmount?: number;
}

export interface PayrollRunLine {
  id: number;
  staffId: string;
  staffName: string;
  status: "PAID" | "PENDING";
  paymentMethod?: string;
  payoutDestination?: string;
}

export interface PayrollRun {
  id: number;
  uuid: string;
  monthLabel: string;
  year: number;
  monthIndex: number;
  processedAt: string;
  lines: Record<string, KenyaPayrollLine>; // staffId -> computed line
  rawLines: PayrollRunLine[];
  status: PayrollRunStatus;
  makerUuid: string;
  makerName: string;
  submittedAt?: string;
  currentStepOrder?: number;
  rejectionReason?: string;
  sentToBankByName?: string;
  sentToBankAt?: string;
}

const toStaffSalary = (raw: any): StaffSalary => ({
  basic: raw.basicSalary ?? 0,
  allowances: raw.allowances ?? {},
  deductions: raw.deductions ?? {},
});

const toKenyaLine = (raw: any): KenyaPayrollLine => ({
  basic: raw.basicSalary,
  taxableAllowances: raw.taxableAllowances,
  nonTaxableAllowances: raw.nonTaxableAllowances,
  gross: raw.grossSalary,
  nssf: raw.nssf,
  nhif: raw.nhif,
  housingLevy: raw.housingLevy,
  paye: raw.paye,
  otherDeductions: raw.otherDeductions,
  totalDeductions: raw.totalDeductions,
  net: raw.netSalary,
});

const toPayrollRun = (raw: any): PayrollRun => {
  const rawLines: any[] = Array.isArray(raw.lines) ? raw.lines : [];
  const lines: Record<string, KenyaPayrollLine> = {};
  rawLines.forEach((l) => { lines[l.staffId] = toKenyaLine(l); });
  return {
    id: raw.id,
    uuid: raw.uuid,
    monthLabel: raw.monthLabel,
    year: raw.year,
    monthIndex: raw.monthIndex,
    processedAt: raw.processedAt,
    lines,
    rawLines: rawLines.map((l) => ({
      id: l.id, staffId: l.staffId, staffName: l.staffName, status: l.status,
      paymentMethod: l.paymentMethod, payoutDestination: l.payoutDestination,
    })),
    status: raw.status,
    makerUuid: raw.makerUuid,
    makerName: raw.makerName,
    submittedAt: raw.submittedAt,
    currentStepOrder: raw.currentStepOrder,
    rejectionReason: raw.rejectionReason,
    sentToBankByName: raw.sentToBankByName,
    sentToBankAt: raw.sentToBankAt,
  };
};

export interface PayrollMaker {
  uuid: string;
  user: PayrollWorkflowStepUser;
}

interface Ctx {
  salaries: Record<string, StaffSalary>;
  setSalary: (staffId: string, salary: StaffSalary) => Promise<void>;
  getSalary: (staffId: string) => StaffSalary;
  payrollHistory: PayrollRun[];
  workflowSteps: PayrollWorkflowStep[];
  makers: PayrollMaker[];
  refreshWorkflowSteps: () => Promise<void>;
  refreshMakers: () => Promise<void>;
  refreshRuns: () => Promise<void>;
  generateRun: (year: number, monthIndex: number, monthLabel: string) => Promise<PayrollRun>;
  submitRun: (runId: number) => Promise<PayrollRun>;
  approveRun: (runId: number, comment?: string) => Promise<PayrollRun>;
  rejectRun: (runId: number, reason: string) => Promise<PayrollRun>;
  markSentToBank: (runId: number) => Promise<PayrollRun>;
}

const PayrollContext = createContext<Ctx | null>(null);

export const PayrollProvider = ({ children }: { children: ReactNode }) => {
  const [salaries, setSalaries] = useState<Record<string, StaffSalary>>({});
  const [payrollHistory, setPayrollHistory] = useState<PayrollRun[]>([]);
  const [workflowSteps, setWorkflowSteps] = useState<PayrollWorkflowStep[]>([]);
  const [makers, setMakers] = useState<PayrollMaker[]>([]);

  const refreshSalaries = useCallback(async () => {
    const rows = await PayrollApi.getAllStaffSalaries();
    const next: Record<string, StaffSalary> = {};
    rows.forEach((r: any) => { next[r.staffId] = toStaffSalary(r); });
    setSalaries(next);
  }, []);

  const refreshRuns = useCallback(async () => {
    const rows = await PayrollApi.getRuns();
    setPayrollHistory(rows.map(toPayrollRun));
  }, []);

  const refreshWorkflowSteps = useCallback(async () => {
    const rows = await PayrollApi.getWorkflowSteps();
    setWorkflowSteps(rows
      .map((s: any) => ({
        uuid: s.uuid, sequenceOrder: s.sequenceOrder, label: s.label,
        approvalRule: s.approvalRule, minApprovals: s.minApprovals, active: s.active,
        assignedUsers: (s.assignedUsers ?? []).map((u: any) => ({
          uuid: u.uuid, userName: u.userName, firstName: u.firstName, otherNames: u.otherNames,
        })),
        thresholdAmount: s.thresholdAmount,
      }))
      .sort((a, b) => a.sequenceOrder - b.sequenceOrder));
  }, []);

  const refreshMakers = useCallback(async () => {
    const rows = await PayrollApi.getMakers();
    setMakers(rows.map((m: any) => ({
      uuid: m.uuid,
      user: { uuid: m.user.uuid, userName: m.user.userName, firstName: m.user.firstName, otherNames: m.user.otherNames },
    })));
  }, []);

  useEffect(() => {
    refreshSalaries().catch(() => setSalaries({}));
    refreshRuns().catch(() => setPayrollHistory([]));
    refreshWorkflowSteps().catch(() => setWorkflowSteps([]));
    refreshMakers().catch(() => setMakers([]));
  }, [refreshSalaries, refreshRuns, refreshWorkflowSteps, refreshMakers]);

  const setSalary = async (staffId: string, salary: StaffSalary) => {
    await PayrollApi.saveStaffSalary({
      staffId, basicSalary: salary.basic, allowances: salary.allowances, deductions: salary.deductions,
    });
    setSalaries((p) => ({ ...p, [staffId]: salary }));
  };

  const getSalary = (staffId: string): StaffSalary =>
    salaries[staffId] ?? { basic: 0, allowances: {}, deductions: {} };

  const generateRun: Ctx["generateRun"] = async (year, monthIndex, monthLabel) => {
    const raw = await PayrollApi.processRun(year, monthIndex, monthLabel);
    const run = toPayrollRun(raw);
    setPayrollHistory((prev) => [run, ...prev]);
    return run;
  };

  const submitRun: Ctx["submitRun"] = async (runId) => {
    const raw = await PayrollApi.submitRun(runId);
    const run = toPayrollRun(raw);
    setPayrollHistory((prev) => prev.map((r) => (r.id === runId ? run : r)));
    return run;
  };

  const approveRun: Ctx["approveRun"] = async (runId, comment) => {
    const raw = await PayrollApi.decideRun(runId, "APPROVE", comment);
    const run = toPayrollRun(raw);
    setPayrollHistory((prev) => prev.map((r) => (r.id === runId ? run : r)));
    return run;
  };

  const rejectRun: Ctx["rejectRun"] = async (runId, reason) => {
    const raw = await PayrollApi.decideRun(runId, "REJECT", reason);
    const run = toPayrollRun(raw);
    setPayrollHistory((prev) => prev.map((r) => (r.id === runId ? run : r)));
    return run;
  };

  const markSentToBank: Ctx["markSentToBank"] = async (runId) => {
    const raw = await PayrollApi.sendRunToBank(runId);
    const run = toPayrollRun(raw);
    setPayrollHistory((prev) => prev.map((r) => (r.id === runId ? run : r)));
    return run;
  };

  return (
    <PayrollContext.Provider
      value={{
        salaries,
        setSalary,
        getSalary,
        payrollHistory,
        workflowSteps,
        makers,
        refreshWorkflowSteps,
        refreshMakers,
        refreshRuns,
        generateRun,
        submitRun,
        approveRun,
        rejectRun,
        markSentToBank,
      }}
    >
      {children}
    </PayrollContext.Provider>
  );
};

export const usePayroll = () => {
  const ctx = useContext(PayrollContext);
  if (!ctx) throw new Error("usePayroll must be used within PayrollProvider");
  return ctx;
};
