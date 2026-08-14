import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const TERM_PERIOD_TERMS = ["Term 1", "Term 2", "Term 3"] as const;

export interface TermPeriodFormValues {
  academicYear: number;
  term: string;
  startDate: string;
  endDate: string;
}

interface Props {
  value: TermPeriodFormValues;
  onChange: (v: TermPeriodFormValues) => void;
  academicYears: number[];
}

const TermPeriodForm = ({ value, onChange, academicYears }: Props) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-2">
        <Label>Academic Year</Label>
        <Select value={String(value.academicYear)} onValueChange={(v) => onChange({ ...value, academicYear: Number(v) })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{academicYears.map((year) => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Term</Label>
        <Select value={value.term} onValueChange={(v) => onChange({ ...value, term: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{TERM_PERIOD_TERMS.map((term) => <SelectItem key={term} value={term}>{term}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-2">
        <Label>Start Date</Label>
        <Input type="date" value={value.startDate} onChange={(e) => onChange({ ...value, startDate: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>End Date</Label>
        <Input type="date" value={value.endDate} onChange={(e) => onChange({ ...value, endDate: e.target.value })} />
      </div>
    </div>
  </div>
);

export default TermPeriodForm;
