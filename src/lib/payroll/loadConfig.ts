import { PayrollApi } from "@/services/api";
import type { PayrollConfig } from "./kenya";

// Fetches the live PAYE bands / NHIF tiers / statutory deduction rates / personal relief
// configured via Payroll Setup, converting backend shapes (minAmount/rate-as-percentage,
// UPPERCASE enums) into what calculatePayroll expects. calculatePayroll falls back to its
// own DEFAULT_* constants for anything missing, so a partially-configured backend never
// results in a broken calculation.
export const loadPayrollConfig = async (): Promise<Partial<PayrollConfig>> => {
  const [bands, tiers, statutory, settings] = await Promise.all([
    PayrollApi.getPayeBands(),
    PayrollApi.getNhifTiers(),
    PayrollApi.getStatutoryDeductions(),
    PayrollApi.getSettings(),
  ]);

  return {
    payeBands: bands.map((b: any) => ({ min: b.minAmount, max: b.maxAmount ?? null, rate: b.rate / 100 })),
    nhifTiers: tiers.map((t: any) => ({ min: t.minSalary, max: t.maxSalary ?? null, amount: t.amount })),
    statutory: statutory.map((s: any) => ({
      type: s.type === "PERCENTAGE" ? "percentage" : s.type === "FIXED" ? "fixed" : "tiered",
      category: s.category === "NSSF" ? "nssf" : s.category === "HOUSING_LEVY" ? "housing_levy" : "other",
      value: s.value,
      maxAmount: s.maxAmount ?? null,
      active: s.active,
    })),
    personalRelief: settings?.personalRelief,
  };
};
