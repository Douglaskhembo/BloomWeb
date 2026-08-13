import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileCheck2,
  FileClock,
  FileText,
  History,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import FeeItemFormModal from "@/components/modal/FeeItemFormModal";
import { FeeItemFormValues } from "@/components/forms/FeeItemForm";
import Swal from "sweetalert2";
import { useAuth } from "@/context/AuthContext";
import Pagination from "@/utils/Pagination";
import { FeeApi, SchoolApi } from "@/services/api";
import { getBackendErrorMessage } from "@/utils/errorHandler";

const emptyForm: FeeItemFormValues = { name: "", grades: [], amount: 0, term: "Per Term", category: "OTHER", mandatory: true, active: true };
interface GradeLevelOption { uuid: string; name: string; active: boolean; }
const toGradeLevelOption = (raw: any): GradeLevelOption => ({
  uuid: raw.uuid,
  name: raw.name,
  active: raw.status === "ACTIVE",
});
const TERMS = ["Term 1", "Term 2", "Term 3", "Full Year"] as const;
// Which FeeItem billing cycles are eligible for each structure period — keeps a "Per Year" item
// from ever being enabled in more than one term's structure (it only ever fits the Full Year one).
const billingCycleFor = (period: string): string[] => (period === "Full Year" ? ["Per Year", "One-time"] : ["Per Term"]);
const WORKFLOW_TABS = ["maker", "approver", "approved"] as const;

type TermKey = (typeof TERMS)[number];
type WorkflowTab = (typeof WORKFLOW_TABS)[number];
type StructureStatus = "Draft" | "Pending Approval" | "Rejected" | "Approved";

interface GradeStatementLine {
  itemId: number;
  enabled: boolean;
  amount: number;
}

type GradeStatementMap = Record<string, Record<TermKey, GradeStatementLine[]>>;

interface FeeStructureRecord {
  id: string;
  version: number;
  academicYear: number;
  grade: string;
  term: TermKey;
  status: StructureStatus;
  lines: GradeStatementLine[];
  baseline: GradeStatementLine[];
  maker: string;
  submittedAt: string;
  updatedAt: string;
  note?: string;
  approver?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  dueDate?: string;
}

interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: "Saved Draft" | "Submitted" | "Approved" | "Rejected" | "Reworked";
  academicYear?: number;
  grade: string;
  term: TermKey;
  comment?: string;
}

const fmtDate = (iso: string) => new Date(iso).toLocaleString();

const CURRENT_YEAR = new Date().getFullYear();
const ACADEMIC_YEARS: number[] = Array.from({ length: 5 }, (_, idx) => CURRENT_YEAR + 1 - idx); // e.g. 2027..2023

// --- Map backend responses onto the frontend's existing shapes ---
const STATUS_FROM_BACKEND: Record<string, StructureStatus> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending Approval",
  REJECTED: "Rejected",
  APPROVED: "Approved",
};

const AUDIT_ACTION_FROM_BACKEND: Record<string, AuditEntry["action"]> = {
  SAVED_DRAFT: "Saved Draft",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  REWORKED: "Reworked",
};

const toFeeItem = (raw: any) => ({
  id: raw.id as number,
  name: raw.name as string,
  grades: (raw.gradeLevels ?? []).map((g: any) => g.name) as string[],
  amount: raw.amount as number,
  term: raw.term ?? "Per Term",
  category: raw.category ?? "OTHER",
  mandatory: raw.mandatory ?? true,
  active: Boolean(raw.active),
});

const toStructureRecord = (raw: any): FeeStructureRecord => ({
  id: raw.uuid,
  version: raw.version,
  academicYear: raw.academicYear,
  grade: raw.grade,
  term: raw.term as TermKey,
  status: STATUS_FROM_BACKEND[raw.status] ?? "Draft",
  lines: raw.lines ?? [],
  baseline: raw.baseline ?? [],
  maker: raw.maker as string,
  submittedAt: raw.submittedAt,
  updatedAt: raw.updatedAt,
  note: raw.note ?? undefined,
  approver: raw.approver ?? undefined,
  reviewedAt: raw.reviewedAt ?? undefined,
  rejectionReason: raw.rejectionReason ?? undefined,
  dueDate: raw.dueDate ?? undefined,
});

const toAuditEntry = (raw: any): AuditEntry => ({
  id: raw.uuid,
  at: raw.at,
  actor: raw.actor as string,
  action: AUDIT_ACTION_FROM_BACKEND[raw.action] ?? "Submitted",
  academicYear: raw.academicYear ?? undefined,
  grade: raw.grade,
  term: raw.term as TermKey,
  comment: raw.comment ?? undefined,
});

const FeeStructureSetupPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [feeItems, setFeeItems] = useState<ReturnType<typeof toFeeItem>[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevelOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FeeItemFormValues>(emptyForm);
  const gradeOptions = gradeLevels.filter((g) => g.active).map((g) => g.name);

  const [activeTab, setActiveTab] = useState<WorkflowTab>("maker");
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [selectedTerm, setSelectedTerm] = useState<TermKey>("Term 1");
  const [selectedYear, setSelectedYear] = useState<number>(CURRENT_YEAR);
  const [draftLines, setDraftLines] = useState<GradeStatementLine[] | null>(null);
  const [selectedDueDate, setSelectedDueDate] = useState("");
  const [editingRejectedId, setEditingRejectedId] = useState<string | null>(null);
  const [structures, setStructures] = useState<FeeStructureRecord[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [submitNote, setSubmitNote] = useState("");
  const [reviewing, setReviewing] = useState<FeeStructureRecord | null>(null);
  const [rejectFor, setRejectFor] = useState<FeeStructureRecord | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [selectedApprovedId, setSelectedApprovedId] = useState<string | null>(null);

  // Table filters
  const [approverSearch, setApproverSearch] = useState("");
  const [approverGrade, setApproverGrade] = useState<string>("all");
  const [approverYear, setApproverYear] = useState<string>("all");
  const [approverFrom, setApproverFrom] = useState("");
  const [approverTo, setApproverTo] = useState("");
  const [approvedSearch, setApprovedSearch] = useState("");
  const [approvedGrade, setApprovedGrade] = useState<string>("all");
  const [approvedYear, setApprovedYear] = useState<string>("all");
  const [approvedFrom, setApprovedFrom] = useState("");
  const [approvedTo, setApprovedTo] = useState("");
  const [rejectedSearch, setRejectedSearch] = useState("");
  const [draftSearch, setDraftSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [auditSearch, setAuditSearch] = useState("");

  // Table pagination
  const [rejectedPage, setRejectedPage] = useState(1);
  const [rejectedPerPage, setRejectedPerPage] = useState(10);
  const [itemsPage, setItemsPage] = useState(1);
  const [itemsPerPageCount, setItemsPerPageCount] = useState(10);
  const [draftsPage, setDraftsPage] = useState(1);
  const [draftsPerPage, setDraftsPerPage] = useState(10);
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingPerPage, setPendingPerPage] = useState(10);
  const [approvedPage, setApprovedPage] = useState(1);
  const [approvedPerPage, setApprovedPerPage] = useState(10);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPerPage, setAuditPerPage] = useState(10);

  const load = async () => {
    setLoading(true);
    try {
      const [items, rawStructures, rawAudit] = await Promise.all([
        FeeApi.getItems(),
        FeeApi.getStructures(),
        FeeApi.getStructureAudit(),
      ]);
      setFeeItems(items.map(toFeeItem));
      setStructures(rawStructures.map(toStructureRecord));
      setAudit(rawAudit.map(toAuditEntry));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
    SchoolApi.getGradeLevels().then((data) => setGradeLevels(data.map(toGradeLevelOption)));
  }, []);

  // Grade options load asynchronously — default the Maker Workspace to the first one once available.
  useEffect(() => {
    if (!selectedGrade && gradeOptions.length) setSelectedGrade(gradeOptions[0]);
  }, [gradeOptions, selectedGrade]);

  // Latest approved lines per grade/term, derived from the loaded structures.
  const liveMap = useMemo<GradeStatementMap>(() => {
    const map: GradeStatementMap = {};
    const approvedByAge = [...structures]
      .filter((record) => record.status === "Approved")
      .sort((a, b) => new Date(a.reviewedAt ?? a.updatedAt).getTime() - new Date(b.reviewedAt ?? b.updatedAt).getTime());
    for (const record of approvedByAge) {
      map[record.grade] = { ...(map[record.grade] ?? {}), [record.term]: record.lines } as Record<TermKey, GradeStatementLine[]>;
    }
    return map;
  }, [structures]);

  const currentUserName = user?.userName ?? "";
  const isMaker = user?.permissions?.includes("FEES_MANAGE") ?? false;
  const isApprover = user?.permissions?.includes("FEES_APPROVE") ?? false;
  const isReadOnly = !isMaker;

  // A fee item with no grades selected applies to all grades; otherwise it only applies where tagged.
  // Also period-scoped: a "Per Term" item only ever fits a Term 1/2/3 structure, and a "Per Year"/
  // "One-time" item only ever fits the Full Year structure — this is what stops an annual fee from
  // being enabled (and billed) in more than one term.
  const itemsForGrade = (grade: string, period: TermKey) => {
    const cycles = billingCycleFor(period);
    return feeItems.filter((item) => (item.grades.length === 0 || item.grades.includes(grade)) && cycles.includes(item.term));
  };

  const defaultLines = (grade: string, period: TermKey): GradeStatementLine[] =>
    itemsForGrade(grade, period).map((item) => ({ itemId: item.id, enabled: item.active, amount: item.amount }));

  const approvedLines = (grade: string, term: TermKey): GradeStatementLine[] => {
    const existing = liveMap[grade]?.[term];
    const gradeItems = itemsForGrade(grade, term);
    if (!existing?.length) return defaultLines(grade, term);

    const knownIds = new Set(existing.map((line) => line.itemId));
    return [
      ...existing.filter((line) => gradeItems.some((item) => item.id === line.itemId)),
      ...gradeItems.filter((item) => !knownIds.has(item.id)).map((item) => ({ itemId: item.id, enabled: false, amount: item.amount })),
    ];
  };

  const baseLines = useMemo(
    () => approvedLines(selectedGrade, selectedTerm),
    [liveMap, selectedGrade, selectedTerm, feeItems],
  );
  const currentLines = draftLines ?? baseLines;
  // For a grade/term with no approved structure yet, baseLines is just a synthetic default
  // (derived from currently-active fee items) — comparing against it would disable the button
  // the moment a maker's selection happens to match those defaults. In that case "dirty" should
  // mean "something is actually selected", not "differs from the synthetic default".
  const hasApprovedBaseline = Boolean(liveMap[selectedGrade]?.[selectedTerm]?.length);
  const hasSelection = currentLines.some((line) => line.enabled);
  const isDirty = Boolean(editingRejectedId) || (hasApprovedBaseline
    ? JSON.stringify(currentLines) !== JSON.stringify(baseLines)
    : hasSelection);
  const statementTotal = currentLines.filter((line) => line.enabled).reduce((sum, line) => sum + (Number(line.amount) || 0), 0);

  const pendingStructures = structures.filter((record) => record.status === "Pending Approval");
  const rejectedStructures = structures.filter((record) => record.status === "Rejected");
  const approvedStructures = structures.filter((record) => record.status === "Approved");
  const draftStructures = structures.filter((record) => record.status === "Draft");

  const inDateRange = (iso: string | undefined, from: string, to: string) => {
    if (!iso) return !from && !to;
    const time = new Date(iso).getTime();
    if (from && time < new Date(from).getTime()) return false;
    if (to && time > new Date(to).getTime() + 86_399_000) return false;
    return true;
  };

  const matchesText = (record: FeeStructureRecord, query: string) => {
    if (!query.trim()) return true;
    const haystack = `${record.grade} ${record.term} V${record.version} ${record.maker} ${record.approver ?? ""} ${record.note ?? ""}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  };

  const filteredPending = pendingStructures
    .filter((record) =>
      matchesText(record, approverSearch)
      && (approverGrade === "all" || record.grade === approverGrade)
      && (approverYear === "all" || record.academicYear === Number(approverYear))
      && inDateRange(record.submittedAt, approverFrom, approverTo)
    )
    .sort((a, b) => b.academicYear - a.academicYear || new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  const totalPendingPages = Math.ceil(filteredPending.length / pendingPerPage);
  const pagedPending = filteredPending.slice((pendingPage - 1) * pendingPerPage, pendingPage * pendingPerPage);

  const filteredApproved = approvedStructures
    .filter((record) =>
      matchesText(record, approvedSearch)
      && (approvedGrade === "all" || record.grade === approvedGrade)
      && (approvedYear === "all" || record.academicYear === Number(approvedYear))
      && inDateRange(record.reviewedAt ?? record.updatedAt, approvedFrom, approvedTo)
    )
    .sort((a, b) => b.academicYear - a.academicYear || new Date(b.reviewedAt ?? b.updatedAt).getTime() - new Date(a.reviewedAt ?? a.updatedAt).getTime());
  const totalApprovedPages = Math.ceil(filteredApproved.length / approvedPerPage);
  const pagedApproved = filteredApproved.slice((approvedPage - 1) * approvedPerPage, approvedPage * approvedPerPage);

  const filteredRejected = rejectedStructures.filter((record) => matchesText(record, rejectedSearch) || (record.rejectionReason ?? "").toLowerCase().includes(rejectedSearch.toLowerCase()));
  const totalRejectedPages = Math.ceil(filteredRejected.length / rejectedPerPage);
  const pagedRejected = filteredRejected.slice((rejectedPage - 1) * rejectedPerPage, rejectedPage * rejectedPerPage);

  const filteredDrafts = draftStructures.filter((record) => matchesText(record, draftSearch));
  const totalDraftsPages = Math.ceil(filteredDrafts.length / draftsPerPage);
  const pagedDrafts = filteredDrafts.slice((draftsPage - 1) * draftsPerPage, draftsPage * draftsPerPage);

  const gradeLabel = (grades: string[]) =>
    grades.length === 0 ? "All Grades" : grades.length === gradeOptions.length ? "All Grades" : grades.join(", ");

  const filteredItems = feeItems.filter((item) => {
    const q = itemSearch.trim().toLowerCase();
    if (!q) return true;
    return `${item.name} ${gradeLabel(item.grades)} ${item.term}`.toLowerCase().includes(q);
  });
  const totalItemsPages = Math.ceil(filteredItems.length / itemsPerPageCount);
  const pagedItems = filteredItems.slice((itemsPage - 1) * itemsPerPageCount, itemsPage * itemsPerPageCount);

  const visibleApprovedIds = new Set(filteredApproved.map((r) => r.id));
  const effectiveSelectedId = selectedApprovedId && visibleApprovedIds.has(selectedApprovedId) ? selectedApprovedId : filteredApproved[0]?.id;
  const selectedApprovedRecord = approvedStructures.find((r) => r.id === effectiveSelectedId) ?? null;

  const qAudit = auditSearch.trim().toLowerCase();
  const filteredAudit = !selectedApprovedRecord
    ? []
    : audit.filter((entry) => {
        const matchesStructure = entry.grade === selectedApprovedRecord.grade && entry.term === selectedApprovedRecord.term;
        if (!qAudit) return matchesStructure;
        return matchesStructure && `${entry.actor} ${entry.action} ${entry.comment ?? ""}`.toLowerCase().includes(qAudit);
      });
  const totalAuditPages = Math.ceil(filteredAudit.length / auditPerPage);
  const pagedAudit = filteredAudit.slice((auditPage - 1) * auditPerPage, auditPage * auditPerPage);

  const itemName = (id: number) => feeItems.find((item) => item.id === id)?.name ?? `Item #${id}`;
  const sumEnabled = (lines: GradeStatementLine[]) => lines.filter((line) => line.enabled).reduce((sum, line) => sum + (Number(line.amount) || 0), 0);

  const printApprovedStructure = (record: FeeStructureRecord) => {
    const enabled = record.lines.filter((l) => l.enabled);
    const total = sumEnabled(record.lines);
    const rowsHtml = enabled.map((l) => {
      const item = feeItems.find((it) => it.id === l.itemId);
      return `
      <tr>
        <td>${item?.name ?? `Item #${l.itemId}`}</td>
        <td>${item?.term ?? "Per Term"}</td>
        <td style="text-align:right">KES ${Number(l.amount || 0).toLocaleString()}</td>
      </tr>`;
    }).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"/>
      <title>Fee Structure - ${record.grade} ${record.term} V${record.version}</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;padding:32px;color:#111}
        h1{margin:0 0 4px;font-size:20px}
        h2{margin:0 0 16px;font-size:14px;color:#555;font-weight:normal}
        .meta{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;font-size:12px;margin:12px 0 20px;border:1px solid #ddd;padding:12px;border-radius:6px}
        .meta div span{color:#666;margin-right:6px}
        table{width:100%;border-collapse:collapse;font-size:13px}
        th,td{border:1px solid #ccc;padding:8px 10px;text-align:left}
        th{background:#f3f4f6}
        tfoot td{font-weight:bold;background:#f9fafb}
        .footer{margin-top:32px;font-size:11px;color:#666;display:flex;justify-content:space-between}
        @media print { .noprint{display:none} }
      </style></head><body>
      <h1>EduManager — Approved Fee Structure</h1>
      <h2>${record.grade} · ${record.term} · Academic Year ${record.academicYear} · Version ${record.version}</h2>
      <div class="meta">
        <div><span>Maker:</span>${record.maker}</div>
        <div><span>Approver:</span>${record.approver ?? "—"}</div>
        <div><span>Submitted:</span>${record.submittedAt ? fmtDate(record.submittedAt) : "—"}</div>
        <div><span>Approved On:</span>${record.reviewedAt ? fmtDate(record.reviewedAt) : "—"}</div>
        <div><span>Status:</span>${record.status}</div>
        <div><span>Reference:</span>${record.id}</div>
      </div>
      <table>
        <thead><tr><th>Fee Item</th><th>Billing Cycle</th><th style="text-align:right">Amount (KES)</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
        <tfoot><tr><td colspan="2">Total per ${record.term}</td><td style="text-align:right">KES ${total.toLocaleString()}</td></tr></tfoot>
      </table>
      ${record.note ? `<p style="margin-top:16px;font-size:12px"><strong>Note:</strong> ${record.note}</p>` : ""}
      <div class="footer"><span>Generated ${new Date().toLocaleString()}</span><span>EduManager</span></div>
      <script>window.onload=function(){setTimeout(function(){window.print();},250);};<\/script>
      </body></html>`;
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) { Swal.fire({ icon: "error", title: "Pop-up blocked", text: "Allow pop-ups to print the fee structure.", showConfirmButton: true }); return; }
    w.document.open(); w.document.write(html); w.document.close();
  };

  const diffLines = (base: GradeStatementLine[], next: GradeStatementLine[]) => {
    const baseMap = new Map(base.map((line) => [line.itemId, line]));
    const nextMap = new Map(next.map((line) => [line.itemId, line]));
    const ids = new Set<number>([...baseMap.keys(), ...nextMap.keys()]);

    return Array.from(ids).map((id) => {
      const before = baseMap.get(id);
      const after = nextMap.get(id);
      const beforeEnabled = Boolean(before?.enabled);
      const afterEnabled = Boolean(after?.enabled);
      let change: "Added" | "Removed" | "Amount Changed" | "No Change" = "No Change";

      if (beforeEnabled !== afterEnabled) change = afterEnabled ? "Added" : "Removed";
      else if (beforeEnabled && afterEnabled && before?.amount !== after?.amount) change = "Amount Changed";

      return { itemId: id, before, after, change };
    });
  };

  const updateLine = (itemId: number, patch: Partial<GradeStatementLine>) => {
    if (!isMaker || isReadOnly) return;
    setDraftLines(currentLines.map((line) => (line.itemId === itemId ? { ...line, ...patch } : line)));
  };

  const resetMakerForm = () => {
    setDraftLines(null);
    setEditingRejectedId(null);
    setSubmitNote("");
    setSelectedDueDate("");
  };

  const saveDraft = async () => {
    if (!isMaker) {
      Swal.fire({ icon: "error", title: "Maker access required", showConfirmButton: true });
      return;
    }
    try {
      await FeeApi.saveDraft({
        academicYear: selectedYear,
        grade: selectedGrade,
        term: selectedTerm,
        lines: currentLines,
        note: submitNote,
        dueDate: selectedDueDate || undefined,
      });
      Swal.fire({ title: "Success", text: `Draft saved — ${selectedGrade} · ${selectedTerm}`, icon: "success", showConfirmButton: true });
      await load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to save draft", text: getBackendErrorMessage(err), showConfirmButton: true });
    }
  };

  const openPreview = () => {
    if (!isMaker) {
      Swal.fire({ icon: "error", title: "Maker access required", text: "You need the FEES_MANAGE permission to prepare fee structures.", showConfirmButton: true });
      return;
    }
    if (!isDirty) {
      Swal.fire({ icon: "warning", title: "No fee structure changes to submit", showConfirmButton: true });
      return;
    }
    setPreviewOpen(true);
  };

  const submitForApproval = async () => {
    try {
      await FeeApi.submitStructure({
        academicYear: selectedYear,
        grade: selectedGrade,
        term: selectedTerm,
        lines: currentLines,
        note: submitNote,
        dueDate: selectedDueDate || undefined,
        reworkUuid: editingRejectedId ?? undefined,
      });
      setPreviewOpen(false);
      resetMakerForm();
      setActiveTab("approver");
      Swal.fire({ title: "Success", text: `Moved to approver — ${selectedGrade} · ${selectedTerm}`, icon: "success", showConfirmButton: true });
      await load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to submit", text: getBackendErrorMessage(err), showConfirmButton: true });
    }
  };

  const loadRejectedForEditing = (record: FeeStructureRecord) => {
    if (!isMaker) {
      Swal.fire({ icon: "error", title: "Maker access required", showConfirmButton: true });
      return;
    }
    setSelectedGrade(record.grade);
    setSelectedTerm(record.term);
    setDraftLines(record.lines);
    setEditingRejectedId(record.id);
    setSubmitNote(record.note ?? "");
    setSelectedDueDate(record.dueDate ?? "");
    setActiveTab("maker");
  };

  const approveStructure = async (record: FeeStructureRecord) => {
    if (!isApprover) {
      Swal.fire({ icon: "error", title: "Approver access required", showConfirmButton: true });
      return;
    }
    try {
      await FeeApi.approveStructure(record.id);
      setReviewing(null);
      setActiveTab("approved");
      Swal.fire({ title: "Success", text: `${record.grade} · ${record.term} is now live`, icon: "success", showConfirmButton: true });
      await load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to approve", text: getBackendErrorMessage(err), showConfirmButton: true });
    }
  };

  const confirmReject = async () => {
    if (!rejectFor || !rejectComment.trim()) return;
    if (!isApprover) {
      Swal.fire({ icon: "error", title: "Approver access required", showConfirmButton: true });
      return;
    }
    try {
      await FeeApi.rejectStructure(rejectFor.id, rejectComment);
      Swal.fire({ title: "Success", text: `Fee structure rejected — ${rejectFor.grade} · ${rejectFor.term}`, icon: "success", showConfirmButton: true });
      setRejectFor(null);
      setReviewing(null);
      setRejectComment("");
      setActiveTab("maker");
      await load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to reject", text: getBackendErrorMessage(err), showConfirmButton: true });
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (feeItem: typeof feeItems[number]) => {
    setEditingId(feeItem.id);
    setForm({ name: feeItem.name, grades: feeItem.grades, amount: feeItem.amount, term: feeItem.term, category: feeItem.category, mandatory: feeItem.mandatory, active: feeItem.active });
    setOpen(true);
  };

  const handleSubmit = async () => {
    const gradeLevelUuids = form.grades
      .map((name) => gradeLevels.find((g) => g.name === name)?.uuid)
      .filter((uuid): uuid is string => Boolean(uuid));
    const payload = { name: form.name, amount: form.amount, term: form.term, category: form.category, mandatory: form.mandatory, active: form.active, gradeLevelUuids };
    try {
      if (editingId !== null) {
        await FeeApi.updateItem(editingId, payload);
        Swal.fire({ title: "Success", text: "Fee item updated", icon: "success", showConfirmButton: true });
      } else {
        await FeeApi.createItem(payload);
        Swal.fire({ title: "Success", text: "Fee item added", icon: "success", showConfirmButton: true });
      }
      setOpen(false);
      await load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to save fee item", text: getBackendErrorMessage(err), showConfirmButton: true });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await FeeApi.deleteItem(id);
      Swal.fire({ title: "Success", text: "Fee item removed", icon: "success", showConfirmButton: true });
      await load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to delete fee item", text: getBackendErrorMessage(err), showConfirmButton: true });
    }
  };

  const toggleActive = async (id: number) => {
    try {
      await FeeApi.toggleItem(id);
      await load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to update fee item", text: getBackendErrorMessage(err), showConfirmButton: true });
    }
  };

  const renderStatusBadge = (status: StructureStatus) => {
    if (status === "Approved") return <Badge className="bg-success text-success-foreground">Approved</Badge>;
    if (status === "Rejected") return <Badge variant="destructive">Rejected</Badge>;
    if (status === "Pending Approval") return <Badge className="bg-warning text-warning-foreground">Pending Approval</Badge>;
    return <Badge variant="secondary">Draft</Badge>;
  };

  const renderStructureDiff = (record: FeeStructureRecord) => (
    <div className="max-h-[52vh] overflow-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fee Item</TableHead>
            <TableHead className="text-right">Current Approved</TableHead>
            <TableHead className="text-right">Proposed</TableHead>
            <TableHead>Change</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {diffLines(record.baseline, record.lines).map((row) => {
            const current = row.before?.enabled ? row.before.amount.toLocaleString() : "—";
            const proposed = row.after?.enabled ? row.after.amount.toLocaleString() : "—";
            return (
              <TableRow key={row.itemId} className={row.change !== "No Change" ? "bg-muted/40" : ""}>
                <TableCell className="font-medium">{itemName(row.itemId)}</TableCell>
                <TableCell className="text-right">{current}</TableCell>
                <TableCell className="text-right font-semibold">{proposed}</TableCell>
                <TableCell>{row.change === "No Change" ? <span className="text-xs text-muted-foreground">—</span> : <Badge variant="outline">{row.change}</Badge>}</TableCell>
              </TableRow>
            );
          })}
          <TableRow>
            <TableCell className="font-semibold">Total</TableCell>
            <TableCell className="text-right">KES {sumEnabled(record.baseline).toLocaleString()}</TableCell>
            <TableCell className="text-right font-bold text-primary">KES {sumEnabled(record.lines).toLocaleString()}</TableCell>
            <TableCell className="font-semibold">
              {(() => {
                const delta = sumEnabled(record.lines) - sumEnabled(record.baseline);
                return <span className={delta > 0 ? "text-success" : delta < 0 ? "text-destructive" : ""}>{delta >= 0 ? "+" : ""}{delta.toLocaleString()}</span>;
              })()}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/management")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Fee Structure</h1>
            <p className="text-muted-foreground">Create fee structures through Maker, Approver, and Approved stages.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            {isMaker && isApprover
              ? "Maker + Approver access"
              : isMaker
                ? "Maker access"
                : isApprover
                  ? "Approver access"
                  : "View-only access"}
          </div>
          <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4" /> Add Fee Item</Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-start gap-3 p-4">
            <FileText className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="font-semibold">1. Maker</p>
              <p className="text-sm text-muted-foreground">Prepare grade and term fee structures from active fee items.</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="flex items-start gap-3 p-4">
            <FileClock className="mt-0.5 h-5 w-5 text-warning" />
            <div>
              <p className="font-semibold">2. Approver</p>
              <p className="text-sm text-muted-foreground">Review proposed totals, approve, or reject with a reason.</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-success/30 bg-success/5">
          <CardContent className="flex items-start gap-3 p-4">
            <FileCheck2 className="mt-0.5 h-5 w-5 text-success" />
            <div>
              <p className="font-semibold">3. Approved</p>
              <p className="text-sm text-muted-foreground">Approved structures become the live fee history.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as WorkflowTab)} className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-3 lg:w-[560px]">
          <TabsTrigger value="maker" className="gap-2"><Pencil className="h-4 w-4" /> Maker</TabsTrigger>
          <TabsTrigger value="approver" className="gap-2"><ClipboardCheck className="h-4 w-4" /> Approver</TabsTrigger>
          <TabsTrigger value="approved" className="gap-2"><History className="h-4 w-4" /> Approved</TabsTrigger>
        </TabsList>

        <TabsContent value="maker" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <CardTitle className="text-lg">Maker Workspace</CardTitle>
                  <CardDescription>Select grade and term, build the fee structure, then move it to Approver.</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select value={String(selectedYear)} onValueChange={(value) => { setSelectedYear(Number(value)); setDraftLines(null); setEditingRejectedId(null); }}>
                    <SelectTrigger className="w-[150px]"><SelectValue placeholder="Academic Year" /></SelectTrigger>
                    <SelectContent>{ACADEMIC_YEARS.map((year) => <SelectItem key={year} value={String(year)}>Year {year}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={selectedGrade} onValueChange={(value) => { setSelectedGrade(value); setDraftLines(null); setEditingRejectedId(null); }}>
                    <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{gradeOptions.map((grade) => <SelectItem key={grade} value={grade}>{grade}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={selectedTerm} onValueChange={(value) => { setSelectedTerm(value as TermKey); setDraftLines(null); setEditingRejectedId(null); }}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{TERMS.map((term) => <SelectItem key={term} value={term}>{term}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input type="date" className="w-[150px]" value={selectedDueDate} onChange={(e) => setSelectedDueDate(e.target.value)} placeholder="Due date" />
                  {isDirty && <Button size="sm" variant="outline" onClick={resetMakerForm}><RotateCcw className="h-4 w-4" /> Clear</Button>}
                  <Button size="sm" variant="outline" disabled={!isMaker || !isDirty} onClick={saveDraft}><Save className="h-4 w-4" /> Save Draft</Button>
                  <Button size="sm" disabled={!isMaker || !isDirty} onClick={openPreview}><Send className="h-4 w-4" /> Preview & Submit</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {editingRejectedId && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
                  Editing a rejected fee structure. Update the lines and submit again for approval.
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 text-center">Include</TableHead>
                    <TableHead>Fee Item</TableHead>
                    <TableHead>Applicable Grades</TableHead>
                    <TableHead>Billing Cycle</TableHead>
                    <TableHead className="w-48 text-right">Amount (KES)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentLines.map((line) => {
                    const item = feeItems.find((feeItem) => feeItem.id === line.itemId);
                    if (!item) return null;
                    return (
                      <TableRow key={line.itemId}>
                        <TableCell className="text-center">
                          <Checkbox checked={line.enabled} disabled={!isMaker || isReadOnly} onCheckedChange={(checked) => updateLine(line.itemId, { enabled: Boolean(checked) })} />
                        </TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell><Badge variant="outline">{gradeLabel(item.grades)}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.term}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="h-9 text-right"
                            value={line.amount}
                            disabled={!line.enabled || !isMaker || isReadOnly}
                            onChange={(event) => updateLine(line.itemId, { amount: Number(event.target.value) })}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow>
                    <TableCell colSpan={4} className="text-right font-semibold">Total for {selectedGrade} · {selectedTerm}</TableCell>
                    <TableCell className="text-right font-bold text-primary">KES {statementTotal.toLocaleString()}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Rejected for Correction</CardTitle>
                <CardDescription>{rejectedStructures.length} fee structure(s) returned to Maker.</CardDescription>
              </CardHeader>
              <CardContent>
              <div className="mb-3 relative max-w-sm">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-8" placeholder="Search rejected..." value={rejectedSearch} onChange={(event) => { setRejectedSearch(event.target.value); setRejectedPage(1); }} />
              </div>
              {filteredRejected.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No rejected fee structures.</p>
                ) : (
                  <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Structure</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedRejected.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">{record.grade} · {record.term}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{record.rejectionReason}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" disabled={!isMaker} onClick={() => loadRejectedForEditing(record)}>
                              <Pencil className="h-4 w-4" /> Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Pagination currentPage={rejectedPage} totalPages={totalRejectedPages} onPageChange={setRejectedPage}
                    itemsPerPage={rejectedPerPage} onItemsPerPageChange={(v) => { setRejectedPerPage(v); setRejectedPage(1); }} />
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Master Fee Items</CardTitle>
                <CardDescription>{feeItems.filter((item) => item.active).length} active · {feeItems.length} total</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-3 relative max-w-sm">
                  <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-8" placeholder="Search fee items..." value={itemSearch} onChange={(event) => { setItemSearch(event.target.value); setItemsPage(1); }} />
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fee Item</TableHead>
                      <TableHead>Applicable Grades</TableHead>
                      <TableHead>Billing Cycle</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-center">Active</TableHead>
                      <TableHead className="w-24 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-sm">{gradeLabel(item.grades)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.term}</TableCell>
                        <TableCell className="text-right font-semibold">{item.amount.toLocaleString()}</TableCell>
                        <TableCell className="text-center"><Switch checked={item.active} onCheckedChange={() => toggleActive(item.id)} /></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Pagination currentPage={itemsPage} totalPages={totalItemsPages} onPageChange={setItemsPage}
                  itemsPerPage={itemsPerPageCount} onItemsPerPageChange={(v) => { setItemsPerPageCount(v); setItemsPage(1); }} />
              </CardContent>
            </Card>
          </div>

          {draftStructures.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Saved Drafts</CardTitle>
                <CardDescription>Drafts remain with Maker until submitted.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-3 relative max-w-sm">
                  <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-8" placeholder="Search drafts..." value={draftSearch} onChange={(event) => { setDraftSearch(event.target.value); setDraftsPage(1); }} />
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Structure</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Saved</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedDrafts.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.grade} · {record.term}</TableCell>
                        <TableCell>KES {sumEnabled(record.lines).toLocaleString()}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmtDate(record.updatedAt)}</TableCell>
                        <TableCell>{renderStatusBadge(record.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Pagination currentPage={draftsPage} totalPages={totalDraftsPages} onPageChange={setDraftsPage}
                  itemsPerPage={draftsPerPage} onItemsPerPageChange={(v) => { setDraftsPerPage(v); setDraftsPage(1); }} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="approver" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Approver Queue</CardTitle>
              <CardDescription>{filteredPending.length} of {pendingStructures.length} fee structure(s) awaiting approval.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-wrap items-end gap-2">
                <div className="relative min-w-[220px] flex-1">
                  <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-8" placeholder="Search grade, term, maker, note..." value={approverSearch} onChange={(event) => { setApproverSearch(event.target.value); setPendingPage(1); }} />
                </div>
                <Select value={approverGrade} onValueChange={(value) => { setApproverGrade(value); setPendingPage(1); }}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="Grade" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    {gradeOptions.map((grade) => <SelectItem key={grade} value={grade}>{grade}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={approverYear} onValueChange={(value) => { setApproverYear(value); setPendingPage(1); }}>
                  <SelectTrigger className="w-[150px]"><SelectValue placeholder="Select Year" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Select Year</SelectItem>
                    {ACADEMIC_YEARS.map((year) => <SelectItem key={year} value={String(year)}>Year {year}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex flex-col">
                  <label className="text-xs text-muted-foreground">From</label>
                  <Input type="date" className="w-[160px]" value={approverFrom} onChange={(event) => { setApproverFrom(event.target.value); setPendingPage(1); }} />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs text-muted-foreground">To</label>
                  <Input type="date" className="w-[160px]" value={approverTo} onChange={(event) => { setApproverTo(event.target.value); setPendingPage(1); }} />
                </div>
                {(approverSearch || approverGrade !== "all" || approverYear !== "all" || approverFrom || approverTo) && (
                  <Button variant="ghost" size="sm" onClick={() => { setApproverSearch(""); setApproverGrade("all"); setApproverYear("all"); setApproverFrom(""); setApproverTo(""); setPendingPage(1); }}>
                    <RotateCcw className="h-4 w-4" /> Reset
                  </Button>
                )}
              </div>
              {filteredPending.length === 0 ? (
                <p className="text-sm text-muted-foreground">No fee structures pending approval.</p>
              ) : (
                <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Structure</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Maker</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Proposed Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-64 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedPending.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.grade} · {record.term}</TableCell>
                        <TableCell><Badge variant="outline">{record.academicYear}</Badge></TableCell>
                        <TableCell><Badge variant="outline">{record.maker}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmtDate(record.submittedAt)}</TableCell>
                        <TableCell className="text-right font-semibold">KES {sumEnabled(record.lines).toLocaleString()}</TableCell>
                        <TableCell>{renderStatusBadge(record.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="outline" onClick={() => setReviewing(record)}><Eye className="h-4 w-4" /> View</Button>
                            <Button size="sm" variant="outline" disabled={!isApprover} onClick={() => approveStructure(record)}><CheckCircle2 className="h-4 w-4 text-success" /> Approve</Button>
                            <Button size="sm" variant="outline" disabled={!isApprover} onClick={() => { setRejectFor(record); setRejectComment(""); }}><XCircle className="h-4 w-4 text-destructive" /> Reject</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Pagination currentPage={pendingPage} totalPages={totalPendingPages} onPageChange={setPendingPage}
                  itemsPerPage={pendingPerPage} onItemsPerPageChange={(v) => { setPendingPerPage(v); setPendingPage(1); }} />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Approved Fee Structures History</CardTitle>
              <CardDescription>All approved versions remain available for review.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-wrap items-end gap-2">
                <div className="relative min-w-[220px] flex-1">
                  <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-8" placeholder="Search grade, term, version, approver..." value={approvedSearch} onChange={(event) => { setApprovedSearch(event.target.value); setApprovedPage(1); }} />
                </div>
                <Select value={approvedGrade} onValueChange={(value) => { setApprovedGrade(value); setApprovedPage(1); }}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="Grade" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    {gradeOptions.map((grade) => <SelectItem key={grade} value={grade}>{grade}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={approvedYear} onValueChange={(value) => { setApprovedYear(value); setApprovedPage(1); }}>
                  <SelectTrigger className="w-[150px]"><SelectValue placeholder="Select Year" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Select Year</SelectItem>
                    {ACADEMIC_YEARS.map((year) => <SelectItem key={year} value={String(year)}>Year {year}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex flex-col">
                  <label className="text-xs text-muted-foreground">Approved From</label>
                  <Input type="date" className="w-[160px]" value={approvedFrom} onChange={(event) => { setApprovedFrom(event.target.value); setApprovedPage(1); }} />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs text-muted-foreground">Approved To</label>
                  <Input type="date" className="w-[160px]" value={approvedTo} onChange={(event) => { setApprovedTo(event.target.value); setApprovedPage(1); }} />
                </div>
                {(approvedSearch || approvedGrade !== "all" || approvedYear !== "all" || approvedFrom || approvedTo) && (
                  <Button variant="ghost" size="sm" onClick={() => { setApprovedSearch(""); setApprovedGrade("all"); setApprovedYear("all"); setApprovedFrom(""); setApprovedTo(""); setApprovedPage(1); }}>
                    <RotateCcw className="h-4 w-4" /> Reset
                  </Button>
                )}
              </div>
              {filteredApproved.length === 0 ? (
                <p className="text-sm text-muted-foreground">No approved fee structures yet.</p>
              ) : (
                <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Version</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Grade / Term</TableHead>
                      <TableHead>Maker</TableHead>
                      <TableHead>Approver</TableHead>
                      <TableHead>Approved On</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedApproved.map((record) => (
                      <TableRow
                        key={record.id}
                        data-state={selectedApprovedRecord?.id === record.id ? "selected" : undefined}
                        onClick={() => { setSelectedApprovedId(record.id); setAuditPage(1); }}
                        className="cursor-pointer"
                      >
                        <TableCell className="font-semibold">V{record.version}</TableCell>
                        <TableCell><Badge variant="outline">{record.academicYear}</Badge></TableCell>
                        <TableCell className="font-medium">{record.grade} · {record.term}</TableCell>
                        <TableCell><Badge variant="outline">{record.maker}</Badge></TableCell>
                        <TableCell><Badge variant="outline">{record.approver}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{record.reviewedAt ? fmtDate(record.reviewedAt) : "—"}</TableCell>
                        <TableCell className="text-right font-semibold">KES {sumEnabled(record.lines).toLocaleString()}</TableCell>
                        <TableCell>{renderStatusBadge(record.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setReviewing(record); }}><Eye className="h-4 w-4" /> View</Button>
                            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); printApprovedStructure(record); }}><Printer className="h-4 w-4" /> Print</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Pagination currentPage={approvedPage} totalPages={totalApprovedPages} onPageChange={setApprovedPage}
                  itemsPerPage={approvedPerPage} onItemsPerPageChange={(v) => { setApprovedPerPage(v); setApprovedPage(1); }} />
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Audit Log{selectedApprovedRecord ? ` — ${selectedApprovedRecord.grade} · ${selectedApprovedRecord.term}` : ""}
              </CardTitle>
              <CardDescription>
                {selectedApprovedRecord
                  ? "Activity trail for the selected fee structure."
                  : "Select an approved fee structure to view its audit trail."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedApprovedRecord ? (
                <>
                  <div className="mb-3 relative max-w-sm">
                    <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-8" placeholder="Search this audit trail..." value={auditSearch} onChange={(event) => { setAuditSearch(event.target.value); setAuditPage(1); }} />
                  </div>
                  {filteredAudit.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No activity yet.</p>
                  ) : (
                    <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>When</TableHead>
                          <TableHead>Actor</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Fee Structure</TableHead>
                          <TableHead>Comment</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pagedAudit.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="text-xs text-muted-foreground">{fmtDate(entry.at)}</TableCell>
                            <TableCell><Badge variant="outline">{entry.actor}</Badge></TableCell>
                            <TableCell>{entry.action}</TableCell>
                            <TableCell className="font-medium">{entry.grade} · {entry.term}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{entry.comment || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Pagination currentPage={auditPage} totalPages={totalAuditPages} onPageChange={setAuditPage}
                      itemsPerPage={auditPerPage} onItemsPerPageChange={(v) => { setAuditPerPage(v); setAuditPage(1); }} />
                    </>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Select an approved fee structure to view its audit trail.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <FeeItemFormModal
        open={open}
        onOpenChange={setOpen}
        isEditing={editingId !== null}
        value={form}
        onChange={setForm}
        onSubmit={handleSubmit}
        gradeOptions={gradeOptions}
      />

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Preview Fee Structure</DialogTitle>
            <DialogDescription>{selectedGrade} · {selectedTerm} will move to the Approver queue after submission.</DialogDescription>
          </DialogHeader>
          {renderStructureDiff({
            id: editingRejectedId ?? "preview",
            version: 1,
            academicYear: selectedYear,
            grade: selectedGrade,
            term: selectedTerm,
            status: "Pending Approval",
            lines: currentLines,
            baseline: baseLines,
            maker: currentUserName,
            submittedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })}
          <div className="space-y-2">
            <label className="text-sm font-medium">Submission note</label>
            <Textarea rows={2} value={submitNote} onChange={(event) => setSubmitNote(event.target.value)} placeholder="Optional note for the approver" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Cancel</Button>
            <Button onClick={submitForApproval}><Send className="h-4 w-4" /> Submit to Approver</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(reviewing)} onOpenChange={(openDialog) => { if (!openDialog) setReviewing(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{reviewing?.grade} · {reviewing?.term}</DialogTitle>
            <DialogDescription>{reviewing && renderStatusBadge(reviewing.status)}</DialogDescription>
          </DialogHeader>
          {reviewing && renderStructureDiff(reviewing)}
          {reviewing?.note && <div className="rounded-md bg-muted p-3 text-sm"><span className="font-medium">Maker note: </span>{reviewing.note}</div>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewing(null)}>Close</Button>
            {reviewing?.status === "Pending Approval" && (
              <>
                <Button variant="outline" disabled={!isApprover} onClick={() => { setRejectFor(reviewing); setRejectComment(""); }}><XCircle className="h-4 w-4 text-destructive" /> Reject</Button>
                <Button disabled={!isApprover} onClick={() => approveStructure(reviewing)}><CheckCircle2 className="h-4 w-4" /> Approve</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(rejectFor)} onOpenChange={(openDialog) => { if (!openDialog) { setRejectFor(null); setRejectComment(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Fee Structure</DialogTitle>
            <DialogDescription>{rejectFor && `${rejectFor.grade} · ${rejectFor.term} will return to Maker for correction.`}</DialogDescription>
          </DialogHeader>
          <Textarea rows={4} value={rejectComment} onChange={(event) => setRejectComment(event.target.value)} placeholder="Reason for rejection (required)" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectFor(null)}>Cancel</Button>
            <Button variant="destructive" disabled={!rejectComment.trim()} onClick={confirmReject}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeeStructureSetupPage;