import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export interface HolidayFormValues {
  name: string;
  date: string;
  recurringAnnually: boolean;
  active: boolean;
}

interface Props {
  value: HolidayFormValues;
  onChange: (v: HolidayFormValues) => void;
}

const HolidayForm = ({ value, onChange }: Props) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label>Holiday Name</Label>
      <Input value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder="e.g. New Year's Day" />
    </div>
    <div className="space-y-2">
      <Label>Date</Label>
      <Input type="date" value={value.date} onChange={(e) => onChange({ ...value, date: e.target.value })} />
    </div>
    <div className="flex items-center justify-between">
      <Label>Recurs every year</Label>
      <Switch checked={value.recurringAnnually} onCheckedChange={(c) => onChange({ ...value, recurringAnnually: c })} />
    </div>
    <div className="flex items-center justify-between">
      <Label>Active</Label>
      <Switch checked={value.active} onCheckedChange={(c) => onChange({ ...value, active: c })} />
    </div>
  </div>
);

export default HolidayForm;
