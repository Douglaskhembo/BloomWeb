import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Plus, FileText, Users, CheckCircle, Clock, ArrowRight, Upload, X, File, ArrowLeft, Eye, Banknote } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import { useStudentContext, STAGE_LABELS, Application } from "@/context/StudentContext";
import { SchoolApi, FeeApi } from "@/services/api";
import Swal from "sweetalert2";
import { getBackendErrorMessage } from "@/utils/errorHandler";
import AdmissionViewModal from "@/components/modal/AdmissionViewModal";
import AdmissionPaymentModal from "@/components/modal/AdmissionPaymentModal";

const STAGE_BADGE: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  APPLICATION_REVIEW: "secondary",
  INTERVIEW_SCHEDULED: "outline",
  OFFER_SENT: "default",
  FEE_PAYMENT: "outline",
  ENROLLED: "default",
};

const documentTypes = ["Birth Certificate", "Transfer Letter", "Previous School Report", "Passport Photo", "Medical Records", "Immunization Card", "Parent/Guardian ID Copy", "Other"];

interface UploadedDoc { name: string; type: string; size: number; file: File; }

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const AdmissionsPage = () => {
  const { applications, addApplication, updateApplicationStage, getNextStage, loadingApplications } = useStudentContext();
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState(1);
  const [viewingApp, setViewingApp] = useState<Application | null>(null);
  const [payingApp, setPayingApp] = useState<Application | null>(null);
  const [confirmedPaymentUuids, setConfirmedPaymentUuids] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [grades, setGrades] = useState<{ uuid: string; name: string; displayOrder: number; streamNames: string[] }[]>([]);

  const feePaymentStageUuids = applications.filter(a => a.stage === "FEE_PAYMENT").map(a => a.uuid).join(",");

  useEffect(() => {
    const uuids = feePaymentStageUuids ? feePaymentStageUuids.split(",") : [];
    if (uuids.length === 0) return;
    let cancelled = false;
    Promise.all(uuids.map(uuid =>
      FeeApi.getPayments({ admissionUuid: uuid }).then(rows => ({
        uuid,
        confirmed: Array.isArray(rows) && rows.some((r: any) => r.verificationStatus === "CONFIRMED"),
      }))
    )).then(results => {
      if (cancelled) return;
      setConfirmedPaymentUuids(new Set(results.filter(r => r.confirmed).map(r => r.uuid)));
    });
    return () => { cancelled = true; };
  }, [feePaymentStageUuids]);

  useEffect(() => {
    SchoolApi.getGradeLevels().then((data) => {
      const list = Array.isArray(data) ? data : [];
      setGrades(
        list
          .map((g: any) => ({ uuid: g.uuid, name: g.name, displayOrder: g.displayOrder, streamNames: Array.isArray(g.streamNames) ? g.streamNames : [] }))
          .sort((a, b) => a.displayOrder - b.displayOrder)
      );
    });
  }, []);

  const [form, setForm] = useState({
    firstName: "", lastName: "", gender: "", dob: "", birthCertificateNumber: "",
    grade: "", gradeLevelUuid: "", stream: "", boarderStatus: "",
    parentName: "", parentRelationship: "", parentPhone: "", parentEmail: "",
    address: "", medicalNotes: "", previousSchool: "", admissionType: "New",
  });
  const [documents, setDocuments] = useState<UploadedDoc[]>([]);
  const [selectedDocType, setSelectedDocType] = useState("");

  const selectedGradeStreams = grades.find((g) => g.uuid === form.gradeLevelUuid)?.streamNames ?? [];

  const resetForm = () => {
    setForm({ firstName: "", lastName: "", gender: "", dob: "", birthCertificateNumber: "", grade: "", gradeLevelUuid: "", stream: "", boarderStatus: "", parentName: "", parentRelationship: "", parentPhone: "", parentEmail: "", address: "", medicalNotes: "", previousSchool: "", admissionType: "New" });
    setDocuments([]);
    setSelectedDocType("");
    setStep(1);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const docType = selectedDocType || "Other";
    setDocuments(prev => [...prev, ...Array.from(files).map(file => ({ name: file.name, type: docType, size: file.size, file }))]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!form.firstName || !form.lastName || !form.gender || !form.dob || !form.grade || !form.parentName || !form.parentPhone || (selectedGradeStreams.length > 0 && !form.stream)) {
      Swal.fire({ icon: "error", title: "Error", text: "Please fill in all required fields", showConfirmButton: true });
      return;
    }
    setSubmitting(true);
    try {
      await addApplication({ ...form, documents: documents.map(d => ({ name: d.name, type: d.type, size: d.size })) });
      setShowForm(false);
      resetForm();
      Swal.fire({ title: "Success", text: `Application for ${form.firstName} ${form.lastName} submitted`, icon: "success", showConfirmButton: true });
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Error", text: getBackendErrorMessage(err, "Failed to submit application"), showConfirmButton: true });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdvanceStage = async (uuid: string, currentStage: string) => {
    const next = currentStage === "FEE_PAYMENT" ? "ENROLLED" : getNextStage(currentStage);
    if (!next) return;
    try {
      await updateApplicationStage(uuid, next);
      if (next === "ENROLLED") {
        Swal.fire({ title: "Success", text: "Student enrolled and added to the Students register!", icon: "success", showConfirmButton: true });
      } else {
        Swal.fire({ title: "Success", text: `Moved to "${STAGE_LABELS[next]}"`, icon: "success", showConfirmButton: true });
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Error", text: getBackendErrorMessage(err, "Failed to update stage"), showConfirmButton: true });
    }
  };

  const active = applications.filter(a => a.stage !== "ENROLLED" && a.stage !== "REJECTED");
  const stepLabels = ["Student Info", "Class & Guardian", "Additional Details", "Documents"];

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); resetForm(); }}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">New Application</h1>
            <p className="text-muted-foreground">Fill in the student details to create an admission application</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex-1">
              <div className={`h-1.5 rounded-full transition-colors ${i + 1 <= step ? "bg-primary" : "bg-muted"}`} />
              <p className={`text-xs mt-1 text-center ${i + 1 <= step ? "text-primary font-medium" : "text-muted-foreground"}`}>{label}</p>
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Step {step} of 4 — {stepLabels[step - 1]}</CardTitle>
          </CardHeader>
          <CardContent>
            {step === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Admission Type</Label>
                  <Select value={form.admissionType} onValueChange={v => setForm({ ...form, admissionType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New">New Student</SelectItem>
                      <SelectItem value="Transfer">Transfer Student</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>First Name <span className="text-destructive">*</span></Label>
                  <Input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} placeholder="e.g. Joy" />
                </div>
                <div className="space-y-2">
                  <Label>Last Name <span className="text-destructive">*</span></Label>
                  <Input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} placeholder="e.g. Kamau" />
                </div>
                <div className="space-y-2">
                  <Label>Gender <span className="text-destructive">*</span></Label>
                  <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v })}>
                    <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date of Birth <span className="text-destructive">*</span></Label>
                  <Input type="date" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Birth Certificate Number</Label>
                  <Input value={form.birthCertificateNumber} onChange={e => setForm({ ...form, birthCertificateNumber: e.target.value })} placeholder="e.g. 12345678" />
                </div>
                {form.admissionType === "Transfer" && (
                  <div className="space-y-2">
                    <Label>Previous School</Label>
                    <Input value={form.previousSchool} onChange={e => setForm({ ...form, previousSchool: e.target.value })} placeholder="e.g. Sunshine Academy" />
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Grade <span className="text-destructive">*</span></Label>
                  <Select value={form.grade} onValueChange={v => {
                      const gl = grades.find(g => g.name === v);
                      // Changing grade resets stream — the previous grade's stream name may not
                      // exist (or may mean something different) under the newly selected grade.
                      setForm({ ...form, grade: v, gradeLevelUuid: gl?.uuid ?? "", stream: "" });
                    }}>
                    <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                    <SelectContent>{grades.map(g => <SelectItem key={g.uuid} value={g.name}>{g.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {selectedGradeStreams.length > 0 && (
                  <div className="space-y-2">
                    <Label>Stream <span className="text-destructive">*</span></Label>
                    <Select value={form.stream} onValueChange={v => setForm({ ...form, stream: v })}>
                      <SelectTrigger><SelectValue placeholder="Select stream" /></SelectTrigger>
                      <SelectContent>{selectedGradeStreams.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Day Scholar / Boarder</Label>
                  <Select value={form.boarderStatus} onValueChange={v => setForm({ ...form, boarderStatus: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAY_SCHOLAR">Day Scholar</SelectItem>
                      <SelectItem value="BOARDER">Boarder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Separator className="col-span-full" />
                <div className="col-span-full"><p className="text-sm font-medium text-muted-foreground mb-4">Parent / Guardian Information</p></div>
                <div className="space-y-2">
                  <Label>Full Name <span className="text-destructive">*</span></Label>
                  <Input value={form.parentName} onChange={e => setForm({ ...form, parentName: e.target.value })} placeholder="e.g. Mrs. Kamau" />
                </div>
                <div className="space-y-2">
                  <Label>Relationship</Label>
                  <Select value={form.parentRelationship} onValueChange={v => setForm({ ...form, parentRelationship: v })}>
                    <SelectTrigger><SelectValue placeholder="Select relationship" /></SelectTrigger>
                    <SelectContent>
                      {["Father", "Mother", "Guardian", "Uncle", "Aunt", "Grandparent", "Sibling", "Other"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Phone Number <span className="text-destructive">*</span></Label>
                  <Input value={form.parentPhone} onChange={e => setForm({ ...form, parentPhone: e.target.value })} placeholder="+254..." />
                </div>
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input type="email" value={form.parentEmail} onChange={e => setForm({ ...form, parentEmail: e.target.value })} placeholder="email@example.com" />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 col-span-full">
                  <Label>Home Address</Label>
                  <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="e.g. Nairobi, Kenya" />
                </div>
                <div className="space-y-2 col-span-full">
                  <Label>Medical Notes</Label>
                  <Textarea value={form.medicalNotes} onChange={e => setForm({ ...form, medicalNotes: e.target.value })} placeholder="Any allergies, conditions, or special needs..." rows={3} />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground">Upload supporting documents such as birth certificates, transfer letters, medical records, etc.</p>
                <div className="flex items-end gap-3">
                  <div className="space-y-2 flex-1 max-w-xs">
                    <Label>Document Type</Label>
                    <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                      <SelectTrigger><SelectValue placeholder="Select document type" /></SelectTrigger>
                      <SelectContent>{documentTypes.map(dt => <SelectItem key={dt} value={dt}>{dt}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" multiple onChange={handleFileUpload} />
                    <Button variant="outline" onClick={() => { if (!selectedDocType) { Swal.fire({ icon: "error", title: "Error", text: "Select a document type first", showConfirmButton: true }); return; } fileInputRef.current?.click(); }}>
                      <Upload className="w-4 h-4 mr-2" /> Choose File
                    </Button>
                  </div>
                </div>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => { if (!selectedDocType) { Swal.fire({ icon: "error", title: "Error", text: "Select a document type first", showConfirmButton: true }); return; } fileInputRef.current?.click(); }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    if (!selectedDocType) { Swal.fire({ icon: "error", title: "Error", text: "Select a document type first", showConfirmButton: true }); return; }
                    const newDocs = Array.from(e.dataTransfer.files).map(file => ({ name: file.name, type: selectedDocType, size: file.size, file }));
                    setDocuments(prev => [...prev, ...newDocs]);
                  }}>
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Drag and drop files here, or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">Supported: PDF, JPG, PNG, DOC, DOCX</p>
                </div>
                {documents.length > 0 && (
                  <div className="space-y-2">
                    <Label>Uploaded Documents ({documents.length})</Label>
                    {documents.map((doc, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                        <div className="flex items-center gap-3">
                          <File className="w-5 h-5 text-primary" />
                          <div>
                            <p className="text-sm font-medium">{doc.name}</p>
                            <p className="text-xs text-muted-foreground"><Badge variant="outline" className="text-[10px] mr-2">{doc.type}</Badge>{formatFileSize(doc.size)}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDocuments(prev => prev.filter((_, idx) => idx !== i))}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <div>{step > 1 && <Button variant="outline" onClick={() => setStep(step - 1)}>Back</Button>}</div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
            {step < 4 ? (
              <Button onClick={() => {
                if (step === 1 && (!form.firstName || !form.lastName || !form.gender || !form.dob)) { Swal.fire({ icon: "error", title: "Error", text: "Please fill in all required fields", showConfirmButton: true }); return; }
                if (step === 2 && (!form.grade || !form.parentName || !form.parentPhone || (selectedGradeStreams.length > 0 && !form.stream))) { Swal.fire({ icon: "error", title: "Error", text: "Please fill in all required fields", showConfirmButton: true }); return; }
                setStep(step + 1);
              }}>Next</Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Submitting..." : "Submit Application"}</Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admissions</h1>
          <p className="text-muted-foreground">Manage the multi-stage admission workflow</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" /> New Application</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Applications" value={active.length} icon={FileText} iconColor="bg-primary/10 text-primary" />
        <StatCard title="Under Review" value={active.filter(a => a.stage === "APPLICATION_REVIEW" || a.stage === "INTERVIEW_SCHEDULED").length} icon={Clock} iconColor="bg-warning/10 text-warning" />
        <StatCard title="Offers Sent" value={active.filter(a => a.stage === "OFFER_SENT" || a.stage === "FEE_PAYMENT").length} icon={Users} iconColor="bg-info/10 text-info" />
        <StatCard title="Enrolled" value={applications.filter(a => a.stage === "ENROLLED").length} icon={CheckCircle} iconColor="bg-success/10 text-success" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Admission Pipeline</CardTitle>
          <CardDescription>Track applications through each stage</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingApplications ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading applications...</p>
          ) : (
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">All ({active.length})</TabsTrigger>
                <TabsTrigger value="review">Application Review ({active.filter(a => a.stage === "APPLICATION_REVIEW").length})</TabsTrigger>
                <TabsTrigger value="interview">Interview Scheduled ({active.filter(a => a.stage === "INTERVIEW_SCHEDULED").length})</TabsTrigger>
                <TabsTrigger value="waiting">Waiting Enrolment ({active.filter(a => a.stage === "OFFER_SENT" || a.stage === "FEE_PAYMENT").length})</TabsTrigger>
              </TabsList>
              {(["all", "review", "interview", "waiting"] as const).map(tab => {
                const filtered = active.filter(app => {
                  if (tab === "all") return true;
                  if (tab === "review") return app.stage === "APPLICATION_REVIEW";
                  if (tab === "interview") return app.stage === "INTERVIEW_SCHEDULED";
                  if (tab === "waiting") return app.stage === "OFFER_SENT" || app.stage === "FEE_PAYMENT";
                  return true;
                });
                return (
                  <TabsContent key={tab} value={tab}>
                    {filtered.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No applications in this category</p>
                    ) : (
                      <div className="space-y-3">
                        {filtered.map(app => (
                          <div key={app.id} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                            <button
                              type="button"
                              className="flex items-center gap-3 text-left flex-1 min-w-0"
                              onClick={() => setViewingApp(app)}
                            >
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="text-sm font-bold text-primary">{app.firstName?.charAt(0) ?? "?"}</span>
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{app.firstName} {app.lastName}</p>
                                <p className="text-xs text-muted-foreground truncate">{app.grade} · {app.parentPhone}</p>
                              </div>
                            </button>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground">{app.createdAt?.split("T")[0]}</span>
                              <Badge variant={STAGE_BADGE[app.stage] ?? "outline"} className="text-[10px]">{STAGE_LABELS[app.stage] ?? app.stage}</Badge>
                              {app.stage === "FEE_PAYMENT" && (
                                <Badge variant={confirmedPaymentUuids.has(app.uuid) ? "default" : "destructive"} className="text-[10px]">
                                  {confirmedPaymentUuids.has(app.uuid) ? "Payment Confirmed" : "Payment Not Received"}
                                </Badge>
                              )}
                              <Button size="sm" variant="outline" onClick={() => setViewingApp(app)}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              {app.stage === "FEE_PAYMENT" && (
                                <Button size="sm" variant="outline" onClick={() => setPayingApp(app)}>
                                  <Banknote className="w-4 h-4 mr-1" /> Record Payment
                                </Button>
                              )}
                              <Button
                                size="sm"
                                onClick={() => handleAdvanceStage(app.uuid, app.stage)}
                                disabled={app.stage === "FEE_PAYMENT" && !confirmedPaymentUuids.has(app.uuid)}
                                title={app.stage === "FEE_PAYMENT" && !confirmedPaymentUuids.has(app.uuid) ? "Record and confirm at least one payment before enrolling" : undefined}
                              >
                                {app.stage === "FEE_PAYMENT" ? "Enrol Student" : `Move to ${STAGE_LABELS[getNextStage(app.stage) ?? ""] ?? "Next"}`}
                                <ArrowRight className="w-4 h-4 ml-1" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
        </CardContent>
      </Card>

      <AdmissionViewModal open={!!viewingApp} onOpenChange={(open) => !open && setViewingApp(null)} application={viewingApp} />
      <AdmissionPaymentModal
        open={!!payingApp}
        onOpenChange={(open) => !open && setPayingApp(null)}
        application={payingApp}
        onRecorded={(payment) => {
          if (payingApp && payment.verificationStatus === "CONFIRMED") {
            setConfirmedPaymentUuids(prev => new Set(prev).add(payingApp.uuid));
          }
        }}
      />
    </div>
  );
};

export default AdmissionsPage;
