import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";

export interface FeeItemFormValues {
  name: string;
  grades: string[];
  amount: number;
  term: string;
  term1Amount: string;
  term2Amount: string;
  term3Amount: string;
  category: string;
  /** Restricts a non-Boarding/Transport item (e.g. Lunch) to boarders or day scholars only.
   *  Ignored for BOARDING/TRANSPORT, which already have their own fixed eligibility rule. */
  applicability: string;
  mandatory: boolean;
  active: boolean;
}

export const FEE_CATEGORIES = [
  { value: "TUITION", label: "Tuition" },
  { value: "BOARDING", label: "Boarding" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "LUNCH", label: "Lunch" },
  { value: "ACTIVITY", label: "Activity" },
  { value: "EXAMINATION", label: "Examination" },
  { value: "OTHER", label: "Other" },
] as const;

export const FEE_APPLICABILITY = [
  { value: "ALL", label: "All students" },
  { value: "BOARDERS_ONLY", label: "Boarders only" },
  { value: "DAY_SCHOLARS_ONLY", label: "Day scholars only" },
] as const;

// BOARDING/TRANSPORT already have a fixed, non-configurable eligibility rule (boarders only /
// active transport subscribers only) — the "Applies to" override would be misleading there.
const FIXED_ELIGIBILITY_CATEGORIES = ["BOARDING", "TRANSPORT"];

interface Props {
  value: FeeItemFormValues;
  onChange: (v: FeeItemFormValues) => void;
  gradeOptions: string[];
}

const FeeItemForm = ({ value, onChange, gradeOptions }: Props) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label>Category <span className="text-destructive">*</span></Label>
      <Select
        value={value.category}
        onValueChange={(v) => onChange({ ...value, category: v })}
      >
        <SelectTrigger><SelectValue placeholder="Select a category to continue" /></SelectTrigger>
        <SelectContent>
          {FEE_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
        </SelectContent>
      </Select>
      {!value.category && (
        <p className="text-xs text-muted-foreground">Choose a category first — the rest of the fee item's details will appear here.</p>
      )}
    </div>

    {value.category && (
      <>
        <div className="space-y-2">
          <Label>Fee Item Name</Label>
          <Input value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder="e.g. Tuition Fee" />
        </div>

        {!FIXED_ELIGIBILITY_CATEGORIES.includes(value.category) && (
          <div className="space-y-2">
            <Label>Applies To</Label>
            <Select value={value.applicability || "ALL"} onValueChange={(v) => onChange({ ...value, applicability: v })}>
              <SelectTrigger><SelectValue placeholder="Select who this applies to" /></SelectTrigger>
              <SelectContent>
                {FEE_APPLICABILITY.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              e.g. restrict a Lunch item to Day Scholars only if boarders already have lunch covered by their Boarding fee.
            </p>
          </div>
        )}

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
        <div className="space-y-2">
          <Label>Billing Cycle</Label>
          <Select
            value={value.term}
            onValueChange={(v) => onChange({
              ...value,
              term: v,
              // Switching into "Per Term" starts Term 1 from whatever flat amount was already there,
              // instead of a blank slate.
              term1Amount: v === "Per Term" && value.term1Amount === "" && value.amount ? String(value.amount) : value.term1Amount,
            })}
          >
            <SelectTrigger><SelectValue placeholder="Select cycle" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Per Term">Per Term</SelectItem>
              <SelectItem value="Per Year">Per Year</SelectItem>
              <SelectItem value="One-time">One-time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {value.term === "Per Term" ? (
          <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
            <Label className="font-medium">Amount (KES) per Term</Label>
            <p className="text-xs text-muted-foreground">Typing Term 1 fills Term 2 and 3 too, until you change them yourself.</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Term 1</Label>
                <Input
                  type="number"
                  value={value.term1Amount}
                  onChange={(e) => {
                    const v = e.target.value;
                    onChange({
                      ...value,
                      term1Amount: v,
                      term2Amount: value.term2Amount === "" || value.term2Amount === value.term1Amount ? v : value.term2Amount,
                      term3Amount: value.term3Amount === "" || value.term3Amount === value.term1Amount ? v : value.term3Amount,
                    });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Term 2</Label>
                <Input type="number" value={value.term2Amount} onChange={(e) => onChange({ ...value, term2Amount: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Term 3</Label>
                <Input type="number" value={value.term3Amount} onChange={(e) => onChange({ ...value, term3Amount: e.target.value })} />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Amount (KES)</Label>
            <Input type="number" value={value.amount || ""} onChange={(e) => onChange({ ...value, amount: Number(e.target.value) })} />
          </div>
        )}

        <div className="flex items-center justify-between">
          <Label>Mandatory</Label>
          <Switch checked={value.mandatory} onCheckedChange={(c) => onChange({ ...value, mandatory: c })} />
        </div>
        <div className="flex items-center justify-between">
          <Label>Active</Label>
          <Switch checked={value.active} onCheckedChange={(c) => onChange({ ...value, active: c })} />
        </div>
      </>
    )}
  </div>
);

export default FeeItemForm;
