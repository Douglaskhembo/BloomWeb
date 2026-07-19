import { useEffect, useState } from "react";
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
import { useAuth } from "@/context/AuthContext";
import { LeaveApi, StaffApi } from "@/services/api";
import { getBackendErrorMessage } from "@/utils/errorHandler";

const STATUS_LABELS: Record<string, string> = { PENDING: "Pending", APPROVED: "Approved", REJECTED: "Rejected" };

const TeacherLeave = () => {
  const { user } = useAuth();
  const [staff, setStaff] = useState<any | null>(null);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [myLeaves, setMyLeaves] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [selectedDocType, setSelectedDocType] = useState("");

  const currentType = leaveTypes.find((t) => String(t.id) === selectedLeaveTypeId);
  const requiresDoc = currentType?.requiresDocument ?? false;
  const acceptedDocs: string[] = currentType?.documentTypes ?? [];

  const load = async (staffId: string) => {
    setLoading(true);
    try {
      const [types, leaves, bal] = await Promise.all([
        LeaveApi.getTypes(),
        LeaveApi.getRequests(staffId),
        LeaveApi.getBalances(staffId),
      ]);
      setLeaveTypes(types.filter((t) => t.active));
      setMyLeaves(leaves);
      setBalances(bal);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.profileRef) return;
    StaffApi.getByUuid(user.profileRef).then((s) => {
      setStaff(s);
      load(s.staffId);
    }).catch(() => setStaff(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.profileRef]);

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

  const resetForm = () => {
    setSelectedLeaveTypeId("");
    setFromDate("");
    setToDate("");
    setReason("");
    setUploadedFile(null);
    setSelectedDocType("");
  };

  const handleSubmit = async () => {
    if (!staff) {
      toast.error("Your staff profile could not be found");
      return;
    }
    if (!selectedLeaveTypeId) {
      toast.error("Please select a leave type");
      return;
    }
    if (!fromDate || !toDate) {
      toast.error("Please select the leave dates");
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
    setSubmitting(true);
    try {
      await LeaveApi.createRequest({
        staffId: staff.staffId,
        staffName: `${staff.firstName} ${staff.lastName}`,
        leaveTypeId: Number(selectedLeaveTypeId),
        fromDate,
        toDate,
        reason,
        documentName: uploadedFile?.name,
        documentType: selectedDocType || undefined,
      });
      toast.success("Leave request submitted successfully");
      resetForm();
      load(staff.staffId);
    } catch (err) {
      toast.error(getBackendErrorMessage(err, "Failed to submit leave request"));
    } finally {
      setSubmitting(false);
    }
  };

  const usedThisYear = myLeaves
    .filter((l) => l.status === "APPROVED" && new Date(l.fromDate).getFullYear() === new Date().getFullYear())
    .reduce((sum, l) => sum + (l.days ?? 0), 0);
  const pendingCount = myLeaves.filter((l) => l.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leave Management</h1>
        <p className="text-muted-foreground">Request and track your leave</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {balances.slice(0, 2).map((b) => (
          <StatCard key={b.leaveTypeId} title={b.leaveTypeName} value={`${b.remainingDays} days`} change="Remaining" changeType="neutral" icon={CalendarDays} iconColor="bg-primary/10 text-primary" />
        ))}
        <StatCard title="Used This Year" value={`${usedThisYear} days`} icon={CheckCircle} iconColor="bg-success/10 text-success" />
        <StatCard title="Pending" value={pendingCount} icon={Clock} iconColor="bg-warning/10 text-warning" />
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
              <Select value={selectedLeaveTypeId} onValueChange={(v) => { setSelectedLeaveTypeId(v); setUploadedFile(null); setSelectedDocType(""); }}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      <span className="flex items-center gap-2">
                        {t.name}
                        {t.requiresDocument && <FileText className="w-3 h-3 text-amber-500" />}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>From</Label>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>To</Label>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea placeholder="Brief reason for leave..." rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
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
                  <p className="text-[11px] text-muted-foreground">Only the file name is recorded — this project doesn't yet store the uploaded file itself.</p>
                </div>
              </div>
            )}

            <Button className="w-full" disabled={submitting || !staff} onClick={handleSubmit}>
              {submitting ? "Submitting..." : "Submit Request"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Leave History</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
            ) : (
            <Tabs defaultValue="all">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="all">All ({myLeaves.length})</TabsTrigger>
                <TabsTrigger value="pending">Pending ({myLeaves.filter(l => l.status === "PENDING").length})</TabsTrigger>
                <TabsTrigger value="approved">Approved ({myLeaves.filter(l => l.status === "APPROVED").length})</TabsTrigger>
                <TabsTrigger value="rejected">Rejected ({myLeaves.filter(l => l.status === "REJECTED").length})</TabsTrigger>
              </TabsList>
              {(["all", "pending", "approved", "rejected"] as const).map((tab) => {
                const filtered = tab === "all" ? myLeaves : myLeaves.filter((l) => l.status.toLowerCase() === tab);
                return (
                  <TabsContent key={tab} value={tab} className="space-y-3 mt-3">
                    {filtered.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No {tab === "all" ? "" : tab} leave requests</p>
                    ) : (
                      filtered.map((l) => (
                        <div key={l.uuid} className="flex items-center justify-between p-3 rounded-lg border border-border">
                          <div>
                            <p className="text-sm font-medium">{l.leaveType?.name}</p>
                            <p className="text-xs text-muted-foreground">{l.fromDate} → {l.toDate} ({l.days} day{l.days > 1 ? "s" : ""})</p>
                            {l.documentName && (
                              <div className="flex items-center gap-1 mt-1">
                                <FileText className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{l.documentName}</span>
                              </div>
                            )}
                          </div>
                          <Badge
                            variant={l.status === "APPROVED" ? "default" : l.status === "PENDING" ? "secondary" : "destructive"}
                            className="text-[10px]"
                          >
                            {STATUS_LABELS[l.status] ?? l.status}
                          </Badge>
                        </div>
                      ))
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeacherLeave;
