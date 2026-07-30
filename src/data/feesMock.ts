export type PaymentMethod = "M-Pesa" | "Bank" | "Cash" | "Card" | "Cheque";
export type FeeStatus = "Cleared" | "Partial" | "Unpaid";

export interface Student {
  id: string;
  admissionNo: string;
  name: string;
  birthCertificateNumber?: string;
  grade: string;
  stream: string;
  parent: string;
  phone: string;
  expected: number;
}

export type PaymentSource = "Manual" | "Streamed";
export type VerificationStatus = "Confirmed" | "Pending Verification" | "Rejected";

export interface Payment {
  id: string;
  studentId: string;
  amount: number;
  method: PaymentMethod;
  reference: string;
  date: string; // ISO
  source?: PaymentSource;
  verificationStatus?: VerificationStatus;
  bankName?: string;
  slipOrChequeNumber?: string;
  notes?: string;
  recordedBy?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
}

export const GRADES = [
  "PP1", "PP2", "Grade 1", "Grade 2", "Grade 3",
  "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9",
];

export const STREAMS = ["North", "South", "East", "West"];
export const METHODS: PaymentMethod[] = ["M-Pesa", "Bank", "Cash", "Card", "Cheque"];
export const ROLES = ["Administrator", "Bursar/Accounts", "Principal", "Auditor"] as const;
export type Role = (typeof ROLES)[number];

const FIRST = ["Brian","Faith","Kevin","Mercy","James","Lucy","Samuel","Diana","Peter","Grace","Anne","John","Mary","Daniel","Esther","Paul","Ruth","Joseph","Hannah","Mark","Naomi","Caleb","Tabitha","Eric","Joyce","Victor","Beatrice","Allan","Cynthia","Dennis"];
const LAST = ["Kamau","Wanjiru","Ochieng","Akinyi","Mwangi","Chebet","Kiprop","Nyambura","Otieno","Wambui","Mutiso","Kariuki","Njoroge","Atieno","Mutua","Wafula","Cherono","Onyango","Maina","Kibet"];
const PARENTS = ["Mr. Kamau","Mrs. Wanjiru","Mr. Ochieng","Mrs. Akinyi","Mrs. Mwangi","Mr. Chebet","Mr. Kiprop","Mrs. Nyambura","Mr. Otieno","Mrs. Wambui"];

function rnd(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}
const r = rnd(42);

function pick<T>(arr: T[]) { return arr[Math.floor(r() * arr.length)]; }
function phone() {
  const n = Math.floor(r() * 9000000) + 1000000;
  return `07${String(n).slice(0,8)}`;
}

export const students: Student[] = Array.from({ length: 80 }, (_, i) => {
  const grade = pick(GRADES);
  const baseFee = 30000 + GRADES.indexOf(grade) * 2500;
  return {
    id: `STU-${String(i + 1).padStart(3, "0")}`,
    admissionNo: `ADM/${2026}/${String(1000 + i)}`,
    name: `${pick(FIRST)} ${pick(LAST)}`,
    grade,
    stream: pick(STREAMS),
    parent: pick(PARENTS),
    phone: phone(),
    expected: baseFee,
  };
});

function randomDateInLast(days: number) {
  const now = Date.now();
  return new Date(now - Math.floor(r() * days * 86400000)).toISOString();
}

let pmtCounter = 0;
function nextRef(method: PaymentMethod) {
  pmtCounter += 1;
  const codes: Record<PaymentMethod, string> = {
    "M-Pesa": "QKL", Bank: "BNK", Cash: "CSH", Card: "CRD", Cheque: "CHQ",
  };
  return `${codes[method]}${Date.now().toString(36).toUpperCase()}${pmtCounter}`;
}

export const initialPayments: Payment[] = (() => {
  const out: Payment[] = [];
  students.forEach((s, idx) => {
    const numPayments = Math.floor(r() * 4); // 0..3
    for (let i = 0; i < numPayments; i++) {
      const amt = Math.floor((s.expected / 4) * (0.5 + r())) ;
      const method = pick(METHODS);
      out.push({
        id: `P-${idx}-${i}-${Math.floor(r() * 10000)}`,
        studentId: s.id,
        amount: Math.min(amt, s.expected),
        method,
        reference: nextRef(method),
        date: randomDateInLast(90),
      });
    }
  });
  return out.sort((a, b) => b.date.localeCompare(a.date));
})();

export function generateRandomPayment(): Payment {
  const s = students[Math.floor(Math.random() * students.length)];
  const method = METHODS[Math.floor(Math.random() * METHODS.length)];
  const amt = Math.floor(2000 + Math.random() * 15000);
  return {
    id: `P-LIVE-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    studentId: s.id,
    amount: amt,
    method,
    reference: nextRef(method),
    date: new Date().toISOString(),
  };
}
