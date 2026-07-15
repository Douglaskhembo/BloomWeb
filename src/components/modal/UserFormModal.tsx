import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import UserForm, { StaffOption } from "@/components/forms/UserForm";

interface UserFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  availableStaff: StaffOption[];
  editingUserName?: string;
  editingUserStaffId?: string;
  staffId: string;
  onStaffIdChange: (id: string) => void;
  role: string;
  onRoleChange: (r: string) => void;
  availableRoles: string[];
  onSubmit: () => void;
}

const UserFormModal = (props: UserFormModalProps) => (
  <Dialog open={props.open} onOpenChange={props.onOpenChange}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>{props.isEditing ? "Edit User" : "Add User"}</DialogTitle>
        <DialogDescription>{props.isEditing ? "Update user role" : "Select a staff member to create a system user"}</DialogDescription>
      </DialogHeader>
      <UserForm {...props} onCancel={() => props.onOpenChange(false)} />
    </DialogContent>
  </Dialog>
);

export default UserFormModal;