import { useMemo, useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { GRADES } from "@/data/feesMock";

const initialItems = [
  { id: 1, name: "Tuition Fee", grade: "All Grades", amount: 30000, term: "Per Term", active: true },
  { id: 2, name: "Activity Fee", grade: "All Grades", amount: 8000, term: "Per Term", active: true },
  { id: 3, name: "Transport Fee", grade: "All Grades", amount: 7000, term: "Per Term", active: true },
  { id: 4, name: "Lunch Program", grade: "All Grades", amount: 12000, term: "Per Term", active: true },
  { id: 5, name: "Exam Fee", grade: "Grade 7-9", amount: 3000, term: "Per Term", active: true },
  { id: 6, name: "Boarding Fee", grade: "Grade 7-9", amount: 25000, term: "Per Term", active: false },
];

const emptyForm: FeeItemFormValues = { name: "", grade: "All Grades", amount: 0, term: "Per Term", active: true };
const TERMS = ["Term 1", "Term 2", "Term 3"] as const;
const WORKFLOW_TABS = ["maker", "approver", "approved"] as const;
const ROLES = ["Maker", "Approver", "Administrator", "Auditor"] as const;

type TermKey = (typeof TERMS)[number];
type Role = (typeof ROLES)[number];
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
  maker: Role;
  submittedAt: string;
  updatedAt: string;
  note?: string;
  approver?: Role;
  reviewedAt?: string;
  rejectionReason?: string;
}

interface AuditEntry {
  id: string;
  at: string;
  actor: Role;
  action: "Saved Draft" | "Submitted" | "Approved" | "Rejected" | "Reworked";
  academicYear?: number;
  grade: string;
  term: TermKey;
  comment?: string;
}

const fmtDate = (iso: string) => new Date(iso).toLocaleString();

const CURRENT_YEAR = new Date().getFullYear();
const ACADEMIC_YEARS: number[] = Array.from({ length: 5 }, (_, idx) => CURRENT_YEAR + 1 - idx); // e.g. 2027..2023

const buildLines = (overrides: Partial<Record<number, { enabled?: boolean; amount?: number }>> = {}): GradeStatementLine[] =>
  initialItems.map((item) => ({
    itemId: item.id,
    enabled: overrides[item.id]?.enabled ?? item.active,
    amount: overrides[item.id]?.amount ?? item.amount,
  }));

const isoDaysAgo = (days: number, hour = 9) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

// --- Seed mock data so Approver and Approved tabs are not empty on first load ---
const approvedGrade3Term1Lines = buildLines({ 5: { enabled: false }, 6: { enabled: false } });
const approvedGrade3Term1: FeeStructureRecord = {
  id: "FS-APR-0001",
  version: 1,
  academicYear: CURRENT_YEAR - 1,
  grade: "Grade 3",
  term: "Term 1",
  status: "Approved",
  lines: approvedGrade3Term1Lines,
  baseline: buildLines({ 1: { amount: 28000 }, 5: { enabled: false }, 6: { enabled: false } }),
  maker: "Maker",
  submittedAt: isoDaysAgo(14),
  updatedAt: isoDaysAgo(12, 11),
  approver: "Approver",
  reviewedAt: isoDaysAgo(12, 11),
  note: "Annual tuition adjustment for Grade 3, Term 1.",
};

const approvedGrade7Term1Lines = buildLines({ 6: { enabled: true, amount: 25000 } });
const approvedGrade7Term1: FeeStructureRecord = {
  id: "FS-APR-0002",
  version: 2,
  academicYear: CURRENT_YEAR - 1,
  grade: "Grade 7",
  term: "Term 1",
  status: "Approved",
  lines: approvedGrade7Term1Lines,
  baseline: buildLines({ 6: { enabled: false } }),
  maker: "Maker",
  submittedAt: isoDaysAgo(8),
  updatedAt: isoDaysAgo(7, 14),
  approver: "Administrator",
  reviewedAt: isoDaysAgo(7, 14),
  note: "Enable Boarding Fee for Grade 7 Term 1.",
};

