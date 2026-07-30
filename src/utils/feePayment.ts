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
  amount: Number(raw.amount) || 0,
  method: METHOD_FROM_BACKEND[raw.method] ?? "Cash",
  reference: raw.reference,
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

export const expectedForGrade = (grade: string, items: any[]) =>
  items
    .filter((it) => it.active && (!it.gradeLevels?.length || it.gradeLevels.some((g: any) => g.name === grade)))
    .reduce((a, it) => a + (Number(it.amount) || 0), 0);

/** Normalizes a raw `Student` API response, pre-computing what they're expected to pay this grade. */
export const toStudent = (raw: any, items: any[]): Student => ({
  id: raw.admissionNumber,
  admissionNo: raw.admissionNumber,
  name: `${raw.firstName ?? ""} ${raw.lastName ?? ""}`.trim(),
  birthCertificateNumber: raw.birthCertificateNumber ?? "",
  grade: raw.grade ?? "",
  stream: raw.stream ?? "",
  parent: raw.parentName ?? "",
  phone: raw.parentPhone ?? "",
  expected: expectedForGrade(raw.grade, items),
});

export interface StudentFeeAgg extends Student {
  paid: number;
  balance: number;
  status: "Cleared" | "Partial" | "Unpaid";
  lastDate?: string;
}

/** Per-student paid/balance, from CONFIRMED payments only (pending/rejected manual entries don't count yet). */
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
    const status = paid === 0 ? "Unpaid" : balance === 0 ? "Cleared" : "Partial";
    return { ...s, paid, balance, status: status as StudentFeeAgg["status"], lastDate: a.lastDate };
  });
}
