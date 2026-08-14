import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export interface SchoolEventFormValues {
  name: string;
  startDate: string;
  endDate: string;
  active: boolean;
}

interface Props {
  value: SchoolEventFormValues;
  onChange: (v: SchoolEventFormValues) => void;
}

const SchoolEventForm = ({ value, onChange }: Props) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label>Event Name</Label>
      <Input value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder="e.g. Mid-Term Break" />
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-2">
        <Label>Start Date</Label>
        <Input
          type="date"
          value={value.startDate}
          onChange={(e) => onChange({ ...value, startDate: e.target.value, endDate: value.endDate && value.endDate < e.target.value ? e.target.value : value.endDate })}
        />
      </div>
      <div className="space-y-2">
        <Label>End Date</Label>
        <Input type="date" value={value.endDate} min={value.startDate || undefined} onChange={(e) => onChange({ ...value, endDate: e.target.value })} />
      </div>
    </div>
    <div className="flex items-center justify-between">
      <Label>Active</Label>
      <Switch checked={value.active} onCheckedChange={(c) => onChange({ ...value, active: c })} />
    </div>
  </div>
);

export default SchoolEventForm;
