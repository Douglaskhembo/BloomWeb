import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type DepartmentFormValue = {
  name: string;
  code: string;
  head: string;
  status: "active" | "inactive";
};

interface AddDepartmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (value: DepartmentFormValue) => void;
}

const AddDepartmentModal = ({ open, onOpenChange, onSave }: AddDepartmentModalProps) => {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [head, setHead] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");

  useEffect(() => {
    if (open) {
      setName("");
      setCode("");
      setHead("");
      setStatus("active");
    }
  }, [open]);

  const submit = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), code: code.trim().toUpperCase(), head: head.trim(), status });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Department</DialogTitle>
          <DialogDescription>Create a department at school level. You can assign it to branches later.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2 col-span-2">
            <Label>Department Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Academics" />
          </div>
          <div className="space-y-2">
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. ACAD" />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as "active" | "inactive")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Department Head</Label>
            <Input value={head} onChange={(e) => setHead(e.target.value)} placeholder="e.g. Jane Mwangi" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Save Department</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddDepartmentModal;