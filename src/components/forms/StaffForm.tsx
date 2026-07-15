import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, X } from "lucide-react";
import type { StaffMember } from "@/components/modal/StaffViewModal";

export type StaffFormData = Omit<StaffMember, "id">;

export const emptyStaff: StaffFormData = {
  firstName: "", lastName: "", gender: "", dateOfBirth: "", idNumber: "",
  phone: "", email: "", address: "", practiceNumber: "", staffType: "", subject: "", grade: "",
  qualification: "", experience: "", joined: "", status: "Active",
  emergencyContactName: "", emergencyContactPhone: "", emergencyContactRelationship: "",
  documents: [],
};

interface StaffFormProps {
  value: StaffFormData;
  onChange: (value: StaffFormData) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isEditing: boolean;
}

const StaffForm = ({ value, onChange, onSubmit, onCancel, isEditing }: StaffFormProps) => {
  const [formTab, setFormTab] = useState("personal");
  const [docName, setDocName] = useState("");

  const updateField = (field: keyof StaffFormData, v: string) => {
    onChange({ ...value, [field]: v });
  };

  const handleAddDocument = () => {
    if (!docName.trim()) return;
    onChange({ ...value, documents: [...value.documents, { name: docName.trim(), file: `${docName.trim()}.pdf` }] });
    setDocName("");
  };

  const handleRemoveDocument = (index: number) => {
    onChange({ ...value, documents: value.documents.filter((_, i) => i !== index) });
  };

  const renderField = (label: string, field: keyof StaffFormData, type = "text", required = false) => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label} {required && <span className="text-destructive">*</span>}</Label>
      <Input
        type={type}
        value={value[field] as string}
        onChange={(e) => updateField(field, e.target.value)}
        placeholder={label}
      />
    </div>
  );

  const steps = [
    { key: "personal", label: "Personal Info" },
    { key: "employment", label: "Employment" },
    { key: "emergency", label: "Emergency Contact" },
    { key: "documents", label: "Documents" },
  ];
  const currentIndex = steps.findIndex((s) => s.key === formTab);

  return (
    <>
      <div className="flex items-center gap-1 mb-2">
        {steps.map((step, i) => (
          <div key={step.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors ${
                  i < currentIndex
                    ? "bg-primary border-primary text-primary-foreground"
                    : i === currentIndex
                    ? "border-primary text-primary bg-primary/10"
                    : "border-muted-foreground/30 text-muted-foreground"
                }`}
              >
                {i < currentIndex ? "✓" : i + 1}
              </div>
              <span className={`text-[10px] mt-1 text-center leading-tight ${i <= currentIndex ? "text-primary font-medium" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 w-full mt-[-12px] ${i < currentIndex ? "bg-primary" : "bg-muted-foreground/20"}`} />
            )}
          </div>
        ))}
      </div>

      {formTab === "personal" && (
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            {renderField("First Name", "firstName", "text", true)}
            {renderField("Last Name", "lastName", "text", true)}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Gender <span className="text-destructive">*</span></Label>
              <Select value={value.gender} onValueChange={(v) => updateField("gender", v)}>
                <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {renderField("Date of Birth", "dateOfBirth", "date")}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {renderField("ID/Passport Number", "idNumber")}
            {renderField("Phone Number", "phone", "tel", true)}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {renderField("Email Address", "email", "email")}
            {renderField("Residential Address", "address")}
          </div>
        </div>
      )}

      {formTab === "employment" && (
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Staff Type <span className="text-destructive">*</span></Label>
              <Select value={value.staffType} onValueChange={(v) => updateField("staffType", v)}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Teaching">Teaching</SelectItem>
                  <SelectItem value="Support">Support</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {renderField("Subject / Role", "subject")}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {value.staffType === "Teaching" && renderField("Practice Number", "practiceNumber", "text", true)}
            {renderField("Assigned Class", "grade")}
            {renderField("Qualification", "qualification")}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {renderField("Years of Experience", "experience")}
            {renderField("Date Joined", "joined", "date")}
          </div>
        </div>
      )}

      {formTab === "emergency" && (
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            {renderField("Contact Name", "emergencyContactName")}
            {renderField("Contact Phone", "emergencyContactPhone", "tel")}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Relationship</Label>
            <Select value={value.emergencyContactRelationship} onValueChange={(v) => updateField("emergencyContactRelationship", v)}>
              <SelectTrigger><SelectValue placeholder="Select relationship" /></SelectTrigger>
              <SelectContent>
                {["Spouse", "Parent", "Sibling", "Child", "Friend", "Other"].map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {formTab === "documents" && (
        <div className="space-y-4 mt-4">
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs">Document Name</Label>
              <Input value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="e.g. National ID, CV, Certificates" />
            </div>
            <Button variant="outline" size="sm" onClick={handleAddDocument}>
              <Upload className="w-3.5 h-3.5 mr-1" /> Upload
            </Button>
          </div>
          {value.documents.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document Name</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {value.documents.map((doc, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{doc.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{doc.file}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemoveDocument(i)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      <div className="flex justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => {
            if (currentIndex === 0) onCancel();
            else setFormTab(steps[currentIndex - 1].key);
          }}
        >
          {currentIndex === 0 ? "Cancel" : "← Previous"}
        </Button>
        {currentIndex < steps.length - 1 ? (
          <Button onClick={() => setFormTab(steps[currentIndex + 1].key)}>Next →</Button>
        ) : (
          <Button onClick={onSubmit}>{isEditing ? "Update Staff" : "Submit"}</Button>
        )}
      </div>
    </>
  );
};

export default StaffForm;