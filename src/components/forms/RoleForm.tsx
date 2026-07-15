import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export const permissionKeys = ["students", "finance", "academics", "erp", "settings", "reports"] as const;
export type PermissionKey = typeof permissionKeys[number];

export interface RoleFormValues {
  role: string;
  description: string;
  permissions: Record<PermissionKey, boolean>;
}

export const emptyRoleForm: RoleFormValues = {
  role: "",
  description: "",
  permissions: { students: false, finance: false, academics: false, erp: false, settings: false, reports: false },
};

interface Props {
  value: RoleFormValues;
  onChange: (v: RoleFormValues) => void;
}

const RoleForm = ({ value, onChange }: Props) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label>Role Name</Label>
      <Input value={value.role} onChange={(e) => onChange({ ...value, role: e.target.value })} placeholder="e.g. Librarian" />
    </div>
    <div className="space-y-2">
      <Label>Description</Label>
      <Input value={value.description} onChange={(e) => onChange({ ...value, description: e.target.value })} placeholder="Short summary of the role" />
    </div>
    <div className="space-y-2">
      <Label>Module Permissions</Label>
      <div className="grid grid-cols-2 gap-3 pt-1">
        {permissionKeys.map((p) => (
          <label key={p} className="flex items-center gap-2 text-sm capitalize cursor-pointer">
            <Checkbox
              checked={value.permissions[p]}
              onCheckedChange={(c) => onChange({ ...value, permissions: { ...value.permissions, [p]: !!c } })}
            />
            {p}
          </label>
        ))}
      </div>
    </div>
  </div>
);

export default RoleForm;