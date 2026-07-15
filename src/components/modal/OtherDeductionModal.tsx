import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { OtherDeduction } from "@/types/payroll";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: OtherDeduction | null;
  onSubmit: (data: Omit<OtherDeduction, "id" | "active">) => void;
}

const OtherDeductionModal = ({ open, onOpenChange, initial, onSubmit }: Props) => {
  const [name, setName] = useState("");
  const [type, setType] = useState<"fixed" | "percentage">("fixed");
  const [value, setValue] = useState("");
  const [mandatory, setMandatory] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) { setName(initial.name); setType(initial.type); setValue(String(initial.defaultValue)); setMandatory(initial.mandatory); }
    else { setName(""); setType("fixed"); setValue(""); setMandatory(false); }
  }, [open, initial]);

  const handleSave = () => {
    if (!name || !value) { toast.error("Fill all fields"); return; }
    onSubmit({ name, type, defaultValue: Number(value), mandatory });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{initial ? "Edit" : "Add"} Deduction</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. SACCO Contribution" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="fixed">Fixed Amount</SelectItem><SelectItem value="percentage">% of Basic</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Default Value *</Label><Input type="number" value={value} onChange={(e) => setValue(e.target.value)} /></div>
          </div>
          <div className="flex items-center gap-3">
            <Switch id="mandatory" checked={mandatory} onCheckedChange={setMandatory} />
            <Label htmlFor="mandatory">Mandatory for all staff</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>{initial ? "Update" : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OtherDeductionModal;