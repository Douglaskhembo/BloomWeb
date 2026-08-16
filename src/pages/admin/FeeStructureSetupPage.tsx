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
import { usePrintDocument } from "@/hooks/usePrintDocument";

const emptyForm: FeeItemFormValues = {
  name: "", grades: [], amount: 0, term: "Per Term", term1Amount: "", term2Amount: "", term3Amount: "",
  category: "OTHER", mandatory: true, active: true,
};
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
// The Maker Workspace also allows an "all" sentinel on grade/term purely to preview every fee
// item at once — a submittable structure is still always exactly one grade + one term.
type TermSelection = TermKey | "all";
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
  term1Amount: raw.term1Amount ?? undefined,
  term2Amount: raw.term2Amount ?? undefined,
  term3Amount: raw.term3Amount ?? undefined,
  category: raw.category ?? "OTHER",
  mandatory: raw.mandatory ?? true,
  active: Boolean(raw.active),
});

/** "Per Term" items can carry a per-term default override; everything else (and any unset
 *  override) falls back to the item's flat `amount`. Mirrors FeeService.resolveAmount(). */
const resolveAmount = (item: ReturnType<typeof toFeeItem>, period: TermKey): number => {
  if (item.term === "Per Term") {
    const perTerm = period === "Term 1" ? item.term1Amount : period === "Term 2" ? item.term2Amount : period === "Term 3" ? item.term3Amount : undefined;
    if (perTerm != null) return perTerm;
  }
  return item.amount;
};

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

  const { escapeHtml, openPrintDocument } = usePrintDocument();
  const [feeItems, setFeeItems] = useState<ReturnType<typeof toFeeItem>[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevelOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FeeItemFormValues>(emptyForm);
  const gradeOptions = gradeLevels.filter((g) => g.active).map((g) => g.name);

  const [activeTab, setActiveTab] = useState<WorkflowTab>("maker");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [selectedTerm, setSelectedTerm] = useState<TermSelection>("all");
  const [selectedYear, setSelectedYear] = useState<number>(CURRENT_YEAR);
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
  // In-flight guards — stop a double-click (or a slow network round trip) from firing the same
  // submit/approve/reject request twice, which was creating duplicate pending approvals.
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [isBulkActing, setIsBulkActing] = useState(false);

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
  // Set when a maker jumps from "Rejected for Correction" into Master Fee Items — narrows the
  // items list down to exactly what that rejected structure touched, so there's no guessing which
  // item(s) need fixing before resubmitting.
  const [masterItemsFocus, setMasterItemsFocus] = useState<{ grade: string; term: TermKey; itemIds: Set<number> } | null>(null);
  const [itemsSubTab, setItemsSubTab] = useState<"items" | "rejected">("items");

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

  // Which grade/term combos already have a submission sitting with the Approver — used to stop
  // the Maker Workspace from looking like a fresh, resubmittable slate for something that's
  // already out of the maker's hands (it should only come back once rejected).
  const pendingMap = useMemo(() => {
    const map: Record<string, Partial<Record<TermKey, FeeStructureRecord>>> = {};
    for (const record of structures) {
      if (record.status !== "Pending Approval") continue;
      map[record.grade] = { ...(map[record.grade] ?? {}), [record.term]: record };
    }
    return map;
  }, [structures]);

  const currentUserName = user?.userName ?? "";
  const isMaker = user?.permissions?.includes("FEES_MANAGE") ?? false;
  const isApprover = user?.permissions?.includes("FEES_APPROVE") ?? false;
  // A submittable structure record is still always exactly one grade + one term on the backend,
  // so "all" fans out into one record per matching grade×term combo rather than a single record.
  const isAllGrades = selectedGrade === "all";
  const isAllTerms = selectedTerm === "all";
  const isAllScope = isAllGrades || isAllTerms;
  const targetGrades = isAllGrades ? gradeOptions : [selectedGrade];
  const targetTerms: TermKey[] = isAllTerms ? [...TERMS] : [selectedTerm as TermKey];

  // If the exact grade+term already has a submission sitting with the Approver, the workspace
  // must not look like a resubmittable slate for it — that's what let makers unknowingly create
  // duplicate pending submissions. Only a rejected structure should come back to the maker
  // (prepareRejectedResubmit already sets editingRejectedId for that).
  const pendingRecord = !isAllScope ? pendingMap[selectedGrade]?.[selectedTerm as TermKey] : undefined;
  const isLockedPending = Boolean(pendingRecord) && !editingRejectedId;

  // A fee item with no grades selected applies to all grades; otherwise it only applies where tagged.
  // Also period-scoped: a "Per Term" item only ever fits a Term 1/2/3 structure, and a "Per Year"/
  // "One-time" item only ever fits the Full Year structure — this is what stops an annual fee from
  // being enabled (and billed) in more than one term.
  const itemsForGrade = (grade: string, period: TermKey) => {
    const cycles = billingCycleFor(period);
    return feeItems.filter((item) => (item.grades.length === 0 || item.grades.includes(grade)) && cycles.includes(item.term));
  };

  const defaultLines = (grade: string, period: TermKey): GradeStatementLine[] =>
    itemsForGrade(grade, period).map((item) => ({ itemId: item.id, enabled: item.active, amount: resolveAmount(item, period) }));

  const approvedLines = (grade: string, term: TermKey): GradeStatementLine[] => {
    const existing = liveMap[grade]?.[term];
    const gradeItems = itemsForGrade(grade, term);
    if (!existing?.length) return defaultLines(grade, term);

    const knownIds = new Set(existing.map((line) => line.itemId));
    return [
      ...existing.filter((line) => gradeItems.some((item) => item.id === line.itemId)),
      ...gradeItems.filter((item) => !knownIds.has(item.id)).map((item) => ({ itemId: item.id, enabled: false, amount: resolveAmount(item, term) })),
    ];
  };

  // Union of every item eligible in at least one target grade×term combo — the editable master
  // row set when "all" is in play. Same grade/cycle rules itemsForGrade() applies per-combo.
  const scopedItems = useMemo(() => {
    if (!isAllScope) return [];
    return feeItems.filter((item) => {
      const gradeMatches = isAllGrades || item.grades.length === 0 || item.grades.includes(selectedGrade);
      const termMatches = isAllTerms || billingCycleFor(selectedTerm as TermKey).includes(item.term);
      return gradeMatches && termMatches;
    });
  }, [feeItems, isAllScope, isAllGrades, isAllTerms, selectedGrade, selectedTerm]);

  // In "all" scope there's no single approved baseline to diff against — each combo gets its
  // own baseline when fanned out — so start from each item's own active flag and flat amount.
  const scopedBaseLines = useMemo<GradeStatementLine[]>(
    () => scopedItems.map((item) => ({ itemId: item.id, enabled: item.active, amount: item.amount })),
    [scopedItems],
  );

  // What was last approved for this grade/term — the comparison target for "is there anything
  // new to submit", not something the maker edits.
  const baseLines = useMemo(
    () => (isAllScope ? scopedBaseLines : approvedLines(selectedGrade, selectedTerm as TermKey)),
    [liveMap, selectedGrade, selectedTerm, feeItems, isAllScope, scopedBaseLines],
  );
  // The Maker Workspace is read-only — it can only show what Master Fee Items currently says for
  // this grade/term (active flag, applicable grades, per-term amount). There's no maker-side
  // override anymore; to change what gets submitted, change it in Master Fee Items and it shows
  // up here automatically. While locked on a pending combo, show exactly what was submitted instead.
  const currentLines = isLockedPending ? pendingRecord!.lines : (isAllScope ? scopedBaseLines : defaultLines(selectedGrade, selectedTerm as TermKey));
  // For a grade/term with no approved structure yet (or "all" scope), baseLines is just a
  // synthetic default (derived from currently-active fee items) — comparing against it would
  // disable the button the moment Master Fee Items happens to match those defaults. In that
  // case "dirty" should mean "something is actually selected", not "differs from the default".
  const hasApprovedBaseline = !isAllScope && Boolean(liveMap[selectedGrade]?.[selectedTerm as TermKey]?.length);
  const hasSelection = currentLines.some((line) => line.enabled);
  const isDirty = !isLockedPending && (Boolean(editingRejectedId) || (hasApprovedBaseline
    ? JSON.stringify(currentLines) !== JSON.stringify(baseLines)
    : hasSelection));
  const statementTotal = currentLines.filter((line) => line.enabled).reduce((sum, line) => sum + (Number(line.amount) || 0), 0);

  // Active, grade-applicable fee items that simply never show up above because their own billing
  // cycle (Per Year / One-time) doesn't match a per-term structure, or vice versa (a "Per Term"
  // item won't show under Full Year either) — itemsForGrade()/billingCycleFor() silently filters
  // these out. That silence is exactly what makes "why is Exam Fee missing from Term 2" so
  // confusing: the item exists, is active, applies to this grade — it's just configured for a
  // different cycle. Surfaced here so it's a visible, fixable mismatch instead of a silent gap.
  const excludedByCycle = useMemo(() => {
    if (isAllScope) return [];
    const cycles = billingCycleFor(selectedTerm as TermKey);
    return feeItems.filter((item) =>
      item.active
      && (item.grades.length === 0 || item.grades.includes(selectedGrade))
      && !cycles.includes(item.term),
    );
  }, [feeItems, isAllScope, selectedGrade, selectedTerm]);

  // A "Per Term" item's amount can only be shown as one concrete-term figure at a time. Once
  // "All Terms" fans a single row out across Term 1/2/3, that one row shows the per-term
  // breakdown instead of a single (necessarily ambiguous) figure.
  const isAmbiguousPerTermAmount = (item: ReturnType<typeof toFeeItem>) => isAllTerms && item.term === "Per Term";

  // A combo already pending approval is skipped entirely — it must not be silently resubmitted
  // as a duplicate; it only comes back to the maker if the approver rejects it. A combo that's
  // identical to what's already live/approved is skipped too — resubmitting an unchanged
  // structure just spins up a pointless new approval cycle for nothing the approver hasn't
  // already signed off on.
  const bulkCombos = useMemo(() => {
    if (!isAllScope) return [];
    return targetGrades
      .flatMap((grade) => targetTerms.map((term) => ({ grade, term, lines: defaultLines(grade, term) })))
      .filter((combo) => combo.lines.some((line) => line.enabled))
      .filter((combo) => !pendingMap[combo.grade]?.[combo.term])
      // Only diff against what's live when this combo actually has an approved baseline —
      // approvedLines() falls back to defaultLines() when there's none, which would otherwise
      // always equal combo.lines and silently drop every never-approved combo (e.g. a first-time
      // "All Grades × All Terms" setup where nothing has been approved anywhere yet).
      .filter((combo) => {
        const hasBaseline = Boolean(liveMap[combo.grade]?.[combo.term]?.length);
        return !hasBaseline || JSON.stringify(combo.lines) !== JSON.stringify(approvedLines(combo.grade, combo.term));
      });
  }, [isAllScope, targetGrades, targetTerms, feeItems, pendingMap, liveMap]);
  const bulkGrandTotal = bulkCombos.reduce((sum, combo) => sum + combo.lines.filter((l) => l.enabled).reduce((s, l) => s + (Number(l.amount) || 0), 0), 0);
  // isDirty alone doesn't mean much in "all" scope (it just means something is selected, not that
  // any combo actually differs from what's pending/approved) — bulkCombos is the real signal there
  // since it's already filtered down to only what would actually be built. Drives the Save
  // Draft/Preview & Submit buttons so they're only clickable when there's something to act on.
  const hasSubmittableChanges = isAllScope ? bulkCombos.length > 0 : isDirty;
  const bulkPendingSkipped = useMemo(() => {
    if (!isAllScope) return 0;
    return targetGrades.flatMap((grade) => targetTerms.map((term) => Boolean(pendingMap[grade]?.[term]))).filter(Boolean).length;
  }, [isAllScope, targetGrades, targetTerms, pendingMap]);
  // Combos with enabled lines that aren't skipped for being pending, but still didn't make the
  // cut — i.e. unchanged from what's already approved.
  const bulkUnchangedSkipped = useMemo(() => {
    if (!isAllScope) return 0;
    return targetGrades
      .flatMap((grade) => targetTerms.map((term) => ({ grade, term, lines: defaultLines(grade, term) })))
      .filter((combo) => combo.lines.some((line) => line.enabled))
      .filter((combo) => !pendingMap[combo.grade]?.[combo.term])
      .filter((combo) => JSON.stringify(combo.lines) === JSON.stringify(approvedLines(combo.grade, combo.term)))
      .length;
  }, [isAllScope, targetGrades, targetTerms, feeItems, pendingMap, liveMap]);

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
    if (masterItemsFocus && !masterItemsFocus.itemIds.has(item.id)) return false;
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

  // Grade → Term → line-item breakdown for the bulk preview: each combo's items with their
  // amount, a term subtotal, a grade subtotal across its terms, and (via bulkGrandTotal) the
  // overall total — so reviewing a big "all grades/terms" submission reads like a statement
  // instead of a flat list of counts.
  const bulkGroupedByGrade = useMemo(() => {
    if (!isAllScope) return [];
    return targetGrades
      .map((grade) => {
        const combos = bulkCombos.filter((combo) => combo.grade === grade);
        return { grade, combos, gradeTotal: combos.reduce((sum, combo) => sum + sumEnabled(combo.lines), 0) };
      })
      .filter((group) => group.combos.length > 0);
  }, [isAllScope, targetGrades, bulkCombos]);

  // Proposed/approved totals across whatever the Approver/Approved filters currently match —
  // "All Grades" included, since filteredPending/filteredApproved already apply every active filter.
  const filteredPendingTotal = filteredPending.reduce((sum, record) => sum + sumEnabled(record.lines), 0);
  const filteredApprovedTotal = filteredApproved.reduce((sum, record) => sum + sumEnabled(record.lines), 0);

  const printFeeStructure = (title: string, bodyHtml: string) =>
    openPrintDocument(title, bodyHtml, "This is a system-generated fee statement — for billing queries contact the school finance office.");

  const printApprovedStructure = (record: FeeStructureRecord) => {
    const enabled = record.lines.filter((l) => l.enabled);
    const total = sumEnabled(record.lines);
    const rowsHtml = enabled.map((l) => {
      const item = feeItems.find((it) => it.id === l.itemId);
      return `
      <tr>
        <td>${escapeHtml(item?.name ?? `Item #${l.itemId}`)}</td>
        <td>${escapeHtml(item?.term ?? "Per Term")}</td>
        <td style="text-align:right">KES ${Number(l.amount || 0).toLocaleString()}</td>
      </tr>`;
    }).join("");
    const body = `
      <div class="doc-title">
        <h1>Fee Structure Statement</h1>
        <h2>${escapeHtml(record.grade)} · ${escapeHtml(record.term)} · Academic Year ${record.academicYear}</h2>
      </div>
      <div class="meta">
        <div><span>Version:</span>V${record.version}</div>
        <div><span>Status:</span>${escapeHtml(record.status)}</div>
        <div><span>Approved On:</span>${record.reviewedAt ? fmtDate(record.reviewedAt) : "—"}</div>
        <div><span>Approved By:</span>${escapeHtml(record.approver ?? "—")}</div>
        <div><span>Prepared By:</span>${escapeHtml(record.maker)}</div>
        <div><span>Reference:</span>${escapeHtml(record.id)}</div>
      </div>
      <table>
        <thead><tr><th>Fee Item</th><th>Billing Cycle</th><th style="text-align:right">Amount (KES)</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
        <tfoot><tr><td colspan="2">Total Payable — ${escapeHtml(record.term)}</td><td style="text-align:right">KES ${total.toLocaleString()}</td></tr></tfoot>
      </table>
      ${record.note ? `<div class="note"><strong>Note:</strong> ${escapeHtml(record.note)}</div>` : ""}
      <div class="signatures">
        <div class="sig"><div class="sig-line">Finance Office Stamp</div></div>
        <div class="sig"><div class="sig-line">Authorized Signature</div></div>
      </div>`;
    printFeeStructure(`Fee Structure - ${record.grade} ${record.term} V${record.version}`, body);
  };

  // Latest approved record for a grade/term, regardless of academic year — same "most recent
  // approval wins" rule the workspace baseline (liveMap) already uses, so what prints here always
  // matches what a fresh submission would diff against.
  const latestApprovedRecord = (grade: string, term: TermKey): FeeStructureRecord | undefined =>
    structures
      .filter((record) => record.status === "Approved" && record.grade === grade && record.term === term)
      .sort((a, b) => new Date(b.reviewedAt ?? b.updatedAt).getTime() - new Date(a.reviewedAt ?? a.updatedAt).getTime())[0];

  // Full-year printout for one grade: one section per term that actually has an approved
  // structure, each with its own table and subtotal, plus a grand total across those terms.
  // Terms with nothing approved yet are left out entirely rather than shown as a placeholder.
  const printGradeStatement = (grade: string) => {
    const sections = TERMS.map((term) => {
      const record = latestApprovedRecord(grade, term);
      if (!record) return undefined;
      const enabled = record.lines.filter((l) => l.enabled);
      const rowsHtml = enabled.map((l) => {
        const item = feeItems.find((it) => it.id === l.itemId);
        return `
        <tr>
          <td>${escapeHtml(item?.name ?? `Item #${l.itemId}`)}</td>
          <td style="text-align:right">KES ${Number(l.amount || 0).toLocaleString()}</td>
        </tr>`;
      }).join("");
      return { term, record, rowsHtml, subtotal: sumEnabled(record.lines) };
    }).filter((section): section is NonNullable<typeof section> => Boolean(section));
    const grandTotal = sections.reduce((sum, section) => sum + section.subtotal, 0);
    const sectionsHtml = sections.map((section) => `
      <div class="section">
        <div class="section-head">
          <span>${escapeHtml(section.term)}</span>
          <span class="section-meta">Year ${section.record.academicYear} · V${section.record.version} · Approved ${section.record.reviewedAt ? fmtDate(section.record.reviewedAt) : "—"} by ${escapeHtml(section.record.approver ?? "—")}</span>
        </div>
        <table>
          <thead><tr><th>Fee Item</th><th style="text-align:right">Amount (KES)</th></tr></thead>
          <tbody>${section.rowsHtml}</tbody>
          <tfoot><tr><td>Subtotal</td><td style="text-align:right">KES ${section.subtotal.toLocaleString()}</td></tr></tfoot>
        </table>
      </div>`).join("");
    const body = `
      <div class="doc-title">
        <h1>Full Year Fee Structure</h1>
        <h2>${escapeHtml(grade)} · Term 1, Term 2, Term 3 &amp; Full Year fees combined</h2>
      </div>
      ${sectionsHtml}
      <div class="grand"><span>Grand Total (Year)</span><span>KES ${grandTotal.toLocaleString()}</span></div>
      <div class="signatures">
        <div class="sig"><div class="sig-line">Finance Office Stamp</div></div>
        <div class="sig"><div class="sig-line">Authorized Signature</div></div>
      </div>`;
    printFeeStructure(`Fee Structure - ${grade} - Full Year`, body);
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

  const resetMakerForm = () => {
    setEditingRejectedId(null);
    setSubmitNote("");
    setSelectedDueDate("");
    setMasterItemsFocus(null);
  };

  const saveDraft = async () => {
    if (!isMaker) {
      Swal.fire({ icon: "error", title: "Maker access required", showConfirmButton: true });
      return;
    }
    if (isAllScope && bulkCombos.length === 0) {
      Swal.fire({ icon: "warning", title: "No fee structure changes to save", showConfirmButton: true });
      return;
    }
    try {
      if (isAllScope) {
        await Promise.all(bulkCombos.map((combo) => FeeApi.saveDraft({
          academicYear: selectedYear, grade: combo.grade, term: combo.term, lines: combo.lines,
          note: submitNote, dueDate: selectedDueDate || undefined,
        })));
        Swal.fire({ title: "Success", text: `Draft saved for ${bulkCombos.length} fee structure(s)`, icon: "success", showConfirmButton: true });
      } else {
        await FeeApi.saveDraft({
          academicYear: selectedYear,
          grade: selectedGrade,
          term: selectedTerm,
          lines: currentLines,
          note: submitNote,
          dueDate: selectedDueDate || undefined,
        });
        Swal.fire({ title: "Success", text: `Draft saved — ${selectedGrade} · ${selectedTerm}`, icon: "success", showConfirmButton: true });
      }
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
    if (isAllScope ? bulkCombos.length === 0 : !isDirty) {
      Swal.fire({ icon: "warning", title: "No fee structure changes to submit", showConfirmButton: true });
      return;
    }
    setPreviewOpen(true);
  };

  const submitForApproval = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (isAllScope) {
        await Promise.all(bulkCombos.map((combo) => FeeApi.submitStructure({
          academicYear: selectedYear, grade: combo.grade, term: combo.term, lines: combo.lines,
          note: submitNote, dueDate: selectedDueDate || undefined,
        })));
        setPreviewOpen(false);
        resetMakerForm();
        setActiveTab("approver");
        Swal.fire({ title: "Success", text: `Moved ${bulkCombos.length} fee structure(s) to approver`, icon: "success", showConfirmButton: true });
      } else {
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
      }
      await load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to submit", text: getBackendErrorMessage(err), showConfirmButton: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  // The workspace is read-only, so "reworking" a rejected structure no longer means loading its
  // lines for editing — it means fixing the relevant fee item(s) in Master Fee Items, then coming
  // back here and resubmitting whatever Master Fee Items now says for this grade/term. This both
  // arms that resubmission (editingRejectedId) and jumps straight to the exact items that rejected
  // structure touched, so there's no hunting through the full Master Fee Items list.
  const prepareRejectedResubmit = (record: FeeStructureRecord) => {
    if (!isMaker) {
      Swal.fire({ icon: "error", title: "Maker access required", showConfirmButton: true });
      return;
    }
    setSelectedGrade(record.grade);
    setSelectedTerm(record.term);
    setMasterItemsFocus({ grade: record.grade, term: record.term, itemIds: new Set(record.lines.map((line) => line.itemId)) });
    setItemSearch("");
    setItemsPage(1);
    setItemsSubTab("items");
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
    const { value: note, isConfirmed } = await Swal.fire({
      icon: "question",
      title: `Approve ${record.grade} · ${record.term}?`,
      text: `Total KES ${sumEnabled(record.lines).toLocaleString()}. This becomes the live fee structure.`,
      input: "textarea",
      inputPlaceholder: "Approval note (required)",
      inputValidator: (value) => (!value || !value.trim() ? "An approval note is required" : undefined),
      showCancelButton: true,
      confirmButtonText: "Approve",
    });
    if (!isConfirmed || !note || !note.trim()) return;
    if (decidingId) return;
    setDecidingId(record.id);
    try {
      await FeeApi.approveStructure(record.id, note);
      setReviewing(null);
      setActiveTab("approved");
      Swal.fire({ title: "Success", text: `${record.grade} · ${record.term} is now live`, icon: "success", showConfirmButton: true });
      await load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to approve", text: getBackendErrorMessage(err), showConfirmButton: true });
    } finally {
      setDecidingId(null);
    }
  };

  // Approves every pending structure currently matching the Approver Queue filters (search,
  // grade, year, date range) — not just the visible page — so "All Grades" or a narrowed grade
  // filter both approve exactly what's shown as the filtered total.
  const approveAllFiltered = async () => {
    if (!isApprover) {
      Swal.fire({ icon: "error", title: "Approver access required", showConfirmButton: true });
      return;
    }
    if (filteredPending.length === 0) {
      Swal.fire({ icon: "warning", title: "No fee structures match the current filters", showConfirmButton: true });
      return;
    }
    const { value: note, isConfirmed } = await Swal.fire({
      icon: "question",
      title: `Approve ${filteredPending.length} fee structure(s)?`,
      text: `This approves every fee structure matching the current filters — total KES ${filteredPendingTotal.toLocaleString()}.`,
      input: "textarea",
      inputPlaceholder: "Approval note (required, applied to all)",
      inputValidator: (value) => (!value || !value.trim() ? "An approval note is required" : undefined),
      showCancelButton: true,
      confirmButtonText: "Approve All",
    });
    if (!isConfirmed || !note || !note.trim()) return;
    if (isBulkActing) return;
    setIsBulkActing(true);
    try {
      const results = await Promise.allSettled(filteredPending.map((record) => FeeApi.approveStructure(record.id, note)));
      const failed = results.filter((result) => result.status === "rejected").length;
      await load();
      if (failed > 0) {
        Swal.fire({ icon: "warning", title: "Partially approved", text: `${results.length - failed} approved, ${failed} failed — check the queue and retry those.`, showConfirmButton: true });
      } else {
        Swal.fire({ title: "Success", text: `${results.length} fee structure(s) approved`, icon: "success", showConfirmButton: true });
        setActiveTab("approved");
      }
    } finally {
      setIsBulkActing(false);
    }
  };

  // Rejects every pending structure currently matching the Approver Queue filters, same scope as
  // approveAllFiltered. A single reason is required and sent to every affected structure's maker.
  const rejectAllFiltered = async () => {
    if (!isApprover) {
      Swal.fire({ icon: "error", title: "Approver access required", showConfirmButton: true });
      return;
    }
    if (filteredPending.length === 0) {
      Swal.fire({ icon: "warning", title: "No fee structures match the current filters", showConfirmButton: true });
      return;
    }
    const { value: reason, isConfirmed } = await Swal.fire({
      icon: "warning",
      title: `Reject ${filteredPending.length} fee structure(s)?`,
      text: `This rejects every fee structure matching the current filters — total KES ${filteredPendingTotal.toLocaleString()}.`,
      input: "textarea",
      inputPlaceholder: "Rejection reason (required, sent to each maker)",
      inputValidator: (value) => (!value || !value.trim() ? "A rejection reason is required" : undefined),
      showCancelButton: true,
      confirmButtonText: "Reject All",
    });
    if (!isConfirmed || !reason || !reason.trim()) return;
    if (isBulkActing) return;
    setIsBulkActing(true);
    try {
      const results = await Promise.allSettled(filteredPending.map((record) => FeeApi.rejectStructure(record.id, reason)));
      const failed = results.filter((result) => result.status === "rejected").length;
      await load();
      if (failed > 0) {
        Swal.fire({ icon: "warning", title: "Partially rejected", text: `${results.length - failed} rejected, ${failed} failed — check the queue and retry those.`, showConfirmButton: true });
      } else {
        Swal.fire({ title: "Success", text: `${results.length} fee structure(s) rejected`, icon: "success", showConfirmButton: true });
        setActiveTab("maker");
      }
    } finally {
      setIsBulkActing(false);
    }
  };

  const confirmReject = async () => {
    if (!rejectFor || !rejectComment.trim()) return;
    if (!isApprover) {
      Swal.fire({ icon: "error", title: "Approver access required", showConfirmButton: true });
      return;
    }
    if (decidingId) return;
    setDecidingId(rejectFor.id);
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
    } finally {
      setDecidingId(null);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (feeItem: typeof feeItems[number]) => {
    setEditingId(feeItem.id);
    // Pre-fill Term 1/2/3 from the resolved (fallback-to-flat-amount) value rather than leaving
    // them blank, so editing a legacy "Per Term" item (saved before this per-term feature
    // existed) starts from what's actually in effect today, not an empty slate.
    setForm({
      name: feeItem.name, grades: feeItem.grades, amount: feeItem.amount, term: feeItem.term,
      term1Amount: feeItem.term === "Per Term" ? String(resolveAmount(feeItem, "Term 1")) : "",
      term2Amount: feeItem.term === "Per Term" ? String(resolveAmount(feeItem, "Term 2")) : "",
      term3Amount: feeItem.term === "Per Term" ? String(resolveAmount(feeItem, "Term 3")) : "",
      category: feeItem.category, mandatory: feeItem.mandatory, active: feeItem.active,
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    const gradeLevelUuids = form.grades
      .map((name) => gradeLevels.find((g) => g.name === name)?.uuid)
      .filter((uuid): uuid is string => Boolean(uuid));
    const isPerTerm = form.term === "Per Term";
    // Backend `amount` stays required regardless of billing cycle — for "Per Term" items it's
    // never shown/edited directly, so mirror Term 1 into it (also the fallback resolveAmount()
    // uses for any legacy item that predates this per-term feature).
    const payload = {
      name: form.name,
      amount: isPerTerm ? Number(form.term1Amount || 0) : form.amount,
      term: form.term,
      term1Amount: isPerTerm ? Number(form.term1Amount || 0) : null,
      term2Amount: isPerTerm ? Number(form.term2Amount || 0) : null,
      term3Amount: isPerTerm ? Number(form.term3Amount || 0) : null,
      category: form.category, mandatory: form.mandatory, active: form.active, gradeLevelUuids,
    };
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
          {isMaker && <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4" /> Add Fee Item</Button>}
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
                  <CardDescription>Read-only preview of Master Fee Items for the selected grade/term. Edit amounts and inclusion there, then submit here.</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select value={String(selectedYear)} onValueChange={(value) => { setSelectedYear(Number(value)); setEditingRejectedId(null); }}>
                    <SelectTrigger className="w-[150px]"><SelectValue placeholder="Academic Year" /></SelectTrigger>
                    <SelectContent>{ACADEMIC_YEARS.map((year) => <SelectItem key={year} value={String(year)}>Year {year}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={selectedGrade} onValueChange={(value) => { setSelectedGrade(value); setEditingRejectedId(null); }}>
                    <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Grades</SelectItem>
                      {gradeOptions.map((grade) => <SelectItem key={grade} value={grade}>{grade}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={selectedTerm} onValueChange={(value) => { setSelectedTerm(value as TermSelection); setEditingRejectedId(null); }}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Terms</SelectItem>
                      {TERMS.map((term) => <SelectItem key={term} value={term}>{term}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="date" className="w-[150px]" value={selectedDueDate} onChange={(e) => setSelectedDueDate(e.target.value)} placeholder="Due date" />
                  {isDirty && <Button size="sm" variant="outline" onClick={resetMakerForm}><RotateCcw className="h-4 w-4" /> Clear</Button>}
                  <Button size="sm" variant="outline" disabled={!isMaker || !hasSubmittableChanges} onClick={saveDraft}><Save className="h-4 w-4" /> Save Draft</Button>
                  <Button size="sm" disabled={!isMaker || !hasSubmittableChanges} onClick={openPreview}><Send className="h-4 w-4" /> Preview & Submit</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {editingRejectedId && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
                  Resubmitting a rejected fee structure. If it needs changes, fix the relevant item(s) in Master Fee Items below first — this always submits whatever Master Fee Items currently says.
                </div>
              )}
              {isLockedPending && pendingRecord && (
                <div className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-sm">
                  {selectedGrade} · {selectedTerm} already has a fee structure pending approval — submitted by {pendingRecord.maker} on {fmtDate(pendingRecord.submittedAt)}, total KES {sumEnabled(pendingRecord.lines).toLocaleString()}.
                  {" "}Shown below for reference only until the Approver approves or rejects it. It'll come back here to resubmit only if rejected.
                </div>
              )}
              {excludedByCycle.length > 0 && (
                <div className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-sm">
                  {excludedByCycle.length} active fee item{excludedByCycle.length === 1 ? "" : "s"} for {selectedGrade} not shown below, because {excludedByCycle.length === 1 ? "its" : "their"} billing cycle doesn't match {selectedTerm}:
                  {" "}{excludedByCycle.map((item) => `${item.name} (${item.term})`).join(", ")}.
                  {" "}A "Per Term" item only ever fits Term 1/2/3; a "Per Year"/"One-time" item only ever fits Full Year — change the cycle in Master Fee Items below if this should be billed here instead.
                </div>
              )}
              {isAllScope && (
                <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-muted-foreground">
                  Previewing a shared structure for {isAllGrades ? `all ${targetGrades.length} grade(s)` : selectedGrade} · {isAllTerms ? "all terms" : selectedTerm}, built from Master Fee Items.
                  {" "}This will submit one structure per matching grade/term at whatever inclusion/amount Master Fee Items currently has (per-term pricing comes from each item's own Term 1/2/3 amounts). Pick one specific grade and term for a single one.
                  {bulkPendingSkipped > 0 && ` ${bulkPendingSkipped} combo(s) already pending approval will be skipped, not resubmitted.`}
                  {bulkUnchangedSkipped > 0 && ` ${bulkUnchangedSkipped} combo(s) unchanged from what's already approved will be skipped too.`}
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 text-center">Included</TableHead>
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
                      <TableRow key={line.itemId} className={line.enabled ? undefined : "opacity-60"}>
                        <TableCell className="text-center">
                          {line.enabled
                            ? <CheckCircle2 className="mx-auto h-4 w-4 text-success" />
                            : <XCircle className="mx-auto h-4 w-4 text-muted-foreground" />}
                        </TableCell>
                        <TableCell className="font-medium">
                          {item.name}
                          {!line.enabled && <span className="ml-2 text-xs text-muted-foreground">(inactive in Master Fee Items)</span>}
                        </TableCell>
                        <TableCell><Badge variant="outline">{gradeLabel(item.grades)}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.term}</TableCell>
                        <TableCell className="text-right">
                          {isAmbiguousPerTermAmount(item) ? (
                            <span className="block text-xs text-muted-foreground whitespace-nowrap">
                              T1 {resolveAmount(item, "Term 1").toLocaleString()} · T2 {resolveAmount(item, "Term 2").toLocaleString()} · T3 {resolveAmount(item, "Term 3").toLocaleString()}
                            </span>
                          ) : (
                            <span className="font-medium tabular-nums">KES {Number(line.amount || 0).toLocaleString()}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {isAllScope ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-right font-semibold">
                        {bulkCombos.length} fee structure{bulkCombos.length === 1 ? "" : "s"} will be built ({targetGrades.length} grade(s) × {targetTerms.length} term(s))
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">KES {bulkGrandTotal.toLocaleString()}</TableCell>
                    </TableRow>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-right font-semibold">Total for {selectedGrade} · {selectedTerm}</TableCell>
                      <TableCell className="text-right font-bold text-primary">KES {statementTotal.toLocaleString()}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fee Items</CardTitle>
              <CardDescription>Manage the master fee item list, or review structures the Approver sent back for correction.</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={itemsSubTab} onValueChange={(value) => setItemsSubTab(value as "items" | "rejected")}>
                <TabsList>
                  <TabsTrigger value="items">Master Fee Items</TabsTrigger>
                  <TabsTrigger value="rejected" className="gap-2">
                    Rejected for Correction
                    {rejectedStructures.length > 0 && (
                      <Badge variant="destructive" className="h-5 min-w-5 justify-center px-1.5">{rejectedStructures.length}</Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="items" className="mt-4 space-y-3">
                  {masterItemsFocus && (
                    <div className="flex items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
                      <span>Showing the {masterItemsFocus.itemIds.size} item(s) from the rejected {masterItemsFocus.grade} · {masterItemsFocus.term} submission — fix them here, then scroll up and Resubmit.</span>
                      <Button size="sm" variant="ghost" onClick={() => setMasterItemsFocus(null)}><XCircle className="h-4 w-4" /> Show all items</Button>
                    </div>
                  )}
                  <div className="relative max-w-sm">
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
                          <TableCell className="text-right font-semibold">
                            {item.term === "Per Term" && (item.term1Amount != null || item.term2Amount != null || item.term3Amount != null) ? (
                              <span className="text-xs font-normal whitespace-nowrap">
                                T1 {resolveAmount(item, "Term 1").toLocaleString()} · T2 {resolveAmount(item, "Term 2").toLocaleString()} · T3 {resolveAmount(item, "Term 3").toLocaleString()}
                              </span>
                            ) : (
                              item.amount.toLocaleString()
                            )}
                          </TableCell>
                          <TableCell className="text-center"><Switch checked={item.active} disabled={!isMaker} onCheckedChange={() => toggleActive(item.id)} /></TableCell>
                          <TableCell className="text-right">
                            {isMaker && (
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Pagination currentPage={itemsPage} totalPages={totalItemsPages} onPageChange={setItemsPage}
                    itemsPerPage={itemsPerPageCount} onItemsPerPageChange={(v) => { setItemsPerPageCount(v); setItemsPage(1); }} />
                </TabsContent>

                <TabsContent value="rejected" className="mt-4 space-y-3">
                  <div className="relative max-w-sm">
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
                              <Button size="sm" variant="outline" disabled={!isMaker} onClick={() => prepareRejectedResubmit(record)}>
                                <Pencil className="h-4 w-4" /> Fix in Master Items
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
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

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
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">Approver Queue</CardTitle>
                  <CardDescription>{filteredPending.length} of {pendingStructures.length} fee structure(s) awaiting approval.</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-md border border-warning/30 bg-warning/5 px-3 py-1.5 text-right text-sm">
                    <span className="text-muted-foreground">Proposed Total{approverGrade === "all" ? " (All Grades)" : ` (${approverGrade})`}: </span>
                    <span className="font-bold text-warning">KES {filteredPendingTotal.toLocaleString()}</span>
                  </div>
                  <Button size="sm" disabled={!isApprover || filteredPending.length === 0 || isBulkActing || Boolean(decidingId)} onClick={approveAllFiltered}>
                    <CheckCircle2 className="h-4 w-4" /> {isBulkActing ? "Approving…" : `Approve All (${filteredPending.length})`}
                  </Button>
                  <Button size="sm" variant="outline" disabled={!isApprover || filteredPending.length === 0 || isBulkActing || Boolean(decidingId)} onClick={rejectAllFiltered}>
                    <XCircle className="h-4 w-4 text-destructive" /> {isBulkActing ? "Rejecting…" : `Reject All (${filteredPending.length})`}
                  </Button>
                </div>
              </div>
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
                            <Button size="sm" variant="outline" disabled={!isApprover || Boolean(decidingId) || isBulkActing} onClick={() => approveStructure(record)}><CheckCircle2 className="h-4 w-4 text-success" /> Approve</Button>
                            <Button size="sm" variant="outline" disabled={!isApprover || Boolean(decidingId) || isBulkActing} onClick={() => { setRejectFor(record); setRejectComment(""); }}><XCircle className="h-4 w-4 text-destructive" /> Reject</Button>
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
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">Approved Fee Structures History</CardTitle>
                  <CardDescription>All approved versions remain available for review.</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-md border border-success/30 bg-success/5 px-3 py-1.5 text-right text-sm">
                    <span className="text-muted-foreground">Approved Total{approvedGrade === "all" ? " (All Grades)" : ` (${approvedGrade})`}: </span>
                    <span className="font-bold text-success">KES {filteredApprovedTotal.toLocaleString()}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={approvedGrade === "all"}
                    title={approvedGrade === "all" ? "Select a single grade above to print its full year statement" : undefined}
                    onClick={() => printGradeStatement(approvedGrade)}
                  >
                    <Printer className="h-4 w-4" /> Print Full Year — {approvedGrade === "all" ? "select a grade" : approvedGrade}
                  </Button>
                </div>
              </div>
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
            <DialogTitle>Preview Fee Structure{isAllScope ? "s" : ""}</DialogTitle>
            <DialogDescription>
              {isAllScope
                ? `${bulkCombos.length} fee structure(s) across ${targetGrades.length} grade(s) × ${targetTerms.length} term(s) will move to the Approver queue after submission.`
                : `${selectedGrade} · ${selectedTerm} will move to the Approver queue after submission.`}
            </DialogDescription>
          </DialogHeader>
          {isAllScope ? (
            <div className="max-h-[60vh] space-y-4 overflow-auto pr-1">
              {bulkGroupedByGrade.map((group) => (
                <div key={group.grade} className="rounded-md border">
                  <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2">
                    <span className="font-semibold">{group.grade}</span>
                    <span className="text-sm font-semibold">Grade Total: KES {group.gradeTotal.toLocaleString()}</span>
                  </div>
                  <div className="space-y-3 p-3">
                    {group.combos.map((combo) => {
                      const enabledLines = combo.lines.filter((line) => line.enabled);
                      const comboTotal = sumEnabled(combo.lines);
                      return (
                        <div key={`${combo.grade}-${combo.term}`} className="rounded-md border">
                          <div className="flex items-center justify-between border-b bg-muted/20 px-3 py-1.5 text-sm font-medium">
                            <span>{combo.term}</span>
                            <span>{combo.term} Total: KES {comboTotal.toLocaleString()}</span>
                          </div>
                          <Table>
                            <TableBody>
                              {enabledLines.map((line) => (
                                <TableRow key={line.itemId}>
                                  <TableCell className="py-1.5">{itemName(line.itemId)}</TableCell>
                                  <TableCell className="py-1.5 text-right">KES {Number(line.amount).toLocaleString()}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
                <span className="font-semibold">Grand Total ({bulkCombos.length} fee structure{bulkCombos.length === 1 ? "" : "s"})</span>
                <span className="text-lg font-bold text-primary">KES {bulkGrandTotal.toLocaleString()}</span>
              </div>
            </div>
          ) : renderStructureDiff({
            id: editingRejectedId ?? "preview",
            version: 1,
            academicYear: selectedYear,
            grade: selectedGrade,
            term: selectedTerm as TermKey,
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
            <Button variant="outline" disabled={isSubmitting} onClick={() => setPreviewOpen(false)}>Cancel</Button>
            <Button disabled={isSubmitting} onClick={submitForApproval}><Send className="h-4 w-4" /> {isSubmitting ? "Submitting…" : `Submit to Approver${isAllScope ? ` (${bulkCombos.length})` : ""}`}</Button>
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
                <Button variant="outline" disabled={!isApprover || Boolean(decidingId)} onClick={() => { setRejectFor(reviewing); setRejectComment(""); }}><XCircle className="h-4 w-4 text-destructive" /> Reject</Button>
                <Button disabled={!isApprover || Boolean(decidingId)} onClick={() => approveStructure(reviewing)}><CheckCircle2 className="h-4 w-4" /> {decidingId === reviewing?.id ? "Approving…" : "Approve"}</Button>
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
            <Button variant="outline" disabled={Boolean(decidingId)} onClick={() => setRejectFor(null)}>Cancel</Button>
            <Button variant="destructive" disabled={!rejectComment.trim() || Boolean(decidingId)} onClick={confirmReject}>{decidingId === rejectFor?.id ? "Rejecting…" : "Reject"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeeStructureSetupPage;