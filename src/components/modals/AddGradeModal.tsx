import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {GradeFormValue} from "@/types/types";

interface AddGradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (value: GradeFormValue) => void;
  defaultOrder?: number;
  initialValues?: GradeFormValue;
}

const AddGradeModal = ({ open, onOpenChange, onSave, defaultOrder = 1, initialValues }: AddGradeModalProps) => {
  const [name, setName] = useState("");
  const [displayOrder, setOrder] = useState<number>(defaultOrder);
  const [streams, setStreams] = useState<number>(1);
  const [status, setStatus] = useState<"active" | "inactive">("active");

  useEffect(() => {
    if (open) {
      setName(initialValues?.name ?? "");
      setOrder(initialValues?.displayOrder ?? defaultOrder);
      setStreams(initialValues?.streams ?? 1);
      setStatus(initialValues?.status ?? "active");
    }
  }, [open, defaultOrder, initialValues]);

  const submit = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), displayOrder, streams, status });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initialValues ? "Edit Grade Level" : "Add Grade Level"}</DialogTitle>
          <DialogDescription>Define a new class level for your school.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2 col-span-2">
            <Label>Grade Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Grade 1, PP1" />
          </div>
          <div className="space-y-2">
            <Label>Order</Label>
            <Input type="number" min={1} value={displayOrder} onChange={(e) => setOrder(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Streams</Label>
            <Input type="number" min={1} value={streams} onChange={(e) => setStreams(Number(e.target.value))} />
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as "active" | "inactive")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Save Grade</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddGradeModal;