import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StaffApi } from "@/services/api";

export type DepartmentFormValue = {
  name: string;
  code: string;
  headUuid: string | null;
  status: "active" | "inactive";
};

interface AddDepartmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (value: DepartmentFormValue) => void;
  initialValues?: DepartmentFormValue;
}

interface TeachingStaff { uuid: string; firstName: string; lastName: string; }

const AddDepartmentModal = ({ open, onOpenChange, onSave, initialValues }: AddDepartmentModalProps) => {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [headUuid, setHeadUuid] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [teachingStaff, setTeachingStaff] = useState<TeachingStaff[]>([]);

  useEffect(() => {
    if (open) {
      setName(initialValues?.name ?? "");
      setCode(initialValues?.code ?? "");
      setHeadUuid(initialValues?.headUuid ?? "");
      setStatus(initialValues?.status ?? "active");
      StaffApi.getAll().then((data) =>
        setTeachingStaff((Array.isArray(data) ? data : []).filter((s) => s.staffType === "TEACHING"))
      );
    }
  }, [open, initialValues]);

  const submit = () => {
    if (!name.trim() || !code.trim()) return;
    onSave({ name: name.trim(), code: code.trim().toUpperCase(), headUuid: headUuid || null, status });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initialValues ? "Edit Department" : "Add Department"}</DialogTitle>
          <DialogDescription>Create a department at school level. You can assign it to branches later.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2 col-span-2">
            <Label>Department Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Academics" />
          </div>
          <div className="space-y-2">
            <Label>Code *</Label>
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
            <Select value={headUuid} onValueChange={setHeadUuid}>
              <SelectTrigger><SelectValue placeholder="Select a teaching staff member" /></SelectTrigger>
              <SelectContent>
                {teachingStaff.map((s) => (
                  <SelectItem key={s.uuid} value={s.uuid}>
                    {s.firstName} {s.lastName}
                  </SelectItem>
                ))}
                {teachingStaff.length === 0 && (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">No teaching staff found</div>
                )}
              </SelectContent>
            </Select>
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