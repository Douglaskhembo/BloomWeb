// Kenya statutory payroll constants & calculation engine.
// Centralised so PayrollSetup, StaffSalaries and Payroll pages share one source.
//
// Rates are configurable via the Payroll Setup screens (PAYE bands, Statutory Deductions,
// Settings) and fetched from the backend at call time — see loadPayrollConfig() below. The
// DEFAULT_* values here are only a fallback for when that config hasn't been configured yet
// or fails to load, so the app never silently computes zero deductions. SHIF (which replaced
// NHIF in Oct 2024) is a flat percentage of gross like NSSF/Housing Levy, so it's modeled as a
// StatutoryConfigItem row rather than a tiered lookup table.

export interface PayeBand { min: number; max: number | null; rate: number }
export interface AllowanceType { id: number; name: string; defaultValue: number; taxable: boolean }
export interface DeductionType { id: number; name: string; defaultValue: number }
export interface StatutoryConfigItem {
  type: "percentage" | "fixed" | "tiered";
  category: "nssf" | "housing_levy" | "shif" | "other";
  value: number;
  maxAmount: number | null;
  /** Floor on the computed amount, e.g. SHIF's KES 300 minimum. */
  minAmount?: number | null;
  /** Lower bound subtracted from gross before applying the percentage, e.g. NSSF Tier II
   *  only taxing the excess above the Tier I ceiling. */
  thresholdAmount?: number | null;
  active: boolean;
}

export const DEFAULT_PAYE_BANDS: PayeBand[] = [
  { min: 0, max: 24000, rate: 0.10 },
  { min: 24001, max: 32333, rate: 0.25 },
  { min: 32334, max: 500000, rate: 0.30 },
  { min: 500001, max: 800000, rate: 0.325 },
  { min: 800001, max: null, rate: 0.35 },
];

// NSSF Tier I/II per the Feb 2025 rates, Housing Levy 1.5% uncapped, and SHIF (replacing NHIF
// since Oct 2024) at a flat 2.75% of gross with a KES 300 floor.
export const DEFAULT_STATUTORY: StatutoryConfigItem[] = [
  { type: "percentage", category: "nssf", value: 6, thresholdAmount: 0, maxAmount: 480, active: true },
  { type: "percentage", category: "nssf", value: 6, thresholdAmount: 8000, maxAmount: 3840, active: true },
  { type: "percentage", category: "housing_levy", value: 1.5, maxAmount: null, active: true },
  { type: "percentage", category: "shif", value: 2.75, minAmount: 300, maxAmount: null, active: true },
];

export const DEFAULT_PERSONAL_RELIEF = 2400;

export const DEFAULT_ALLOWANCES: AllowanceType[] = [
  { id: 1, name: "House Allowance", defaultValue: 8000, taxable: true },
  { id: 2, name: "Transport Allowance", defaultValue: 4000, taxable: true },
  { id: 3, name: "Medical Allowance", defaultValue: 3000, taxable: false },
  { id: 4, name: "Responsibility Allowance", defaultValue: 10000, taxable: true },
  { id: 5, name: "Hardship Allowance", defaultValue: 5000, taxable: true },
];

export const DEFAULT_DEDUCTIONS: DeductionType[] = [
  { id: 1, name: "Staff Welfare", defaultValue: 500 },
  { id: 2, name: "SACCO Contribution", defaultValue: 2000 },
  { id: 3, name: "Loan Repayment", defaultValue: 0 },
  { id: 4, name: "Insurance Premium", defaultValue: 1500 },
];

export interface PayrollConfig {
  payeBands: PayeBand[];
  statutory: StatutoryConfigItem[];
  personalRelief: number;
}

const computeStatutory = (gross: number, statutory: StatutoryConfigItem[], category: "nssf" | "housing_levy" | "shif") =>
  Math.round(
    statutory
      .filter((d) => d.active && d.category === category && d.type !== "tiered")
      .reduce((sum, d) => {
        const base = Math.max(0, gross - (d.thresholdAmount ?? 0));
        let amount = d.type === "percentage" ? base * (d.value / 100) : d.value;
        if (d.maxAmount != null) amount = Math.min(amount, d.maxAmount);
        if (d.minAmount != null) amount = Math.max(amount, d.minAmount);
        return sum + amount;
      }, 0),
  );

export const computePAYE = (taxableIncome: number, bands: PayeBand[] = DEFAULT_PAYE_BANDS, personalRelief: number = DEFAULT_PERSONAL_RELIEF) => {
  let remaining = taxableIncome;
  let tax = 0;
  for (const band of bands) {
    if (remaining <= 0) break;
    const bandWidth = band.max === null ? remaining : Math.min(remaining, band.max - band.min + 1);
    tax += bandWidth * band.rate;
    remaining -= bandWidth;
  }
  return Math.max(0, Math.round(tax - personalRelief));
};

export interface PayrollLine {
  basic: number;
  taxableAllowances: number;
  nonTaxableAllowances: number;
  gross: number;
  nssf: number;
  nhif: number;
  housingLevy: number;
  paye: number;
  otherDeductions: number;
  totalDeductions: number;
  net: number;
}

export const calculatePayroll = (
  basic: number,
  taxableAllowances: number,
  nonTaxableAllowances: number,
  otherDeductions: number,
  config?: Partial<PayrollConfig>,
): PayrollLine => {
  const payeBands = config?.payeBands?.length ? config.payeBands : DEFAULT_PAYE_BANDS;
  const statutory = config?.statutory?.length ? config.statutory : DEFAULT_STATUTORY;
  const personalRelief = config?.personalRelief ?? DEFAULT_PERSONAL_RELIEF;

  const gross = basic + taxableAllowances + nonTaxableAllowances;
  const nssf = computeStatutory(gross, statutory, "nssf");
  const nhif = computeStatutory(gross, statutory, "shif");
  const housingLevy = computeStatutory(gross, statutory, "housing_levy");
  // PAYE taxable income: gross minus non-taxable allowances minus NSSF (deductible)
  const taxable = gross - nonTaxableAllowances - nssf;
  const paye = computePAYE(Math.max(0, taxable), payeBands, personalRelief);
  const totalDeductions = nssf + nhif + housingLevy + paye + otherDeductions;
  const net = gross - totalDeductions;
  return { basic, taxableAllowances, nonTaxableAllowances, gross, nssf, nhif, housingLevy, paye, otherDeductions, totalDeductions, net };
};

export const formatKES = (n: number) => `KES ${Math.round(n).toLocaleString()}`;