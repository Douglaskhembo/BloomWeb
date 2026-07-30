import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Swal from "sweetalert2";
import type { AllowanceType } from "@/types/payroll";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: AllowanceType | null;
  onSubmit: (data: Omit<AllowanceType, "id" | "active">) => void;
}

const AllowanceTypeModal = ({ open, onOpenChange, initial, onSubmit }: Props) => {
  const [name, setName] = useState("");
  const [type, setType] = useState<"fixed" | "percentage">("fixed");
  const [value, setValue] = useState("");
  const [taxable, setTaxable] = useState(true);

  useEffect(() => {
    if (!open) return;
    if (initial) { setName(initial.name); setType(initial.type); setValue(String(initial.defaultValue)); setTaxable(initial.taxable); }
    else { setName(""); setType("fixed"); setValue(""); setTaxable(true); }
  }, [open, initial]);

  const handleSave = () => {
    if (!name || !value) {
      Swal.fire({ icon: "error", title: "Error", text: "Fill all fields", showConfirmButton: true });
      return;
    }
    onSubmit({ name, type, defaultValue: Number(value), taxable });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{initial ? "Edit" : "Add"} Allowance</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. House Allowance" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="fixed">Fixed Amount</SelectItem><SelectItem value="percentage">% of Basic</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Default Value *</Label><Input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder={type === "fixed" ? "e.g. 8000" : "e.g. 15"} /></div>
          </div>
          <div className="flex items-center gap-3">
            <Switch id="taxable" checked={taxable} onCheckedChange={setTaxable} />
            <Label htmlFor="taxable">Taxable (included in PAYE calculation)</Label>
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

export default AllowanceTypeModal;