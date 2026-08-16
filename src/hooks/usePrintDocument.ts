import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { SchoolApi } from "@/services/api";

export const escapeHtml = (value: unknown): string =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

const PRINT_STYLES = `
  @page { size: A4; margin: 16mm 14mm; }
  *{box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,Helvetica,sans-serif;padding:0;color:#1a1a1a;font-size:13px;line-height:1.4}
  .letterhead{display:flex;align-items:center;gap:16px}
  .logo{width:64px;height:64px;object-fit:contain;flex-shrink:0}
  .logo-placeholder{width:64px;height:64px;flex-shrink:0}
  .school-block{flex:1;text-align:center}
  .school-name{font-size:22px;font-weight:800;letter-spacing:0.5px;text-transform:uppercase;color:#111}
  .school-reg{font-size:11px;color:#666;margin-top:2px}
  .school-line{font-size:11px;color:#555;margin-top:2px}
  .letterhead-rule{height:3px;background:linear-gradient(90deg,#111 0%,#111 70%,#999 100%);margin:12px 0 18px}
  .doc-title{text-align:center;margin-bottom:18px}
  .doc-title h1{margin:0;font-size:16px;letter-spacing:1px;text-transform:uppercase;font-weight:700}
  .doc-title h2{margin:4px 0 0;font-size:13px;color:#444;font-weight:600}
  .meta{display:grid;grid-template-columns:1fr 1fr;gap:5px 24px;font-size:11.5px;margin:0 0 20px;border:1px solid #ddd;background:#fafafa;padding:12px 14px;border-radius:6px}
  .meta div span{color:#666;margin-right:6px}
  .section{margin-bottom:20px}
  .section-head{display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #111;padding-bottom:4px;margin-bottom:8px}
  .section-head>span:first-child{font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.3px}
  .section-meta{font-size:10.5px;color:#666}
  .empty{font-size:12px;color:#888;font-style:italic;margin:0 0 8px}
  table{width:100%;border-collapse:collapse;font-size:12.5px}
  thead th{background:#111;color:#fff;padding:8px 10px;text-align:left;font-weight:600}
  tbody td{padding:7px 10px;border-bottom:1px solid #e5e5e5}
  tbody tr:nth-child(even){background:#f7f7f7}
  tfoot td{font-weight:700;background:#f0f0f0;padding:8px 10px;border-top:2px solid #111}
  .grand{margin-top:10px;padding:12px 16px;border:2px solid #111;border-radius:6px;display:flex;justify-content:space-between;align-items:center;font-size:15px;font-weight:800}
  .note{margin-top:16px;font-size:11.5px;background:#fafafa;border:1px solid #ddd;border-radius:6px;padding:10px 12px}
  .signatures{margin-top:40px;display:flex;justify-content:space-between;gap:40px}
  .signatures .sig{flex:1;text-align:center}
  .signatures .sig-line{border-top:1px solid #333;margin-bottom:6px;padding-top:6px;font-size:11px;color:#555}
  .footer{margin-top:32px;padding-top:10px;border-top:1px solid #ddd;font-size:10px;color:#888;display:flex;justify-content:space-between}
  @media print { .noprint{display:none} }
`;

/** Shared print chrome for every finance-facing document (fee structures, statements, receipts) —
 *  a proper letterhead (logo, school name, registration/contact details from School Setup) plus
 *  one stylesheet, so every printed document looks the same instead of each page hand-rolling
 *  its own header. */
export function usePrintDocument() {
  const [schoolInfo, setSchoolInfo] = useState<any>({});

  useEffect(() => {
    SchoolApi.getInfo().then((data) => setSchoolInfo(data ?? {})).catch(() => {});
  }, []);

  const letterheadHtml = () => {
    const addressLine = [schoolInfo.physicalAddress, schoolInfo.postalAddress, schoolInfo.county].filter(Boolean).map(escapeHtml).join(" · ");
    const contactLine = [schoolInfo.phone, schoolInfo.email, schoolInfo.website].filter(Boolean).map(escapeHtml).join("  ·  ");
    return `
      <div class="letterhead">
        ${schoolInfo.logoUrl ? `<img class="logo" src="${escapeHtml(schoolInfo.logoUrl)}" alt="School logo" />` : `<div class="logo logo-placeholder"></div>`}
        <div class="school-block">
          <div class="school-name">${escapeHtml(schoolInfo.name || "School Name")}</div>
          ${schoolInfo.registrationNumber ? `<div class="school-reg">Reg. No. ${escapeHtml(schoolInfo.registrationNumber)}</div>` : ""}
          ${addressLine ? `<div class="school-line">${addressLine}</div>` : ""}
          ${contactLine ? `<div class="school-line">${contactLine}</div>` : ""}
        </div>
      </div>
      <div class="letterhead-rule"></div>`;
  };

  const openPrintDocument = (title: string, bodyHtml: string, footerNote = "This is a system-generated document — for billing queries contact the school finance office.") => {
    const html = `<!doctype html><html><head><meta charset="utf-8"/>
      <title>${escapeHtml(title)}</title>
      <style>${PRINT_STYLES}</style></head><body>
      ${letterheadHtml()}
      ${bodyHtml}
      <div class="footer"><span>${escapeHtml(footerNote)}</span><span>Printed ${new Date().toLocaleString()}</span></div>
      <script>window.onload=function(){setTimeout(function(){window.print();},250);};<\/script>
      </body></html>`;
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) { Swal.fire({ icon: "error", title: "Pop-up blocked", text: "Allow pop-ups to print this document.", showConfirmButton: true }); return; }
    w.document.open(); w.document.write(html); w.document.close();
  };

  return { schoolInfo, escapeHtml, openPrintDocument };
}
