export interface TaxBracket {
  id: number;
  minAmount: number;
  maxAmount: number | null;
  rate: number;
}

export interface StatutoryDeduction {
  id: number;
  name: string;
  type: "percentage" | "tiered" | "fixed";
  value: number;
  maxAmount: number | null;
  employerContribution: boolean;
  employerValue: number;
  active: boolean;
}

export interface NHIFTier {
  id: number;
  minSalary: number;
  maxSalary: number | null;
  amount: number;
}

export interface AllowanceType {
  id: number;
  name: string;
  type: "fixed" | "percentage";
  defaultValue: number;
  taxable: boolean;
  active: boolean;
}

export interface OtherDeduction {
  id: number;
  name: string;
  type: "fixed" | "percentage";
  defaultValue: number;
  mandatory: boolean;
  active: boolean;
}