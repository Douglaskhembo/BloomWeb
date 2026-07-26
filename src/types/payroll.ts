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
  category: "nssf" | "housing_levy" | "shif" | "other";
  value: number;
  maxAmount: number | null;
  /** Floor on the computed amount, e.g. SHIF's KES 300 minimum. */
  minAmount: number | null;
  /** Lower bound subtracted from gross before applying the percentage, e.g. NSSF Tier II
   *  only taxing the excess above the Tier I ceiling. */
  thresholdAmount: number | null;
  employerContribution: boolean;
  employerValue: number;
  active: boolean;
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