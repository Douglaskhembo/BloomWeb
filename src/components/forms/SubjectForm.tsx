import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export interface SubjectFormValues {
  name: string;
  code: string;
  grades: string;
  active: boolean;
}

interface Props {
  value: SubjectFormValues;
  onChange: (v: SubjectFormValues) => void;
}

const SubjectForm = ({ value, onChange }: Props) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label>Subject Name</Label>
      <Input value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder="e.g. Mathematics" />
    </div>
    <div className="space-y-2">
      <Label>Subject Code</Label>
      <Input value={value.code} onChange={(e) => onChange({ ...value, code: e.target.value })} placeholder="e.g. MATH" />
    </div>
    <div className="space-y-2">
      <Label>Applicable Grades</Label>
      <Input value={value.grades} onChange={(e) => onChange({ ...value, grades: e.target.value })} placeholder="e.g. PP1 – Grade 9" />
    </div>
    <div className="flex items-center justify-between">
      <Label>Active</Label>
      <Switch checked={value.active} onCheckedChange={(c) => onChange({ ...value, active: c })} />
    </div>
  </div>
);

export default SubjectForm;