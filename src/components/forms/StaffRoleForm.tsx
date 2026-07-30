import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export interface StaffRoleFormValues {
  name: string;
  description: string;
  active: boolean;
}

interface Props {
  value: StaffRoleFormValues;
  onChange: (v: StaffRoleFormValues) => void;
}

const StaffRoleForm = ({ value, onChange }: Props) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label>Role Name</Label>
      <Input value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder="e.g. Principal" />
    </div>
    <div className="space-y-2">
      <Label>Description</Label>
      <Input value={value.description} onChange={(e) => onChange({ ...value, description: e.target.value })} placeholder="e.g. Head of school" />
    </div>
    <div className="flex items-center justify-between">
      <Label>Active</Label>
      <Switch checked={value.active} onCheckedChange={(c) => onChange({ ...value, active: c })} />
    </div>
  </div>
);

export default StaffRoleForm;
