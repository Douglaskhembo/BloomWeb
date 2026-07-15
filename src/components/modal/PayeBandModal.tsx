import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { TaxBracket } from "@/types/payroll";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: TaxBracket | null;
  defaultMin?: number;
  onSubmit: (data: Omit<TaxBracket, "id">) => void;
}

const PayeBandModal = ({ open, onOpenChange, initial, defaultMin = 0, onSubmit }: Props) => {
  const [bMin, setBMin] = useState("");
  const [bMax, setBMax] = useState("");
  const [bRate, setBRate] = useState("");

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setBMin(String(initial.minAmount));
      setBMax(initial.maxAmount === null ? "" : String(initial.maxAmount));
      setBRate(String(initial.rate));
    } else {
      setBMin(String(defaultMin));
      setBMax("");
      setBRate("");
    }
  }, [open, initial, defaultMin]);

  const handleSave = () => {
    if (bMin === "" || bRate === "") { toast.error("Min and Rate are required"); return; }
    onSubmit({ minAmount: Number(bMin), maxAmount: bMax === "" ? null : Number(bMax), rate: Number(bRate) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{initial ? "Edit" : "Add"} PAYE Band</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Min Amount (KES) *</Label><Input type="number" value={bMin} onChange={(e) => setBMin(e.target.value)} /></div>
            <div className="space-y-2"><Label>Max Amount (KES)</Label><Input type="number" value={bMax} onChange={(e) => setBMax(e.target.value)} placeholder="Leave blank for 'Above'" /></div>
          </div>
          <div className="space-y-2"><Label>Rate (%) *</Label><Input type="number" step="0.01" value={bRate} onChange={(e) => setBRate(e.target.value)} placeholder="e.g. 30" /></div>
          <p className="text-xs text-muted-foreground">Bands are applied progressively. Leave Max blank for the top band.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>{initial ? "Update" : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PayeBandModal;