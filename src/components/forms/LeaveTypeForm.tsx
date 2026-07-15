import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

export interface LeaveTypeFormValues {
  name: string;
  days: string;
  paid: boolean;
  requiresDocument: boolean;
  documentTypes: string[];
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