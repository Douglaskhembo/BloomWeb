import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type BranchFormValue = {
  name: string;
  code: string;
  location: string;
  phone: string;
  status: "active" | "inactive";
};

interface AddBranchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (value: BranchFormValue) => void;
}

const AddBranchModal = ({ open, onOpenChange, onSave }: AddBranchModalProps) => {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");

  useEffect(() => {
    if (open) {
      setName("");
      setCode("");
      setLocation("");
      setPhone("");
      setStatus("active");
    }
  }, [open]);

  const submit = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      location: location.trim(),
      phone: phone.trim(),
      status,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Branch</DialogTitle>
          <DialogDescription>Add a school branch. Assign departments and grade levels after creation.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Branch Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Main Campus" />
          </div>
          <div className="space-y-2">
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. MAIN" />
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Westlands, Nairobi" />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254 700 000 000" />
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Save Branch</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddBranchModal;