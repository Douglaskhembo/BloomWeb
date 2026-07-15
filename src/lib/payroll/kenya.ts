// Kenya statutory payroll constants & calculation engine (2024/2025 rates).
// Centralised so PayrollSetup, StaffSalaries and Payroll pages share one source.

export interface PayeBand { min: number; max: number | null; rate: number }
export interface NhifTier { min: number; max: number | null; amount: number }
export interface AllowanceType { id: number; name: string; defaultValue: number; taxable: boolean }
export interface DeductionType { id: number; name: string; defaultValue: number }

export const PAYE_BANDS: PayeBand[] = [
  { min: 0, max: 24000, rate: 0.10 },
  { min: 24001, max: 32333, rate: 0.25 },
  { min: 32334, max: 500000, rate: 0.30 },
  { min: 500001, max: 800000, rate: 0.325 },
  { min: 800001, max: null, rate: 0.35 },
];

export const NHIF_TIERS: NhifTier[] = [
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

export const NSSF_TIER1_LIMIT = 7000;
export const NSSF_TIER2_LIMIT = 36000;
export const NSSF_RATE = 0.06;
export const HOUSING_LEVY_RATE = 0.015;
export const PERSONAL_RELIEF = 2400;

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

export const computeNSSF = (gross: number) => {
  const tier1 = Math.min(gross, NSSF_TIER1_LIMIT) * NSSF_RATE;
  const tier2Base = Math.max(0, Math.min(gross, NSSF_TIER2_LIMIT) - NSSF_TIER1_LIMIT);
  const tier2 = tier2Base * NSSF_RATE;
  return Math.round(tier1 + tier2);
};

export const computeNHIF = (gross: number) => {
  const tier = NHIF_TIERS.find((t) => gross >= t.min && (t.max === null || gross <= t.max));
  return tier ? tier.amount : 0;
};

export const computeHousingLevy = (gross: number) => Math.round(gross * HOUSING_LEVY_RATE);

export const computePAYE = (taxableIncome: number) => {
  let remaining = taxableIncome;
  let tax = 0;
  for (const band of PAYE_BANDS) {
    if (remaining <= 0) break;
    const bandWidth = band.max === null ? remaining : Math.min(remaining, band.max - band.min + 1);
    tax += bandWidth * band.rate;
    remaining -= bandWidth;
  }
  return Math.max(0, Math.round(tax - PERSONAL_RELIEF));
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
): PayrollLine => {
  const gross = basic + taxableAllowances + nonTaxableAllowances;
  const nssf = computeNSSF(gross);
  const nhif = computeNHIF(gross);
  const housingLevy = computeHousingLevy(gross);
  // PAYE taxable income: gross minus non-taxable allowances minus NSSF (deductible)
  const taxable = gross - nonTaxableAllowances - nssf;
  const paye = computePAYE(Math.max(0, taxable));
  const totalDeductions = nssf + nhif + housingLevy + paye + otherDeductions;
  const net = gross - totalDeductions;
  return { basic, taxableAllowances, nonTaxableAllowances, gross, nssf, nhif, housingLevy, paye, otherDeductions, totalDeductions, net };
};

export const formatKES = (n: number) => `KES ${Math.round(n).toLocaleString()}`;