import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, CalendarDays, CheckCircle, Clock, Upload, FileText, X } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import { toast } from "sonner";

interface LeaveTypeConfig {
  value: string;
  label: string;
  requiresDocument: boolean;
  acceptedDocTypes: string[];
}

const leaveTypeConfigs: LeaveTypeConfig[] = [
  { value: "annual", label: "Annual Leave", requiresDocument: false, acceptedDocTypes: [] },
  { value: "sick", label: "Sick Leave", requiresDocument: true, acceptedDocTypes: ["Medical Certificate", "Doctor's Note"] },
  { value: "personal", label: "Personal Leave", requiresDocument: false, acceptedDocTypes: [] },
  { value: "maternity", label: "Maternity Leave", requiresDocument: true, acceptedDocTypes: ["Medical Certificate"] },
  { value: "paternity", label: "Paternity Leave", requiresDocument: true, acceptedDocTypes: ["Birth Certificate"] },
  { value: "compassionate", label: "Compassionate Leave", requiresDocument: true, acceptedDocTypes: ["Death Certificate", "Hospital Admission Letter"] },
  { value: "study", label: "Study Leave", requiresDocument: true, acceptedDocTypes: ["Admission Letter", "Exam Timetable"] },
];

const myLeaves = [
  { type: "Sick Leave", from: "2026-02-10", to: "2026-02-11", days: 2, status: "Approved", document: "medical_cert.pdf" },
  { type: "Personal", from: "2026-01-20", to: "2026-01-20", days: 1, status: "Approved", document: null },
  { type: "Annual Leave", from: "2026-04-15", to: "2026-04-18", days: 4, status: "Pending", document: null },
  { type: "Study Leave", from: "2026-05-01", to: "2026-05-10", days: 10, status: "Pending", document: "admission_letter.pdf" },
  { type: "Compassionate Leave", from: "2025-11-05", to: "2025-11-07", days: 3, status: "Rejected", document: null },
];

const TeacherLeave = () => {
  const [selectedLeaveType, setSelectedLeaveType] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [selectedDocType, setSelectedDocType] = useState("");

  const currentConfig = leaveTypeConfigs.find((c) => c.value === selectedLeaveType);
  const requiresDoc = currentConfig?.requiresDocument ?? false;
  const acceptedDocs = currentConfig?.acceptedDocTypes ?? [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be under 5MB");
        return;
      }
      setUploadedFile(file);
    }
  };

  const handleSubmit = () => {
    if (!selectedLeaveType) {
      toast.error("Please select a leave type");
      return;
    }
    if (requiresDoc && !uploadedFile) {
      toast.error("This leave type requires a supporting document");
      return;
    }
    if (requiresDoc && acceptedDocs.length > 0 && !selectedDocType) {
      toast.error("Please select the document type");
      return;
    }
    toast.success("Leave request submitted successfully");
    setSelectedLeaveType("");
    setUploadedFile(null);
    setSelectedDocType("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leave Management</h1>
        <p className="text-muted-foreground">Request and track your leave</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Annual Leave" value="12 days" change="Remaining" changeType="neutral" icon={CalendarDays} iconColor="bg-primary/10 text-primary" />
        <StatCard title="Sick Leave" value="8 days" change="Remaining" changeType="neutral" icon={Calendar} iconColor="bg-info/10 text-info" />
        <StatCard title="Used This Year" value="3 days" icon={CheckCircle} iconColor="bg-success/10 text-success" />
        <StatCard title="Pending" value={0} icon={Clock} iconColor="bg-warning/10 text-warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Request Leave</CardTitle>
            <CardDescription>Submit a new leave application</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Leave Type</Label>
              <Select value={selectedLeaveType} onValueChange={(v) => { setSelectedLeaveType(v); setUploadedFile(null); setSelectedDocType(""); }}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {leaveTypeConfigs.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <span className="flex items-center gap-2">
                        {c.label}
                        {c.requiresDocument && <FileText className="w-3 h-3 text-amber-500" />}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>From</Label>
                <Input type="date" />
              </div>
              <div className="space-y-2">
                <Label>To</Label>
                <Input type="date" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea placeholder="Brief reason for leave..." rows={3} />
            </div>

            {/* Document upload section */}
            {requiresDoc && (
              <div className="space-y-3 p-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm font-medium">Supporting document required</span>
                </div>

                {acceptedDocs.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm">Document Type</Label>
                    <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                      <SelectTrigger><SelectValue placeholder="Select document type" /></SelectTrigger>
                      <SelectContent>
                        {acceptedDocs.map((dt) => (
                          <SelectItem key={dt} value={dt}>{dt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-sm">Upload Document</Label>
                  {uploadedFile ? (
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background">
                      <FileText className="w-5 h-5 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{uploadedFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setUploadedFile(null)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed border-muted-foreground/30 cursor-pointer hover:border-primary/50 transition-colors">
                      <Upload className="w-6 h-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Click to upload (PDF, JPG, PNG — max 5MB)</span>
                      <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} />
                    </label>
                  )}
                </div>
              </div>
            )}

            <Button className="w-full" onClick={handleSubmit}>Submit Request</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Leave History</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="all">All ({myLeaves.length})</TabsTrigger>
                <TabsTrigger value="pending">Pending ({myLeaves.filter(l => l.status === "Pending").length})</TabsTrigger>
                <TabsTrigger value="approved">Approved ({myLeaves.filter(l => l.status === "Approved").length})</TabsTrigger>
                <TabsTrigger value="rejected">Rejected ({myLeaves.filter(l => l.status === "Rejected").length})</TabsTrigger>
              </TabsList>
              {["all", "pending", "approved", "rejected"].map((tab) => {
                const filtered = tab === "all" ? myLeaves : myLeaves.filter((l) => l.status.toLowerCase() === tab);
                return (
                  <TabsContent key={tab} value={tab} className="space-y-3 mt-3">
                    {filtered.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No {tab === "all" ? "" : tab} leave requests</p>
                    ) : (
                      filtered.map((l, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border">
                          <div>
                            <p className="text-sm font-medium">{l.type}</p>
                            <p className="text-xs text-muted-foreground">{l.from} → {l.to} ({l.days} day{l.days > 1 ? "s" : ""})</p>
                            {l.document && (
                              <div className="flex items-center gap-1 mt-1">
                                <FileText className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs text-primary cursor-pointer hover:underline">{l.document}</span>
                              </div>
                            )}
                          </div>
                          <Badge
                            variant={l.status === "Approved" ? "default" : l.status === "Pending" ? "secondary" : "destructive"}
                            className="text-[10px]"
                          >
                            {l.status}
                          </Badge>
                        </div>
                      ))
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeacherLeave;
