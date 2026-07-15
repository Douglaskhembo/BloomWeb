import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface FeeItemFormValues {
  name: string;
  grade: string;
  amount: number;
  term: string;
  active: boolean;
}

interface Props {
  value: FeeItemFormValues;
  onChange: (v: FeeItemFormValues) => void;
}

const FeeItemForm = ({ value, onChange }: Props) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label>Fee Item Name</Label>
      <Input value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder="e.g. Tuition Fee" />
    </div>
    <div className="space-y-2">
      <Label>Applicable Grades</Label>
      <Input value={value.grade} onChange={(e) => onChange({ ...value, grade: e.target.value })} placeholder="e.g. All Grades" />
    </div>
    <div className="space-y-2">
      <Label>Amount (KES)</Label>
      <Input type="number" value={value.amount || ""} onChange={(e) => onChange({ ...value, amount: Number(e.target.value) })} />
    </div>
    <div className="space-y-2">
      <Label>Billing Cycle</Label>
      <Select value={value.term} onValueChange={(v) => onChange({ ...value, term: v })}>
        <SelectTrigger><SelectValue placeholder="Select cycle" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="Per Term">Per Term</SelectItem>
          <SelectItem value="Per Year">Per Year</SelectItem>
          <SelectItem value="One-time">One-time</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div className="flex items-center justify-between">
      <Label>Active</Label>
      <Switch checked={value.active} onCheckedChange={(c) => onChange({ ...value, active: c })} />
    </div>
  </div>
);

export default FeeItemForm;