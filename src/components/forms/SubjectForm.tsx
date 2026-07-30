import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MultiSelect } from "@/components/ui/multi-select";

export interface SubjectFormValues {
  name: string;
  code: string;
  grades: string[];
  active: boolean;
}

interface Props {
  value: SubjectFormValues;
  onChange: (v: SubjectFormValues) => void;
  gradeOptions: string[];
}

const SubjectForm = ({ value, onChange, gradeOptions }: Props) => (
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
      <MultiSelect
        options={gradeOptions}
        selected={value.grades}
        onChange={(grades) => onChange({ ...value, grades })}
        placeholder="Select grade(s)..."
        searchPlaceholder="Search grades..."
        allLabel="All Grades"
      />
    </div>
    <div className="flex items-center justify-between">
      <Label>Active</Label>
      <Switch checked={value.active} onCheckedChange={(c) => onChange({ ...value, active: c })} />
    </div>
  </div>
);

export default SubjectForm;
