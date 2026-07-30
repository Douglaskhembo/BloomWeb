import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import StaffRoleForm, { StaffRoleFormValues } from "@/components/forms/StaffRoleForm";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  isEditing: boolean;
  value: StaffRoleFormValues;
  onChange: (v: StaffRoleFormValues) => void;
  onSubmit: () => void;
}

const StaffRoleFormModal = ({ open, onOpenChange, isEditing, value, onChange, onSubmit }: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{isEditing ? "Edit Staff Role" : "Add Staff Role"}</DialogTitle>
      </DialogHeader>
      <StaffRoleForm value={value} onChange={onChange} />
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={onSubmit} disabled={!value.name}>{isEditing ? "Update" : "Add"} Role</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default StaffRoleFormModal;
