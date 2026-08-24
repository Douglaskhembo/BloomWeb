import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, UserCog } from "lucide-react";
import Swal from "sweetalert2";
import { PayrollApi, UserApi } from "@/services/api";
import { getBackendErrorMessage } from "@/utils/errorHandler";
import { usePayroll, PayrollWorkflowStep as WorkflowStep, PayrollWorkflowStepUser as PersonRef, PayrollMaker as Maker } from "@/context/PayrollContext";
import { useAuth } from "@/context/AuthContext";

type ApprovalRule = "ALL_MUST_APPROVE" | "ANY_ONE_APPROVES" | "AT_LEAST";

const ruleLabel = (step: Pick<WorkflowStep, "approvalRule" | "minApprovals" | "assignedUsers">) => {
  if (step.approvalRule === "ALL_MUST_APPROVE") return "All must approve";
  if (step.approvalRule === "ANY_ONE_APPROVES") return "Any one approves";
  return `At least ${step.minApprovals ?? "?"} of ${step.assignedUsers.length} must approve`;
};

const formatKES = (n: number) => `KES ${n.toLocaleString()}`;

const personLabel = (u: { userName: string; firstName?: string; otherNames?: string }) =>
  `${u.firstName ?? ""} ${u.otherNames ?? ""}`.trim() || u.userName;

