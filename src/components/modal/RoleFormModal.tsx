import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import RoleForm, { RoleFormValues } from "@/components/forms/RoleForm";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  isEditing: boolean;
  value: RoleFormValues;
  onChange: (v: RoleFormValues) => void;
  onSubmit: () => void;
}

const RoleFormModal = ({ open, onOpenChange, isEditing, value, onChange, onSubmit }: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{isEditing ? "Edit Role" : "Add Role"}</DialogTitle>
      </DialogHeader>
      <RoleForm value={value} onChange={onChange} />
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={onSubmit} disabled={!value.role}>{isEditing ? "Update" : "Add"} Role</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default RoleFormModal;