const pendingGrade4Term2Lines = buildLines({ 1: { amount: 32000 }, 4: { amount: 13500 } });
const pendingGrade4Term2: FeeStructureRecord = {
  id: "FS-PEN-0001",
  version: 1,
  academicYear: CURRENT_YEAR,
  grade: "Grade 4",
  term: "Term 2",
  status: "Pending Approval",
  lines: pendingGrade4Term2Lines,
  baseline: buildLines({ 5: { enabled: false }, 6: { enabled: false } }),
  maker: "Maker",
  submittedAt: isoDaysAgo(2, 10),
  updatedAt: isoDaysAgo(2, 10),
  note: "Term 2 tuition uplift and lunch programme cost review.",
};

const pendingGrade8Term2Lines = buildLines({ 1: { amount: 34000 }, 5: { amount: 4000 }, 6: { enabled: true } });
const pendingGrade8Term2: FeeStructureRecord = {
  id: "FS-PEN-0002",
  version: 3,
  academicYear: CURRENT_YEAR,
  grade: "Grade 8",
  term: "Term 2",
  status: "Pending Approval",
  lines: pendingGrade8Term2Lines,
  baseline: buildLines({ 6: { enabled: true, amount: 25000 } }),
  maker: "Administrator",
  submittedAt: isoDaysAgo(1, 15),
  updatedAt: isoDaysAgo(1, 15),
  note: "Exam fee uplift and confirm boarding fee for senior class.",
};

const seedStructures: FeeStructureRecord[] = [
  pendingGrade8Term2,
  pendingGrade4Term2,
  approvedGrade7Term1,
  approvedGrade3Term1,
];

const seedLiveMap: GradeStatementMap = {
  "Grade 3": { "Term 1": approvedGrade3Term1Lines } as Record<TermKey, GradeStatementLine[]>,
  "Grade 7": { "Term 1": approvedGrade7Term1Lines } as Record<TermKey, GradeStatementLine[]>,
};

const seedAudit: AuditEntry[] = [
  { id: "AUD-1001", at: isoDaysAgo(14), actor: "Maker", action: "Submitted", grade: "Grade 3", term: "Term 1", comment: "Initial Grade 3 Term 1 structure." },
  { id: "AUD-1002", at: isoDaysAgo(12, 11), actor: "Approver", action: "Approved", grade: "Grade 3", term: "Term 1" },
  { id: "AUD-1003", at: isoDaysAgo(8), actor: "Maker", action: "Submitted", grade: "Grade 7", term: "Term 1", comment: "Add boarding fee for Grade 7." },
  { id: "AUD-1004", at: isoDaysAgo(7, 14), actor: "Administrator", action: "Approved", grade: "Grade 7", term: "Term 1" },
  { id: "AUD-1005", at: isoDaysAgo(2, 10), actor: "Maker", action: "Submitted", grade: "Grade 4", term: "Term 2", comment: "Term 2 tuition uplift." },
  { id: "AUD-1006", at: isoDaysAgo(1, 15), actor: "Administrator", action: "Submitted", grade: "Grade 8", term: "Term 2", comment: "Exam fee uplift." },
];

const FeeStructureSetupPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [feeItems, setFeeItems] = useState(initialItems);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FeeItemFormValues>(emptyForm);

  const [activeTab, setActiveTab] = useState<WorkflowTab>("maker");
  const [role, setRole] = useState<Role>("Maker");
  const [selectedGrade, setSelectedGrade] = useState<string>(GRADES[0]);
  const [selectedTerm, setSelectedTerm] = useState<TermKey>("Term 1");
  const [selectedYear, setSelectedYear] = useState<number>(CURRENT_YEAR);
  const [liveMap, setLiveMap] = useState<GradeStatementMap>(seedLiveMap);
  const [draftLines, setDraftLines] = useState<GradeStatementLine[] | null>(null);
  const [editingRejectedId, setEditingRejectedId] = useState<string | null>(null);
  const [structures, setStructures] = useState<FeeStructureRecord[]>(seedStructures);
  const [audit, setAudit] = useState<AuditEntry[]>(seedAudit);
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

  const isMaker = role === "Maker" || role === "Administrator";
  const isApprover = role === "Approver" || role === "Administrator";
  const isReadOnly = role === "Auditor";

  const defaultLines = (): GradeStatementLine[] =>
    feeItems.map((item) => ({ itemId: item.id, enabled: item.active, amount: item.amount }));

  const approvedLines = (grade: string, term: TermKey): GradeStatementLine[] => {
    const existing = liveMap[grade]?.[term];
    if (!existing?.length) return defaultLines();

    const knownIds = new Set(existing.map((line) => line.itemId));
    return [
      ...existing.filter((line) => feeItems.some((item) => item.id === line.itemId)),
      ...feeItems.filter((item) => !knownIds.has(item.id)).map((item) => ({ itemId: item.id, enabled: false, amount: item.amount })),
    ];
  };

  const baseLines = useMemo(
    () => approvedLines(selectedGrade, selectedTerm),
    [liveMap, selectedGrade, selectedTerm, feeItems],
  );
  const currentLines = draftLines ?? baseLines;
  const isDirty = JSON.stringify(currentLines) !== JSON.stringify(baseLines) || Boolean(editingRejectedId);
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
  const filteredApproved = approvedStructures
    .filter((record) =>
      matchesText(record, approvedSearch)
      && (approvedGrade === "all" || record.grade === approvedGrade)
      && (approvedYear === "all" || record.academicYear === Number(approvedYear))
      && inDateRange(record.reviewedAt ?? record.updatedAt, approvedFrom, approvedTo)
    )
    .sort((a, b) => b.academicYear - a.academicYear || new Date(b.reviewedAt ?? b.updatedAt).getTime() - new Date(a.reviewedAt ?? a.updatedAt).getTime());
  const filteredRejected = rejectedStructures.filter((record) => matchesText(record, rejectedSearch) || (record.rejectionReason ?? "").toLowerCase().includes(rejectedSearch.toLowerCase()));
  const filteredDrafts = draftStructures.filter((record) => matchesText(record, draftSearch));
  const filteredItems = feeItems.filter((item) => {
    const q = itemSearch.trim().toLowerCase();
    if (!q) return true;
    return `${item.name} ${item.grade} ${item.term}`.toLowerCase().includes(q);
  });
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
    if (!w) { toast({ title: "Pop-up blocked", description: "Allow pop-ups to print the fee structure.", variant: "destructive" }); return; }
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

  const addAudit = (entry: Omit<AuditEntry, "id" | "at">) => {
    setAudit((previous) => [{ id: `AUD-${Date.now()}`, at: new Date().toISOString(), ...entry }, ...previous]);
  };

  const updateLine = (itemId: number, patch: Partial<GradeStatementLine>) => {
    if (!isMaker || isReadOnly) return;
    setDraftLines(currentLines.map((line) => (line.itemId === itemId ? { ...line, ...patch } : line)));
  };

  const resetMakerForm = () => {
    setDraftLines(null);
    setEditingRejectedId(null);
    setSubmitNote("");
  };

  const saveDraft = () => {
    if (!isMaker) {
      toast({ title: "Maker access required", variant: "destructive" });
      return;
    }

    const now = new Date().toISOString();
    const record: FeeStructureRecord = {
      id: `FS-${Date.now()}`,
      version: approvedStructures.filter((item) => item.grade === selectedGrade && item.term === selectedTerm).length + 1,
      academicYear: selectedYear,
      grade: selectedGrade,
      term: selectedTerm,
      status: "Draft",
      lines: currentLines,
      baseline: baseLines,
      maker: role,
      submittedAt: now,
      updatedAt: now,
      note: submitNote,
    };

    setStructures((previous) => [record, ...previous]);
    addAudit({ actor: role, action: "Saved Draft", grade: selectedGrade, term: selectedTerm, comment: submitNote });
    toast({ title: "Draft saved", description: `${selectedGrade} · ${selectedTerm}` });
  };

  const openPreview = () => {
    if (!isMaker) {
      toast({ title: "Maker access required", description: "Switch to Maker or Administrator to prepare fee structures.", variant: "destructive" });
      return;
    }
    if (!isDirty) {
      toast({ title: "No fee structure changes to submit" });
      return;
    }
    setPreviewOpen(true);
  };

  const submitForApproval = () => {
    const now = new Date().toISOString();
    const record: FeeStructureRecord = {
      id: editingRejectedId ?? `FS-${Date.now()}`,
      version: approvedStructures.filter((item) => item.grade === selectedGrade && item.term === selectedTerm).length + 1,
      academicYear: selectedYear,
      grade: selectedGrade,
      term: selectedTerm,
      status: "Pending Approval",
      lines: currentLines,
      baseline: baseLines,
      maker: role,
      submittedAt: now,
      updatedAt: now,
      note: submitNote,
    };

    setStructures((previous) => [record, ...previous.filter((item) => item.id !== record.id)]);
    addAudit({ actor: role, action: editingRejectedId ? "Reworked" : "Submitted", grade: selectedGrade, term: selectedTerm, comment: submitNote });
    setPreviewOpen(false);
    resetMakerForm();
    setActiveTab("approver");
    toast({ title: "Moved to approver", description: `${record.grade} · ${record.term}` });
  };

  const loadRejectedForEditing = (record: FeeStructureRecord) => {
    if (!isMaker) {
      toast({ title: "Maker access required", variant: "destructive" });
      return;
    }
    setSelectedGrade(record.grade);
    setSelectedTerm(record.term);
    setDraftLines(record.lines);
    setEditingRejectedId(record.id);
    setSubmitNote(record.note ?? "");
    setActiveTab("maker");
  };

  const approveStructure = (record: FeeStructureRecord) => {
    if (!isApprover) {
      toast({ title: "Approver access required", variant: "destructive" });
      return;
    }

    setLiveMap((previous) => ({
      ...previous,
      [record.grade]: {
        ...(previous[record.grade] ?? {}),
        [record.term]: record.lines,
      } as Record<TermKey, GradeStatementLine[]>,
    }));

    setStructures((previous) => previous.map((item) => (
      item.id === record.id
        ? { ...item, status: "Approved", approver: role, reviewedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        : item
    )));
    addAudit({ actor: role, action: "Approved", grade: record.grade, term: record.term });
    setReviewing(null);
    setActiveTab("approved");
    toast({ title: "Fee structure approved", description: `${record.grade} · ${record.term} is now live` });
  };

  const confirmReject = () => {
    if (!rejectFor || !rejectComment.trim()) return;
    if (!isApprover) {
      toast({ title: "Approver access required", variant: "destructive" });
      return;
    }

    setStructures((previous) => previous.map((item) => (
      item.id === rejectFor.id
        ? { ...item, status: "Rejected", approver: role, reviewedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), rejectionReason: rejectComment }
        : item
    )));
    addAudit({ actor: role, action: "Rejected", grade: rejectFor.grade, term: rejectFor.term, comment: rejectComment });
    toast({ title: "Fee structure rejected", description: `${rejectFor.grade} · ${rejectFor.term}` });
    setRejectFor(null);
    setReviewing(null);
    setRejectComment("");
    setActiveTab("maker");
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (feeItem: typeof feeItems[number]) => {
    setEditingId(feeItem.id);
    setForm({ name: feeItem.name, grade: feeItem.grade, amount: feeItem.amount, term: feeItem.term, active: feeItem.active });
    setOpen(true);
  };

  const handleSubmit = () => {
    if (editingId !== null) {
      setFeeItems((previous) => previous.map((item) => (item.id === editingId ? { ...item, ...form } : item)));
      toast({ title: "Fee item updated" });
    } else {
      setFeeItems((previous) => [...previous, { id: Math.max(0, ...previous.map((item) => item.id)) + 1, ...form }]);
      toast({ title: "Fee item added" });
    }
    setOpen(false);
  };

  const handleDelete = (id: number) => {
    setFeeItems((previous) => previous.filter((item) => item.id !== id));
    toast({ title: "Fee item removed" });
  };

  const toggleActive = (id: number) => {
    setFeeItems((previous) => previous.map((item) => (item.id === id ? { ...item, active: !item.active } : item)));
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
          <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-1.5">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <Select value={role} onValueChange={(value) => setRole(value as Role)}>
              <SelectTrigger className="h-8 w-[150px] border-0 bg-transparent px-0"><SelectValue /></SelectTrigger>
              <SelectContent>{ROLES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
            </Select>
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
                    <SelectContent>{GRADES.map((grade) => <SelectItem key={grade} value={grade}>{grade}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={selectedTerm} onValueChange={(value) => { setSelectedTerm(value as TermKey); setDraftLines(null); setEditingRejectedId(null); }}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{TERMS.map((term) => <SelectItem key={term} value={term}>{term}</SelectItem>)}</SelectContent>
                  </Select>
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
                        <TableCell><Badge variant="outline">{item.grade}</Badge></TableCell>
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
                <Input className="pl-8" placeholder="Search rejected..." value={rejectedSearch} onChange={(event) => setRejectedSearch(event.target.value)} />
              </div>
              {filteredRejected.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No rejected fee structures.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Structure</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRejected.map((record) => (
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
                  <Input className="pl-8" placeholder="Search fee items..." value={itemSearch} onChange={(event) => setItemSearch(event.target.value)} />
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fee Item</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-center">Active</TableHead>
                      <TableHead className="w-24 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-muted-foreground">{item.grade} · {item.term}</div>
                        </TableCell>
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
                  <Input className="pl-8" placeholder="Search drafts..." value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} />
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
                    {filteredDrafts.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.grade} · {record.term}</TableCell>
                        <TableCell>KES {sumEnabled(record.lines).toLocaleString()}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmtDate(record.updatedAt)}</TableCell>
                        <TableCell>{renderStatusBadge(record.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                  <Input className="pl-8" placeholder="Search grade, term, maker, note..." value={approverSearch} onChange={(event) => setApproverSearch(event.target.value)} />
                </div>
                <Select value={approverGrade} onValueChange={setApproverGrade}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="Grade" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    {GRADES.map((grade) => <SelectItem key={grade} value={grade}>{grade}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={approverYear} onValueChange={setApproverYear}>
                  <SelectTrigger className="w-[150px]"><SelectValue placeholder="Select Year" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Select Year</SelectItem>
                    {ACADEMIC_YEARS.map((year) => <SelectItem key={year} value={String(year)}>Year {year}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex flex-col">
                  <label className="text-xs text-muted-foreground">From</label>
                  <Input type="date" className="w-[160px]" value={approverFrom} onChange={(event) => setApproverFrom(event.target.value)} />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs text-muted-foreground">To</label>
                  <Input type="date" className="w-[160px]" value={approverTo} onChange={(event) => setApproverTo(event.target.value)} />
                </div>
                {(approverSearch || approverGrade !== "all" || approverYear !== "all" || approverFrom || approverTo) && (
                  <Button variant="ghost" size="sm" onClick={() => { setApproverSearch(""); setApproverGrade("all"); setApproverYear("all"); setApproverFrom(""); setApproverTo(""); }}>
                    <RotateCcw className="h-4 w-4" /> Reset
                  </Button>
                )}
              </div>
              {filteredPending.length === 0 ? (
                <p className="text-sm text-muted-foreground">No fee structures pending approval.</p>
              ) : (
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
                    {filteredPending.map((record) => (
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
                  <Input className="pl-8" placeholder="Search grade, term, version, approver..." value={approvedSearch} onChange={(event) => setApprovedSearch(event.target.value)} />
                </div>
                <Select value={approvedGrade} onValueChange={setApprovedGrade}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="Grade" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    {GRADES.map((grade) => <SelectItem key={grade} value={grade}>{grade}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={approvedYear} onValueChange={setApprovedYear}>
                  <SelectTrigger className="w-[150px]"><SelectValue placeholder="Select Year" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Select Year</SelectItem>
                    {ACADEMIC_YEARS.map((year) => <SelectItem key={year} value={String(year)}>Year {year}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex flex-col">
                  <label className="text-xs text-muted-foreground">Approved From</label>
                  <Input type="date" className="w-[160px]" value={approvedFrom} onChange={(event) => setApprovedFrom(event.target.value)} />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs text-muted-foreground">Approved To</label>
                  <Input type="date" className="w-[160px]" value={approvedTo} onChange={(event) => setApprovedTo(event.target.value)} />
                </div>
                {(approvedSearch || approvedGrade !== "all" || approvedYear !== "all" || approvedFrom || approvedTo) && (
                  <Button variant="ghost" size="sm" onClick={() => { setApprovedSearch(""); setApprovedGrade("all"); setApprovedYear("all"); setApprovedFrom(""); setApprovedTo(""); }}>
                    <RotateCcw className="h-4 w-4" /> Reset
                  </Button>
                )}
              </div>
              {filteredApproved.length === 0 ? (
                <p className="text-sm text-muted-foreground">No approved fee structures yet.</p>
              ) : (
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
                    {filteredApproved.map((record) => (
                      <TableRow
                        key={record.id}
                        data-state={selectedApprovedRecord?.id === record.id ? "selected" : undefined}
                        onClick={() => setSelectedApprovedId(record.id)}
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
                    <Input className="pl-8" placeholder="Search this audit trail..." value={auditSearch} onChange={(event) => setAuditSearch(event.target.value)} />
                  </div>
                  {filteredAudit.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No activity yet.</p>
                  ) : (
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
                        {filteredAudit.map((entry) => (
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
            maker: role,
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