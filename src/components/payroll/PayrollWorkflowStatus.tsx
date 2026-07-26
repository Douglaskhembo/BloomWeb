import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Clock, XCircle, User, Banknote, Circle } from "lucide-react";
import { PayrollRun, PayrollWorkflowStep } from "@/context/PayrollContext";

interface ApprovalEntry {
  uuid?: string;
  stepOrder?: number;
  stepLabel?: string;
  actorUuid?: string;
  actorName: string;
  action: "SUBMITTED" | "APPROVED" | "REJECTED" | "SENT_TO_BANK";
  comment?: string;
  actedAt: string;
}

interface Props {
  run: PayrollRun;
  /** Active steps applicable to this run, already filtered/sorted by sequenceOrder. */
  steps: PayrollWorkflowStep[];
  approvals: ApprovalEntry[];
}

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" }) : "";

const ruleLabel = (step: PayrollWorkflowStep) => {
  if (step.approvalRule === "ANY_ONE_APPROVES") return "Any one authorizer approves";
  if (step.approvalRule === "AT_LEAST") return `At least ${step.minApprovals} of ${step.assignedUsers.length} must approve`;
  return "All authorizers must approve";
};

const personName = (u: { firstName?: string; otherNames?: string; userName: string }) => {
  const name = `${u.firstName ?? ""} ${u.otherNames ?? ""}`.trim();
  return name || u.userName;
};

type StepState = "cleared" | "current" | "upcoming" | "rejected-here" | "skipped-after-rejection";

/** Shows exactly who has authorized a run and who is still pending, step by step — the maker's
 *  own review/submission, each configured authorization step, and the final send-to-bank action. */
