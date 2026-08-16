import type { Payment, Student } from "@/data/feesMock";

export const METHOD_FROM_BACKEND: Record<string, Payment["method"]> = {
  MPESA: "M-Pesa",
  BANK_TRANSFER: "Bank",
  CASH: "Cash",
  CHEQUE: "Cheque",
  CARD: "Card",
};

export const METHOD_TO_BACKEND: Record<Payment["method"], string> = {
  "M-Pesa": "MPESA",
  Bank: "BANK_TRANSFER",
  Cash: "CASH",
  Cheque: "CHEQUE",
  Card: "CARD",
};

const VERIFICATION_FROM_BACKEND: Record<string, NonNullable<Payment["verificationStatus"]>> = {
  CONFIRMED: "Confirmed",
  PENDING_VERIFICATION: "Pending Verification",
  REJECTED: "Rejected",
};

/** Normalizes a raw `FeePayment` API response into the frontend `Payment` shape. */
export const toPayment = (raw: any): Payment => ({
  id: String(raw.id ?? raw.uuid),
  studentId: raw.studentId,
  admissionUuid: raw.admissionUuid ?? undefined,
  studentName: raw.studentName ?? undefined,
  amount: Number(raw.amount) || 0,
  method: METHOD_FROM_BACKEND[raw.method] ?? "Cash",
  reference: raw.reference,
  receiptNumber: raw.receiptNumber ?? undefined,
  date: raw.paymentDate,
  source: raw.source === "MANUAL" ? "Manual" : "Streamed",
  verificationStatus: VERIFICATION_FROM_BACKEND[raw.verificationStatus] ?? "Confirmed",
  bankName: raw.bankName ?? undefined,
  slipOrChequeNumber: raw.slipOrChequeNumber ?? undefined,
  notes: raw.notes ?? undefined,
  recordedBy: raw.createdBy ?? undefined,
  verifiedBy: raw.verifiedBy ?? undefined,
  verifiedAt: raw.verifiedAt ?? undefined,
  rejectionReason: raw.rejectionReason ?? undefined,
});

/** A payment only counts toward what a student has paid once it's CONFIRMED — see [[fee_payment_manual_capture]] memory. */
export const isConfirmed = (p: Payment) => (p.verificationStatus ?? "Confirmed") === "Confirmed";

/** Resolves one active item's contribution to the annual total: a "Per Term" item sums its
 *  three terms (falling back to the flat `amount` per term where no override is set); anything
 *  else (Per Year/One-time) counts its flat `amount` once. Mirrors FeeService.resolveAmount(). */
const annualAmount = (item: any) => {
  if (item.term === "Per Term") {
    const perTerm = (override: unknown) => Number(override != null ? override : item.amount) || 0;
    return perTerm(item.term1Amount) + perTerm(item.term2Amount) + perTerm(item.term3Amount);
  }
  return Number(item.amount) || 0;
};

/** Term/year-blind fallback — sums every active FeeItem for a grade with no period scoping.
 *  Only meant for a grade that has never had an approved FeeStructure at all (see
 *  [[fee_payment_manual_capture]] memory); prefer `expectedFromCharges` everywhere else. */
export const expectedForGrade = (grade: string, items: any[]) =>
  items
    .filter((it) => it.active && (!it.gradeLevels?.length || it.gradeLevels.some((g: any) => g.name === grade)))
    .reduce((a, it) => a + annualAmount(it), 0);

/** Sums a student's persisted, eligibility-correct StudentFeeCharge rows (from FeeApi.getCurrentCharges). */
export const expectedFromCharges = (admissionNumber: string, charges: any[]) =>
  charges
    .filter((c) => c.admissionNumber === admissionNumber)
    .reduce((a, c) => a + (Number(c.amount) || 0), 0);

/** Normalizes a raw `Student` API response, pre-computing what they're expected to pay.
 *  Prefers the student's persisted fee charges; only falls back to the term/year-blind
 *  `expectedForGrade` catalog sum when their GRADE has never had any approved FeeStructure at
 *  all (no charges exist for anyone in that grade) — so a school that hasn't run every grade
 *  through the Maker/Approver workflow yet doesn't silently show KES 0 owed for those students. */
export const toStudent = (raw: any, charges: any[], items: any[] = []): Student => {
  const gradeHasApprovedStructure = charges.some((c) => c.grade === raw.grade);
  const expected = gradeHasApprovedStructure
    ? expectedFromCharges(raw.admissionNumber, charges)
    : expectedForGrade(raw.grade, items);
  return {
    id: raw.admissionNumber,
    admissionNo: raw.admissionNumber,
    name: `${raw.firstName ?? ""} ${raw.lastName ?? ""}`.trim(),
    birthCertificateNumber: raw.birthCertificateNumber ?? "",
    grade: raw.grade ?? "",
    stream: raw.stream ?? "",
    parent: raw.parentName ?? "",
    phone: raw.parentPhone ?? "",
    joinDate: raw.joinDate ?? undefined,
    expected,
  };
};

export interface StudentFeeAgg extends Student {
  paid: number;
  balance: number;
  /** Amount paid beyond what's expected — a real overpayment/credit, not just clamped away. */
  credit: number;
  status: "Cleared" | "Partial" | "Unpaid";
  lastDate?: string;
}

/** Per-student paid/balance/credit, from CONFIRMED payments only (pending/rejected manual entries
 *  don't count yet). `balance` and `credit` are never both positive — a student is either short,
 *  exactly even, or in credit. */
export function computeStudentAgg(students: Student[], confirmedPayments: Payment[]): StudentFeeAgg[] {
  const map = new Map<string, { paid: number; lastDate?: string }>();
  confirmedPayments.forEach((p) => {
    const cur = map.get(p.studentId) ?? { paid: 0 };
    cur.paid += p.amount;
    if (!cur.lastDate || p.date > cur.lastDate) cur.lastDate = p.date;
    map.set(p.studentId, cur);
  });
  return students.map((s) => {
    const a = map.get(s.id) ?? { paid: 0 };
    const paid = Math.min(a.paid, s.expected);
    const balance = Math.max(0, s.expected - paid);
    const credit = Math.max(0, a.paid - s.expected);
    const status = paid === 0 ? "Unpaid" : balance === 0 ? "Cleared" : "Partial";
    return { ...s, paid, balance, credit, status: status as StudentFeeAgg["status"], lastDate: a.lastDate };
  });
}

/** Renders the fee-standing line for a payment receipt — outstanding balance, overpayment credit
 *  (a real, admin/parent-visible fact, not just silently clamped to zero), or a fully-paid note.
 *  `undefined` means "not computed for this receipt" (skip the line entirely) rather than "zero". */
export const feeStandingHtml = (balance: number | undefined, credit: number | undefined): string => {
  if (balance === undefined && credit === undefined) return "";
  if ((credit ?? 0) > 0) {
    return `<p style="margin-top:14px;font-size:12.5px"><b>Credit Balance:</b> KES ${(credit as number).toLocaleString()} — overpaid; will be applied to future fees.</p>`;
  }
  if ((balance ?? 0) > 0) {
    return `<p style="margin-top:14px;font-size:12.5px"><b>Outstanding Balance (as of today):</b> KES ${(balance as number).toLocaleString()}</p>`;
  }
  return `<p style="margin-top:14px;font-size:12.5px"><b>Balance:</b> KES 0 — fully paid, no arrears.</p>`;
};
