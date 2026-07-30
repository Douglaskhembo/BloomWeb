import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import StaffForm, { StaffFormData } from "@/components/forms/StaffForm";

interface StaffFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: StaffFormData;
  onChange: (v: StaffFormData) => void;
  onSubmit: () => void;
  isEditing: boolean;
  subjectOptions: string[];
  staffRoleOptions: string[];
}

const StaffFormModal = ({ open, onOpenChange, value, onChange, onSubmit, isEditing, subjectOptions, staffRoleOptions }: StaffFormModalProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{isEditing ? "Edit Staff" : "Add New Staff"}</DialogTitle>
        <DialogDescription>{isEditing ? "Update staff member details" : "Complete all steps to register a new staff member"}</DialogDescription>
      </DialogHeader>
      <StaffForm
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        onCancel={() => onOpenChange(false)}
        isEditing={isEditing}
        subjectOptions={subjectOptions}
        staffRoleOptions={staffRoleOptions}
      />
    </DialogContent>
  </Dialog>
);

export default StaffFormModal;