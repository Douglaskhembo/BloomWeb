import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { StatutoryDeduction } from "@/types/payroll";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: StatutoryDeduction | null;
  onSubmit: (data: Omit<StatutoryDeduction, "id" | "active">) => void;
}

const StatutoryDeductionModal = ({ open, onOpenChange, initial, onSubmit }: Props) => {
  const [name, setName] = useState("");
  const [type, setType] = useState<"percentage" | "tiered" | "fixed">("percentage");
  const [value, setValue] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [emp, setEmp] = useState(false);
  const [empVal, setEmpVal] = useState("");

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setName(initial.name); setType(initial.type); setValue(String(initial.value));
      setMaxAmount(initial.maxAmount === null ? "" : String(initial.maxAmount));
      setEmp(initial.employerContribution); setEmpVal(String(initial.employerValue));
    } else {
      setName(""); setType("percentage"); setValue(""); setMaxAmount(""); setEmp(false); setEmpVal("");
    }
  }, [open, initial]);

  const handleSave = () => {
    if (!name) { toast.error("Name is required"); return; }
    onSubmit({
      name, type, value: Number(value || 0),
      maxAmount: maxAmount === "" ? null : Number(maxAmount),
      employerContribution: emp, employerValue: Number(empVal || 0),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{initial ? "Edit" : "Add"} Statutory Deduction</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. NSSF (Tier I)" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                  <SelectItem value="tiered">Tiered (NHIF)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Employee Value</Label><Input type="number" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} placeholder={type === "percentage" ? "%" : "KES"} /></div>
          </div>
          <div className="space-y-2"><Label>Max Amount (KES)</Label><Input type="number" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} placeholder="Leave blank for no cap" /></div>
          <div className="flex items-center gap-3">
            <Switch id="emp" checked={emp} onCheckedChange={setEmp} />
            <Label htmlFor="emp">Employer also contributes</Label>
          </div>
          {emp && (
            <div className="space-y-2"><Label>Employer Value (%)</Label><Input type="number" step="0.01" value={empVal} onChange={(e) => setEmpVal(e.target.value)} /></div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>{initial ? "Update" : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StatutoryDeductionModal;