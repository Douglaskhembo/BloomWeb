import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

export interface LeaveTypeFormValues {
  name: string;
  days: string;
  paid: boolean;
  requiresApproval: boolean;
  requiresDocument: boolean;
  documentTypes: string[];
  carryForwardAllowed: boolean;
  maxCarryForwardDays: string;
  weekendPolicy: "COUNT_FULL" | "SATURDAY_HALF_DAY" | "EXCLUDE";
  countPublicHolidays: boolean;
}

interface LeaveTypeFormProps {
  value: LeaveTypeFormValues;
  onChange: (v: LeaveTypeFormValues) => void;
  allDocumentTypes: string[];
}

const LeaveTypeForm = ({ value, onChange, allDocumentTypes }: LeaveTypeFormProps) => {
  const toggleDocType = (docType: string) => {
    onChange({
      ...value,
      documentTypes: value.documentTypes.includes(docType)
        ? value.documentTypes.filter((d) => d !== docType)
        : [...value.documentTypes, docType],
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Leave Type Name *</Label>
        <Input value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder="e.g. Sick Leave" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Entitlement (Days) *</Label>
          <Input type="number" min={1} value={value.days} onChange={(e) => onChange({ ...value, days: e.target.value })} placeholder="e.g. 10" />
        </div>
        <div className="space-y-2">
          <Label>Paid Leave</Label>
          <Select value={value.paid ? "yes" : "no"} onValueChange={(v) => onChange({ ...value, paid: v === "yes" })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Checkbox
          id="requiresApproval"
          checked={value.requiresApproval}
          onCheckedChange={(checked) => onChange({ ...value, requiresApproval: !!checked })}
        />
        <Label htmlFor="requiresApproval" className="font-medium cursor-pointer">
          Requires approval before leave is granted
        </Label>
      </div>

      <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <Checkbox
            id="carryForward"
            checked={value.carryForwardAllowed}
            onCheckedChange={(checked) => onChange({ ...value, carryForwardAllowed: !!checked })}
          />
          <Label htmlFor="carryForward" className="font-medium cursor-pointer">
            Allow unused days to carry forward to next year
          </Label>
        </div>
        {value.carryForwardAllowed && (
          <div className="space-y-2 ml-6 max-w-[200px]">
            <Label className="text-sm text-muted-foreground">Max days that can carry forward</Label>
            <Input
              type="number"
              min={0}
              value={value.maxCarryForwardDays}
              onChange={(e) => onChange({ ...value, maxCarryForwardDays: e.target.value })}
              placeholder="e.g. 5"
            />
          </div>
        )}
      </div>

      <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
        <Label className="font-medium">Day Counting</Label>
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Weekends</Label>
          <Select
            value={value.weekendPolicy || "EXCLUDE"}
            onValueChange={(v) => onChange({ ...value, weekendPolicy: v as LeaveTypeFormValues["weekendPolicy"] })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="EXCLUDE">Exclude both Saturday and Sunday</SelectItem>
              <SelectItem value="SATURDAY_HALF_DAY">Saturday counts as half a day, Sunday excluded</SelectItem>
              <SelectItem value="COUNT_FULL">Count Saturday and Sunday as full leave days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3">
          <Checkbox
            id="countPublicHolidays"
            checked={value.countPublicHolidays}
            onCheckedChange={(checked) => onChange({ ...value, countPublicHolidays: !!checked })}
          />
          <Label htmlFor="countPublicHolidays" className="cursor-pointer">Count public holidays as leave days</Label>
        </div>
      </div>

      <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <Checkbox
            id="requiresDoc"
            checked={value.requiresDocument}
            onCheckedChange={(checked) => {
              onChange({
                ...value,
                requiresDocument: !!checked,
                documentTypes: !checked ? [] : value.documentTypes,
              });
            }}
          />
          <Label htmlFor="requiresDoc" className="font-medium cursor-pointer">
            Require supporting document when applying
          </Label>
        </div>

        {value.requiresDocument && (
          <div className="space-y-2 ml-6">
            <Label className="text-sm text-muted-foreground">Select accepted document types:</Label>
            <div className="grid grid-cols-2 gap-2">
              {allDocumentTypes.map((docType) => (
                <div key={docType} className="flex items-center gap-2">
                  <Checkbox
                    id={`doc-${docType}`}
                    checked={value.documentTypes.includes(docType)}
                    onCheckedChange={() => toggleDocType(docType)}
                  />
                  <Label htmlFor={`doc-${docType}`} className="text-sm cursor-pointer">{docType}</Label>
                </div>
              ))}
            </div>
            {value.documentTypes.length === 0 && (
              <p className="text-xs text-amber-600">Please select at least one document type</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaveTypeForm;