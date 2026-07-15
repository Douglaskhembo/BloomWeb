import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { NHIFTier } from "@/types/payroll";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: NHIFTier | null;
  defaultMin?: number;
  onSubmit: (data: Omit<NHIFTier, "id">) => void;
}

const NhifTierModal = ({ open, onOpenChange, initial, defaultMin = 0, onSubmit }: Props) => {
  const [nMin, setNMin] = useState("");
  const [nMax, setNMax] = useState("");
  const [nAmt, setNAmt] = useState("");

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setNMin(String(initial.minSalary));
      setNMax(initial.maxSalary === null ? "" : String(initial.maxSalary));
      setNAmt(String(initial.amount));
    } else {
      setNMin(String(defaultMin)); setNMax(""); setNAmt("");
    }
  }, [open, initial, defaultMin]);

  const handleSave = () => {
    if (nMin === "" || nAmt === "") { toast.error("Min and Amount required"); return; }
    onSubmit({ minSalary: Number(nMin), maxSalary: nMax === "" ? null : Number(nMax), amount: Number(nAmt) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{initial ? "Edit" : "Add"} NHIF Tier</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Min Salary (KES) *</Label><Input type="number" value={nMin} onChange={(e) => setNMin(e.target.value)} /></div>
            <div className="space-y-2"><Label>Max Salary (KES)</Label><Input type="number" value={nMax} onChange={(e) => setNMax(e.target.value)} placeholder="Leave blank for 'Above'" /></div>
          </div>
          <div className="space-y-2"><Label>Monthly Amount (KES) *</Label><Input type="number" value={nAmt} onChange={(e) => setNAmt(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>{initial ? "Update" : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NhifTierModal;