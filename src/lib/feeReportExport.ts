import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export interface FeeCollectionSummaryRow {
  grade: string;
  stream: string;
  expected: number;
  collected: number;
  balance: number;
  collectionPercent: number;
}

export interface FeeArrearsRow {
  admissionNumber: string;
  studentName: string;
  grade: string;
  stream: string;
  parentName: string | null;
  parentPhone: string | null;
  billed: number;
  paid: number;
  balance: number;
}

const money = (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

function exportPDF(title: string, headers: string[], rows: (string | number)[][]) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(title, 14, 14);
  doc.setFontSize(9);
  doc.text(`Generated ${new Date().toLocaleString()}`, 14, 20);
  autoTable(doc, { startY: 26, head: [headers], body: rows, styles: { fontSize: 8 } });
  doc.save(`${title}.pdf`);
}

function exportExcel(title: string, headers: string[], rows: (string | number)[][], sheetName: string) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${title}.xlsx`);
}

function exportCSV(title: string, headers: string[], rows: (string | number)[][]) {
  const lines = [headers.join(",")].concat(
    rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
  );
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${title}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

const SUMMARY_HEADERS = ["Grade", "Stream", "Expected", "Collected", "Balance", "Collection %"];
const summaryToRow = (r: FeeCollectionSummaryRow) => [
  r.grade, r.stream || "—", money(r.expected), money(r.collected), money(r.balance), `${r.collectionPercent.toFixed(1)}%`,
];

export function downloadFeeCollectionSummaryReport(format: "csv" | "excel" | "pdf", title: string, rows: FeeCollectionSummaryRow[]) {
  const body = rows.map(summaryToRow);
  if (format === "csv") exportCSV(title, SUMMARY_HEADERS, body);
  else if (format === "excel") exportExcel(title, SUMMARY_HEADERS, body, "Collection Summary");
  else exportPDF(title, SUMMARY_HEADERS, body);
}

const ARREARS_HEADERS = ["Admission No", "Student", "Grade", "Stream", "Parent", "Phone", "Billed", "Paid", "Balance"];
const arrearsToRow = (r: FeeArrearsRow) => [
  r.admissionNumber, r.studentName, r.grade, r.stream || "—", r.parentName ?? "—", r.parentPhone ?? "—",
  money(r.billed), money(r.paid), money(r.balance),
];

export function downloadFeeArrearsReport(format: "csv" | "excel" | "pdf", title: string, rows: FeeArrearsRow[]) {
  const body = rows.map(arrearsToRow);
  if (format === "csv") exportCSV(title, ARREARS_HEADERS, body);
  else if (format === "excel") exportExcel(title, ARREARS_HEADERS, body, "Arrears");
  else exportPDF(title, ARREARS_HEADERS, body);
}
