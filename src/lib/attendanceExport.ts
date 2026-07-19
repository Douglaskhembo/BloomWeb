import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export interface AttendanceRow {
  ownerRef: string;
  ownerName: string;
  attendanceDate: string;
  clockInOrEntry: string | null;
  clockOutOrExit: string | null;
  deviceId: string | null;
  eventType: string;
  status: string;
  remarks: string | null;
}

const fmtTime = (v: string | null) => (v ? new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—");

const HEADERS = ["Ref", "Name", "Date", "In / Entry", "Out / Exit", "Device", "Status", "Remarks"];

const toRow = (r: AttendanceRow) => [
  r.ownerRef, r.ownerName, r.attendanceDate, fmtTime(r.clockInOrEntry), fmtTime(r.clockOutOrExit),
  r.deviceId ?? "—", r.status, r.remarks ?? "",
];

export function exportAttendancePDF(title: string, rows: AttendanceRow[]) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(title, 14, 14);
  doc.setFontSize(9);
  doc.text(`Generated ${new Date().toLocaleString()}`, 14, 20);
  autoTable(doc, {
    startY: 26,
    head: [HEADERS],
    body: rows.map(toRow),
    styles: { fontSize: 8 },
  });
  doc.save(`${title}.pdf`);
}

export function exportAttendanceExcel(title: string, rows: AttendanceRow[]) {
  const ws = XLSX.utils.json_to_sheet(rows.map((r) => ({
    Ref: r.ownerRef, Name: r.ownerName, Date: r.attendanceDate,
    "In / Entry": fmtTime(r.clockInOrEntry), "Out / Exit": fmtTime(r.clockOutOrExit),
    Device: r.deviceId ?? "", Status: r.status, Remarks: r.remarks ?? "",
  })));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Attendance");
  XLSX.writeFile(wb, `${title}.xlsx`);
}

export function exportAttendanceCSV(title: string, rows: AttendanceRow[]) {
  const lines = [HEADERS.join(",")].concat(
    rows.map((r) => toRow(r).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
  );
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${title}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function downloadAttendanceReport(format: "csv" | "excel" | "pdf", title: string, rows: AttendanceRow[]) {
  if (format === "csv") exportAttendanceCSV(title, rows);
  else if (format === "excel") exportAttendanceExcel(title, rows);
  else exportAttendancePDF(title, rows);
}
