// Kenya statutory payroll constants & calculation engine.
// Centralised so PayrollSetup, StaffSalaries and Payroll pages share one source.
//
// Rates are configurable via the Payroll Setup screens (PAYE bands, NHIF tiers,
// Statutory Deductions, Settings) and fetched from the backend at call time — see
// loadPayrollConfig() below. The DEFAULT_* values here are only a fallback for when
// that config hasn't been configured yet or fails to load, so the app never silently
// computes zero deductions.

export interface PayeBand { min: number; max: number | null; rate: number }
export interface NhifTier { min: number; max: number | null; amount: number }
export interface AllowanceType { id: number; name: string; defaultValue: number; taxable: boolean }
export interface DeductionType { id: number; name: string; defaultValue: number }
export interface StatutoryConfigItem {
  type: "percentage" | "fixed" | "tiered";
  category: "nssf" | "housing_levy" | "other";
  value: number;
  maxAmount: number | null;
  active: boolean;
}

export const DEFAULT_PAYE_BANDS: PayeBand[] = [
  { min: 0, max: 24000, rate: 0.10 },
  { min: 24001, max: 32333, rate: 0.25 },
  { min: 32334, max: 500000, rate: 0.30 },
  { min: 500001, max: 800000, rate: 0.325 },
  { min: 800001, max: null, rate: 0.35 },
];

export const DEFAULT_NHIF_TIERS: NhifTier[] = [
  { min: 0, max: 5999, amount: 150 }, { min: 6000, max: 7999, amount: 300 },
  { min: 8000, max: 11999, amount: 400 }, { min: 12000, max: 14999, amount: 500 },
  { min: 15000, max: 19999, amount: 600 }, { min: 20000, max: 24999, amount: 750 },
  { min: 25000, max: 29999, amount: 850 }, { min: 30000, max: 34999, amount: 900 },
  { min: 35000, max: 39999, amount: 950 }, { min: 40000, max: 44999, amount: 1000 },
  { min: 45000, max: 49999, amount: 1100 }, { min: 50000, max: 59999, amount: 1200 },
  { min: 60000, max: 69999, amount: 1300 }, { min: 70000, max: 79999, amount: 1400 },
  { min: 80000, max: 89999, amount: 1500 }, { min: 90000, max: 99999, amount: 1600 },
  { min: 100000, max: null, amount: 1700 },
];

// NSSF's two tiers modeled as two capped-percentage rows (6% up to KES 1,080 each),
// matching what the Statutory Deductions setup screen configures.
export const DEFAULT_STATUTORY: StatutoryConfigItem[] = [
  { type: "percentage", category: "nssf", value: 6, maxAmount: 1080, active: true },
  { type: "percentage", category: "nssf", value: 6, maxAmount: 1080, active: true },
  { type: "percentage", category: "housing_levy", value: 1.5, maxAmount: null, active: true },
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
  nhifTiers: NhifTier[];
  statutory: StatutoryConfigItem[];
  personalRelief: number;
}

const computeStatutory = (gross: number, statutory: StatutoryConfigItem[], category: "nssf" | "housing_levy") =>
  Math.round(
    statutory
      .filter((d) => d.active && d.category === category && d.type !== "tiered")
      .reduce((sum, d) => {
        const raw = d.type === "percentage" ? gross * (d.value / 100) : d.value;
        return sum + (d.maxAmount !== null ? Math.min(raw, d.maxAmount) : raw);
      }, 0),
  );

export const computeNHIF = (gross: number, tiers: NhifTier[] = DEFAULT_NHIF_TIERS) => {
  const tier = tiers.find((t) => gross >= t.min && (t.max === null || gross <= t.max));
  return tier ? tier.amount : 0;
};

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
  const nhifTiers = config?.nhifTiers?.length ? config.nhifTiers : DEFAULT_NHIF_TIERS;
  const statutory = config?.statutory?.length ? config.statutory : DEFAULT_STATUTORY;
  const personalRelief = config?.personalRelief ?? DEFAULT_PERSONAL_RELIEF;

  const gross = basic + taxableAllowances + nonTaxableAllowances;
  const nssf = computeStatutory(gross, statutory, "nssf");
  const nhif = computeNHIF(gross, nhifTiers);
  const housingLevy = computeStatutory(gross, statutory, "housing_levy");
  // PAYE taxable income: gross minus non-taxable allowances minus NSSF (deductible)
  const taxable = gross - nonTaxableAllowances - nssf;
  const paye = computePAYE(Math.max(0, taxable), payeBands, personalRelief);
  const totalDeductions = nssf + nhif + housingLevy + paye + otherDeductions;
  const net = gross - totalDeductions;
  return { basic, taxableAllowances, nonTaxableAllowances, gross, nssf, nhif, housingLevy, paye, otherDeductions, totalDeductions, net };
};

export const formatKES = (n: number) => `KES ${Math.round(n).toLocaleString()}`;