const PayrollWorkflowStatus = ({ run, steps, approvals }: Props) => {
  const rejectionEntry = approvals.find((a) => a.action === "REJECTED");
  const isRejected = run.status === "REJECTED";
  const rejectedAtStepOrder = isRejected ? rejectionEntry?.stepOrder ?? run.currentStepOrder : undefined;

  const stepState = (step: PayrollWorkflowStep): StepState => {
    if (isRejected) {
      if (rejectedAtStepOrder != null && step.sequenceOrder === rejectedAtStepOrder) return "rejected-here";
      if (rejectedAtStepOrder != null && step.sequenceOrder > rejectedAtStepOrder) return "skipped-after-rejection";
      return "cleared";
    }
    if (run.status === "DRAFT") return "upcoming";
    if (run.currentStepOrder == null) return "cleared"; // fully approved, workflow resolved
    if (step.sequenceOrder < run.currentStepOrder) return "cleared";
    if (step.sequenceOrder === run.currentStepOrder) return "current";
    return "upcoming";
  };

  const approvedActorUuids = (step: PayrollWorkflowStep) =>
    new Set(
      approvals
        .filter((a) => a.action === "APPROVED" && a.stepOrder === step.sequenceOrder)
        .map((a) => a.actorUuid),
    );

  const approvalFor = (step: PayrollWorkflowStep, userUuid: string) =>
    approvals.find((a) => a.action === "APPROVED" && a.stepOrder === step.sequenceOrder && a.actorUuid === userUuid);

  const showsAsApproved = (step: PayrollWorkflowStep, state: StepState) => state === "cleared";

  return (
    <div className="space-y-0">
      {/* Maker node */}
      <div className="flex gap-3">
        <div className="flex flex-col items-center">
          <div className="rounded-full p-1.5 bg-primary/10 text-primary">
            <User className="w-3.5 h-3.5" />
          </div>
          <div className="w-px flex-1 bg-border mt-1" />
        </div>
        <div className="pb-4 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-medium">{run.makerName}</span>
            <Badge variant="outline" className="text-[10px] px-1.5">Maker</Badge>
          </div>
          <div className="text-xs text-muted-foreground">Generated {formatDate(run.processedAt)}</div>
          {run.status === "DRAFT" ? (
            <div className="text-xs text-amber-600 dark:text-amber-500 mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Pending review by maker — not yet submitted
            </div>
          ) : (
            <div className="text-xs text-muted-foreground mt-0.5">Submitted {formatDate(run.submittedAt)}</div>
          )}
        </div>
      </div>

      {/* Workflow steps */}
      {steps.map((step, idx) => {
        const state = stepState(step);
        const approvedUuids = approvedActorUuids(step);
        const isLast = idx === steps.length - 1;
        return (
          <div className="flex gap-3" key={step.uuid}>
            <div className="flex flex-col items-center">
              <div
                className={
                  "rounded-full p-1.5 " +
                  (state === "cleared"
                    ? "bg-success/10 text-success"
                    : state === "current"
                    ? "bg-info/10 text-info"
                    : state === "rejected-here"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted text-muted-foreground")
                }
              >
                {state === "cleared" && <CheckCircle2 className="w-3.5 h-3.5" />}
                {state === "current" && <Clock className="w-3.5 h-3.5" />}
                {state === "rejected-here" && <XCircle className="w-3.5 h-3.5" />}
                {(state === "upcoming" || state === "skipped-after-rejection") && <Circle className="w-3.5 h-3.5" />}
              </div>
              {!(isLast && run.status !== "APPROVED" && run.status !== "SENT_TO_BANK") && (
                <div className="w-px flex-1 bg-border mt-1" />
              )}
            </div>
            <div className="pb-4 min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-medium">{step.label}</span>
                <Badge variant="outline" className="text-[10px] px-1.5">Authorizer</Badge>
              </div>
              <div className="text-xs text-muted-foreground">{ruleLabel(step)}</div>

              <div className="mt-1 space-y-0.5">
                {step.assignedUsers.map((u) => {
                  const approval = approvalFor(step, u.uuid);
                  const approved = showsAsApproved(step, state) || approvedUuids.has(u.uuid);
                  if (approved) {
                    return (
                      <div key={u.uuid} className="text-xs flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-success shrink-0" />
                        <span>{personName(u)}</span>
                        {approval && <span className="text-muted-foreground">— approved {formatDate(approval.actedAt)}</span>}
                      </div>
                    );
                  }
                  if (state === "current") {
                    return (
                      <div key={u.uuid} className="text-xs flex items-center gap-1.5 text-amber-600 dark:text-amber-500">
                        <Clock className="w-3 h-3 shrink-0" /> <span>{personName(u)}</span>
                        <span className="text-muted-foreground">— pending</span>
                      </div>
                    );
                  }
                  return (
                    <div key={u.uuid} className="text-xs flex items-center gap-1.5 text-muted-foreground">
                      <Circle className="w-3 h-3 shrink-0" /> <span>{personName(u)}</span>
                    </div>
                  );
                })}
              </div>

              {state === "rejected-here" && rejectionEntry && (
                <div className="text-xs text-destructive mt-1">
                  Rejected by {rejectionEntry.actorName} on {formatDate(rejectionEntry.actedAt)}
                  {rejectionEntry.comment && <div className="italic">"{rejectionEntry.comment}"</div>}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Send to bank node */}
      <div className="flex gap-3">
        <div className="flex flex-col items-center">
          <div
            className={
              "rounded-full p-1.5 " +
              (run.status === "SENT_TO_BANK" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")
            }
          >
            <Banknote className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="min-w-0">
          <span className="text-sm font-medium">Sent to Bank</span>
          {run.status === "SENT_TO_BANK" ? (
            <div className="text-xs text-muted-foreground">By {run.sentToBankByName} on {formatDate(run.sentToBankAt)}</div>
          ) : run.status === "APPROVED" ? (
            <div className="text-xs text-muted-foreground">Fully authorized — ready to send</div>
          ) : (
            <div className="text-xs text-muted-foreground">Not yet reached</div>
          )}
        </div>
      </div>

      {approvals.length > 0 && (
        <>
          <Separator className="my-3" />
          <div className="text-xs font-medium text-muted-foreground mb-1.5">Full history</div>
          <ul className="space-y-1.5">
            {approvals.map((entry, i) => (
              <li key={entry.uuid ?? i} className="text-xs flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-medium">{entry.action}</span>
                  {entry.stepLabel && <span className="text-muted-foreground"> — {entry.stepLabel}</span>} by {entry.actorName}
                  {entry.comment && <div className="text-muted-foreground italic truncate">"{entry.comment}"</div>}
                </div>
                <span className="text-muted-foreground whitespace-nowrap">{formatDate(entry.actedAt)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default PayrollWorkflowStatus;