const PayrollWorkflowSetup = () => {
  const { hasPermission } = useAuth();
  const canManageWorkflow = hasPermission("PAYROLL_WORKFLOW_MANAGE");
  const { makers, workflowSteps: steps, refreshMakers, refreshWorkflowSteps } = usePayroll();
  const [allUsers, setAllUsers] = useState<PersonRef[]>([]);

  const [makerDialogOpen, setMakerDialogOpen] = useState(false);
  const [makerUuid, setMakerUuid] = useState<string>("");

  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [stepForm, setStepForm] = useState<{
    label: string; approvalRule: ApprovalRule; minApprovals: string; active: boolean;
    assignedUuids: Set<string>; thresholdAmount: string;
  }>({
    label: "", approvalRule: "ALL_MUST_APPROVE", minApprovals: "", active: true, assignedUuids: new Set(), thresholdAmount: "",
  });

  const load = async () => {
    try {
      const userRows = await UserApi.getAll();
      setAllUsers(userRows.map((u: any) => ({ uuid: u.userUuid, userName: u.userName, firstName: u.firstName, otherNames: u.otherNames })));
      await Promise.all([refreshMakers(), refreshWorkflowSteps()]);
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: getBackendErrorMessage(err, "Failed to load approval workflow"), showConfirmButton: true });
    }
  };

  useEffect(() => { load(); }, []);

  // ── Makers ──────────────────────────────────────────────────────────────
  const openAddMaker = () => { setMakerUuid(""); setMakerDialogOpen(true); };

  const saveMaker = async () => {
    if (!makerUuid) {
      Swal.fire({ icon: "error", title: "Error", text: "Select a person", showConfirmButton: true });
      return;
    }
    try {
      await PayrollApi.addMaker(makerUuid);
      Swal.fire({ title: "Success", text: "Maker added", icon: "success", showConfirmButton: true });
      setMakerDialogOpen(false);
      refreshMakers();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: getBackendErrorMessage(err, "Failed to add maker"), showConfirmButton: true });
    }
  };

  const removeMaker = async (m: Maker) => {
    try {
      await PayrollApi.removeMaker(m.uuid);
      Swal.fire({ title: "Success", text: "Maker removed", icon: "success", showConfirmButton: true });
      refreshMakers();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: getBackendErrorMessage(err, "Failed to remove maker"), showConfirmButton: true });
    }
  };

  const availableForMaker = allUsers.filter((u) => !makers.some((m) => m.user.uuid === u.uuid));

  // ── Approval Steps ──────────────────────────────────────────────────────
  const openAddStep = () => {
    setEditingStep(null);
    setStepForm({ label: "", approvalRule: "ALL_MUST_APPROVE", minApprovals: "", active: true, assignedUuids: new Set(), thresholdAmount: "" });
    setStepDialogOpen(true);
  };

  const openEditStep = (step: WorkflowStep) => {
    setEditingStep(step);
    setStepForm({
      label: step.label, approvalRule: step.approvalRule,
      minApprovals: step.minApprovals ? String(step.minApprovals) : "",
      active: step.active,
      assignedUuids: new Set(step.assignedUsers.map((u) => u.uuid)),
      thresholdAmount: step.thresholdAmount ? String(step.thresholdAmount) : "",
    });
    setStepDialogOpen(true);
  };

  const toggleAssignee = (uuid: string) => {
    setStepForm((f) => {
      const next = new Set(f.assignedUuids);
      if (next.has(uuid)) next.delete(uuid); else next.add(uuid);
      return { ...f, assignedUuids: next };
    });
  };

  const saveStep = async () => {
    if (!stepForm.label.trim()) {
      Swal.fire({ icon: "error", title: "Error", text: "Give this step a name", showConfirmButton: true });
      return;
    }
    if (stepForm.assignedUuids.size === 0) {
      Swal.fire({ icon: "error", title: "Error", text: "Assign at least one approver to this step", showConfirmButton: true });
      return;
    }
    let minApprovals: number | null = null;
    if (stepForm.approvalRule === "AT_LEAST") {
      minApprovals = Number(stepForm.minApprovals);
      if (!minApprovals || minApprovals < 1) {
        Swal.fire({ icon: "error", title: "Error", text: "Enter how many approvers are required", showConfirmButton: true });
        return;
      }
      if (minApprovals > stepForm.assignedUuids.size) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: `"At least ${minApprovals}" can't exceed the ${stepForm.assignedUuids.size} people assigned`,
          showConfirmButton: true,
        });
        return;
      }
    }
    const payload = {
      label: stepForm.label.trim(),
      approvalRule: stepForm.approvalRule,
      minApprovals,
      active: stepForm.active,
      assignedUserUuids: Array.from(stepForm.assignedUuids),
      thresholdAmount: stepForm.thresholdAmount.trim() ? Number(stepForm.thresholdAmount) : null,
    };
    try {
      if (editingStep) {
        await PayrollApi.updateWorkflowStep(editingStep.uuid, payload);
        Swal.fire({ title: "Success", text: "Step updated", icon: "success", showConfirmButton: true });
      } else {
        await PayrollApi.createWorkflowStep(payload);
        Swal.fire({ title: "Success", text: "Step added", icon: "success", showConfirmButton: true });
      }
      setStepDialogOpen(false);
      refreshWorkflowSteps();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: getBackendErrorMessage(err, "Failed to save step"), showConfirmButton: true });
    }
  };

  const removeStep = async (step: WorkflowStep) => {
    try {
      await PayrollApi.deleteWorkflowStep(step.uuid);
      Swal.fire({ title: "Success", text: "Step removed", icon: "success", showConfirmButton: true });
      refreshWorkflowSteps();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: getBackendErrorMessage(err, "Failed to delete step"), showConfirmButton: true });
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    const reordered = [...steps];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    try {
      await PayrollApi.reorderWorkflowSteps(reordered.map((s) => s.uuid));
      refreshWorkflowSteps();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: getBackendErrorMessage(err, "Failed to reorder steps"), showConfirmButton: true });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between flex-wrap gap-2">
        <div>
          <CardTitle className="text-lg">Payroll Approval Workflow</CardTitle>
          <CardDescription>
            Who can prepare payroll (Makers), and the ordered chain of approvers (by rank) it must pass
            through before it's ready to send to the bank. Adding someone here is what gives them the
            ability — nothing needs to be set up elsewhere first.
          </CardDescription>
        </div>
        {canManageWorkflow && (
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={openAddMaker}><UserCog className="w-4 h-4 mr-1" /> Add Maker</Button>
            <Button size="sm" onClick={openAddStep}><Plus className="w-4 h-4 mr-1" /> Add Approval Step</Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {makers.length === 0 && steps.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nothing set up yet. Add at least one Maker (who can generate/submit payroll) and one Approval
            Step (who must sign off) before payroll can be run.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Rank</TableHead>
                <TableHead className="w-28">Type</TableHead>
                <TableHead>Person / Rule</TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {makers.map((m) => (
                <TableRow key={`maker-${m.uuid}`}>
                  <TableCell className="text-muted-foreground text-xs">—</TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10px]">Maker</Badge></TableCell>
                  <TableCell className="font-medium">{personLabel(m.user)}</TableCell>
                  <TableCell className="text-right">
                    {canManageWorkflow && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeMaker(m)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {steps.map((step, i) => (
                <TableRow key={`step-${step.uuid}`}>
                  <TableCell><Badge variant="outline">{i + 1}</Badge></TableCell>
                  <TableCell><Badge className="text-[10px]">Approver</Badge></TableCell>
                  <TableCell>
                    <div className="font-medium flex items-center gap-2 flex-wrap">
                      {step.label}
                      {!step.active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                      <Badge variant="outline" className="text-[10px]">{ruleLabel(step)}</Badge>
                      {step.thresholdAmount ? (
                        <Badge variant="destructive" className="text-[10px]">
                          Only above {formatKES(step.thresholdAmount)}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">Always required</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {step.assignedUsers.length > 0 ? step.assignedUsers.map(personLabel).join(", ") : "No one assigned"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {canManageWorkflow && (
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={i === 0} onClick={() => move(i, -1)}>
                          <ArrowUp className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={i === steps.length - 1} onClick={() => move(i, 1)}>
                          <ArrowDown className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditStep(step)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeStep(step)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Add Maker */}
      <Dialog open={makerDialogOpen} onOpenChange={setMakerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Maker</DialogTitle>
            <DialogDescription>This person will be able to generate and submit payroll runs for approval.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Person</Label>
            <Select value={makerUuid} onValueChange={setMakerUuid}>
              <SelectTrigger><SelectValue placeholder="Select a person" /></SelectTrigger>
              <SelectContent>
                {availableForMaker.map((u) => <SelectItem key={u.uuid} value={u.uuid}>{personLabel(u)}</SelectItem>)}
              </SelectContent>
            </Select>
            {availableForMaker.length === 0 && <p className="text-xs text-muted-foreground">Everyone is already a maker.</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMakerDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveMaker}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Approval Step */}
      <Dialog open={stepDialogOpen} onOpenChange={setStepDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingStep ? "Edit Approval Step" : "Add Approval Step"}</DialogTitle>
            <DialogDescription>A step is one rank in the approval chain — it can hold one or more people.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Step Name</Label>
              <Input
                value={stepForm.label}
                onChange={(e) => setStepForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="e.g. Finance Manager Review, Signatory A, Final Approver"
              />
            </div>
            <div className="space-y-2">
              <Label>Approval Rule (if more than one person is assigned)</Label>
              <Select value={stepForm.approvalRule} onValueChange={(v) => setStepForm((f) => ({ ...f, approvalRule: v as ApprovalRule }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL_MUST_APPROVE">All assigned people must approve</SelectItem>
                  <SelectItem value="ANY_ONE_APPROVES">Any one assigned person is enough</SelectItem>
                  <SelectItem value="AT_LEAST">At least a set number must approve</SelectItem>
                </SelectContent>
              </Select>
              {stepForm.approvalRule === "AT_LEAST" && (
                <Input
                  type="number"
                  min={1}
                  max={stepForm.assignedUuids.size || undefined}
                  value={stepForm.minApprovals}
                  onChange={(e) => setStepForm((f) => ({ ...f, minApprovals: e.target.value }))}
                  placeholder={`How many of the ${stepForm.assignedUuids.size} assigned people must approve? e.g. 3`}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>Only required above this total net pay (optional)</Label>
              <Input
                type="number"
                min={0}
                value={stepForm.thresholdAmount}
                onChange={(e) => setStepForm((f) => ({ ...f, thresholdAmount: e.target.value }))}
                placeholder="Leave blank to always require this step"
              />
              <p className="text-xs text-muted-foreground">
                E.g. set 500000 for a step that only kicks in once a payroll run's total net pay reaches
                KES 500,000 — smaller runs will skip straight past it.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Assigned People</Label>
              <div className="border rounded-md max-h-48 overflow-y-auto p-2 space-y-1">
                {allUsers.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2">No users found.</p>
                ) : allUsers.map((u) => (
                  <label key={u.uuid} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
                    <Checkbox checked={stepForm.assignedUuids.has(u.uuid)} onCheckedChange={() => toggleAssignee(u.uuid)} />
                    {personLabel(u)}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStepDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveStep}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PayrollWorkflowSetup;
