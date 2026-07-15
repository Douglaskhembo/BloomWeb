import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { PayrollLine } from "@/lib/payroll/kenya";

export interface StaffSalary {
  basic: number;
  allowances: Record<number, number>; // allowanceId -> amount (0 = not assigned)
  deductions: Record<number, number>; // deductionId -> amount
}

export interface PayrollRun {
  id: string;
  monthLabel: string; // e.g. "January 2026"
  year: number;
  monthIndex: number; // 0-11
  processedAt: string; // ISO date
  lines: Record<string, PayrollLine>; // staffId -> computed line
  paidStaff: string[]; // staffIds marked as paid
}

const STORAGE_KEY = "edumanager_staff_salaries_v2";
const HISTORY_KEY = "edumanager_payroll_history_v1";

// No seeded salaries — each staff starts unconfigured so admin must "Set Salary".
const defaults: Record<string, StaffSalary> = {};

interface Ctx {
  salaries: Record<string, StaffSalary>;
  setSalary: (staffId: string, salary: StaffSalary) => void;
  getSalary: (staffId: string) => StaffSalary;
  payrollHistory: PayrollRun[];
  addPayrollRun: (run: PayrollRun) => void;
}

const PayrollContext = createContext<Ctx | null>(null);

export const PayrollProvider = ({ children }: { children: ReactNode }) => {
  const [salaries, setSalaries] = useState<Record<string, StaffSalary>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...defaults, ...JSON.parse(raw) };
    } catch { /* noop */ }
    return defaults;
  });

  const [payrollHistory, setPayrollHistory] = useState<PayrollRun[]>(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* noop */ }
    return [];
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(salaries)); } catch { /* noop */ }
  }, [salaries]);

  useEffect(() => {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(payrollHistory)); } catch { /* noop */ }
  }, [payrollHistory]);

  const setSalary = (staffId: string, salary: StaffSalary) =>
    setSalaries((p) => ({ ...p, [staffId]: salary }));

  const getSalary = (staffId: string): StaffSalary =>
    salaries[staffId] ?? { basic: 0, allowances: {}, deductions: {} };

  const addPayrollRun = (run: PayrollRun) =>
    setPayrollHistory((prev) => [run, ...prev]);

  return <PayrollContext.Provider value={{ salaries, setSalary, getSalary, payrollHistory, addPayrollRun }}>{children}</PayrollContext.Provider>;
};

export const usePayroll = () => {
  const ctx = useContext(PayrollContext);
  if (!ctx) throw new Error("usePayroll must be used within PayrollProvider");
  return ctx;
};