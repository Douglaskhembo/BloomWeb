import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface StaffOption {
  id: string;
  name: string;
  staffType: string;
}

interface UserFormProps {
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
  onCancel: () => void;
}

const UserForm = ({
  isEditing, availableStaff, editingUserName, editingUserStaffId,
  staffId, onStaffIdChange, role, onRoleChange, availableRoles, onSubmit, onCancel,
}: UserFormProps) => (
  <div className="space-y-4">
    {!isEditing ? (
      <div className="space-y-1.5">
        <Label className="text-xs">Staff Member <span className="text-destructive">*</span></Label>
        <Select value={staffId} onValueChange={onStaffIdChange}>
          <SelectTrigger><SelectValue placeholder="Select staff member" /></SelectTrigger>
          <SelectContent>
            {availableStaff.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name} ({s.id}) — {s.staffType}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    ) : (
      <div className="text-sm">
        <span className="text-muted-foreground">Staff:</span>{" "}
        <span className="font-medium">{editingUserName} ({editingUserStaffId})</span>
      </div>
    )}

    <div className="space-y-1.5">
      <Label className="text-xs">Role <span className="text-muted-foreground text-[10px]">(optional)</span></Label>
      <Select value={role} onValueChange={onRoleChange}>
        <SelectTrigger><SelectValue placeholder="Select role (optional)" /></SelectTrigger>
        <SelectContent>
          {availableRoles.map((r) => (
            <SelectItem key={r} value={r}>{r}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <div className="flex justify-end gap-2 pt-2 border-t">
      <Button variant="outline" onClick={onCancel}>Cancel</Button>
      <Button onClick={onSubmit}>{isEditing ? "Update" : "Add User"}</Button>
    </div>
  </div>
);

export default UserForm;