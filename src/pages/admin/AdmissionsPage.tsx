import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, FileText, Users, CheckCircle, Clock, MoreVertical, ArrowRight, Upload, X, File, ArrowLeft } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import { useStudentContext } from "@/context/StudentContext";
import { toast } from "sonner";

const stages = ["Application Review", "Interview Scheduled", "Offer Sent", "Fee Payment"];

const stageColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  "Application Review": "secondary",
  "Interview Scheduled": "outline",
  "Offer Sent": "default",
  "Fee Payment": "outline",
};

const grades = ["PP1", "PP2", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9"];
const streams = ["A", "B", "C", "-"];

interface UploadedDoc {
  name: string;
  type: string;
  size: number;
  file: File;
}

const documentTypes = [
  "Birth Certificate",
  "Transfer Letter",
  "Previous School Report",
  "Passport Photo",
  "Medical Records",
  "Immunization Card",
  "Parent/Guardian ID Copy",
  "Other",
];

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const AdmissionsPage = () => {
  const { applications, addApplication, updateApplicationStage } = useStudentContext();
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    firstName: "", lastName: "", gender: "", dob: "",
    grade: "", stream: "",
    parentName: "", parentRelationship: "", parentPhone: "", parentEmail: "",
    address: "", medicalNotes: "", previousSchool: "", admissionType: "New",
  });

  const [documents, setDocuments] = useState<UploadedDoc[]>([]);
  const [selectedDocType, setSelectedDocType] = useState("");

  const resetForm = () => {
    setForm({ firstName: "", lastName: "", gender: "", dob: "", grade: "", stream: "", parentName: "", parentRelationship: "", parentPhone: "", parentEmail: "", address: "", medicalNotes: "", previousSchool: "", admissionType: "New" });
    setDocuments([]);
    setSelectedDocType("");
    setStep(1);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const docType = selectedDocType || "Other";
    const newDocs: UploadedDoc[] = Array.from(files).map(file => ({
      name: file.name,
      type: docType,
      size: file.size,
      file,
    }));
    setDocuments(prev => [...prev, ...newDocs]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!form.firstName || !form.lastName || !form.gender || !form.dob || !form.grade || !form.parentName || !form.parentPhone) {
      toast.error("Please fill in all required fields");
      return;
    }
    addApplication({ ...form, documents: documents.map(d => ({ name: d.name, type: d.type, size: d.size })) });
    setShowForm(false);
    resetForm();
    toast.success(`Application for ${form.firstName} ${form.lastName} has been created`);
  };

  const getNextStage = (current: string) => {
    const idx = stages.indexOf(current);
    return idx < stages.length - 1 ? stages[idx + 1] : null;
  };

  const handleAdvanceStage = (id: string, currentStage: string) => {
    if (currentStage === "Fee Payment") {
      updateApplicationStage(id, "Enrolled");
      toast.success("Student has been enrolled successfully and added to the Students register!");
      return;
    }
    const next = getNextStage(currentStage);
    if (!next) return;
    updateApplicationStage(id, next);
    toast.success(`Application moved to "${next}"`);
  };

  const totalApps = applications.filter(a => a.stage !== "Enrolled").length;
  const underReview = applications.filter(a => a.stage === "Application Review" || a.stage === "Interview Scheduled").length;
  const offersSent = applications.filter(a => a.stage === "Offer Sent" || a.stage === "Fee Payment").length;
  

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

        {/* Step indicators */}
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
            <CardTitle className="text-lg">
              Step {step} of 4 — {stepLabels[step - 1]}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {step === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Admission Type <span className="text-destructive">*</span></Label>
                  <Select value={form.admissionType} onValueChange={v => setForm({ ...form, admissionType: v })}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
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
                  <Select value={form.grade} onValueChange={v => setForm({ ...form, grade: v })}>
                    <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                    <SelectContent>
                      {grades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Stream</Label>
                  <Select value={form.stream} onValueChange={v => setForm({ ...form, stream: v })}>
                    <SelectTrigger><SelectValue placeholder="Select stream" /></SelectTrigger>
                    <SelectContent>
                      {streams.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Separator className="col-span-full" />
                <div className="col-span-full">
                  <p className="text-sm font-medium text-muted-foreground mb-4">Parent / Guardian Information</p>
                </div>
                <div className="space-y-2">
                  <Label>Full Name <span className="text-destructive">*</span></Label>
                  <Input value={form.parentName} onChange={e => setForm({ ...form, parentName: e.target.value })} placeholder="e.g. Mrs. Kamau" />
                </div>
                <div className="space-y-2">
                  <Label>Relationship <span className="text-destructive">*</span></Label>
                  <Select value={form.parentRelationship} onValueChange={v => setForm({ ...form, parentRelationship: v })}>
                    <SelectTrigger><SelectValue placeholder="Select relationship" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Father">Father</SelectItem>
                      <SelectItem value="Mother">Mother</SelectItem>
                      <SelectItem value="Guardian">Guardian</SelectItem>
                      <SelectItem value="Uncle">Uncle</SelectItem>
                      <SelectItem value="Aunt">Aunt</SelectItem>
                      <SelectItem value="Grandparent">Grandparent</SelectItem>
                      <SelectItem value="Sibling">Sibling</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
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
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Upload supporting documents such as birth certificates, transfer letters, medical records, etc.
                  </p>

                  <div className="flex items-end gap-3">
                    <div className="space-y-2 flex-1 max-w-xs">
                      <Label>Document Type</Label>
                      <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                        <SelectTrigger><SelectValue placeholder="Select document type" /></SelectTrigger>
                        <SelectContent>
                          {documentTypes.map(dt => <SelectItem key={dt} value={dt}>{dt}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        multiple
                        onChange={handleFileUpload}
                      />
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (!selectedDocType) {
                            toast.error("Please select a document type first");
                            return;
                          }
                          fileInputRef.current?.click();
                        }}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Choose File
                      </Button>
                    </div>
                  </div>

                  {/* Drop zone */}
                  <div
                    className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => {
                      if (!selectedDocType) {
                        toast.error("Please select a document type first");
                        return;
                      }
                      fileInputRef.current?.click();
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (!selectedDocType) {
                        toast.error("Please select a document type first");
                        return;
                      }
                      const docType = selectedDocType || "Other";
                      const files = Array.from(e.dataTransfer.files);
                      const newDocs: UploadedDoc[] = files.map(file => ({
                        name: file.name,
                        type: docType,
                        size: file.size,
                        file,
                      }));
                      setDocuments(prev => [...prev, ...newDocs]);
                    }}
                  >
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Drag and drop files here, or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Supported: PDF, JPG, PNG, DOC, DOCX (max 20MB)
                    </p>
                  </div>

                  {/* Uploaded documents list */}
                  {documents.length > 0 && (
                    <div className="space-y-2">
                      <Label>Uploaded Documents ({documents.length})</Label>
                      <div className="space-y-2">
                        {documents.map((doc, i) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                            <div className="flex items-center gap-3">
                              <File className="w-5 h-5 text-primary" />
                              <div>
                                <p className="text-sm font-medium">{doc.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  <Badge variant="outline" className="text-[10px] mr-2">{doc.type}</Badge>
                                  {formatFileSize(doc.size)}
                                </p>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeDocument(i)}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between">
          <div>
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>Back</Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
            {step < 4 ? (
              <Button onClick={() => {
                if (step === 1 && (!form.firstName || !form.lastName || !form.gender || !form.dob)) {
                  toast.error("Please fill in all required fields");
                  return;
                }
                if (step === 2 && (!form.grade || !form.parentName || !form.parentPhone)) {
                  toast.error("Please fill in all required fields");
                  return;
                }
                setStep(step + 1);
              }}>Next</Button>
            ) : (
              <Button onClick={handleSubmit}>Submit Application</Button>
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
        <StatCard title="Total Applications" value={totalApps} icon={FileText} iconColor="bg-primary/10 text-primary" />
        <StatCard title="Under Review" value={underReview} icon={Clock} iconColor="bg-warning/10 text-warning" />
        <StatCard title="Offers Sent" value={offersSent} icon={Users} iconColor="bg-info/10 text-info" />
        <StatCard title="Enrolled" value={applications.filter(a => a.stage === "Enrolled").length} icon={CheckCircle} iconColor="bg-success/10 text-success" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Admission Pipeline</CardTitle>
          <CardDescription>Track applications through each stage</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="mb-4">
              <TabsTrigger value="all">All ({applications.filter(a => a.stage !== "Enrolled").length})</TabsTrigger>
              <TabsTrigger value="review">Application Review ({applications.filter(a => a.stage === "Application Review").length})</TabsTrigger>
              <TabsTrigger value="interview">Interview Scheduled ({applications.filter(a => a.stage === "Interview Scheduled").length})</TabsTrigger>
              <TabsTrigger value="waiting">Waiting Enrolment ({applications.filter(a => a.stage === "Offer Sent" || a.stage === "Fee Payment").length})</TabsTrigger>
            </TabsList>
            {["all", "review", "interview", "waiting"].map(tab => {
              const filtered = applications.filter(app => {
                if (tab === "all") return app.stage !== "Enrolled";
                if (tab === "review") return app.stage === "Application Review";
                if (tab === "interview") return app.stage === "Interview Scheduled";
                if (tab === "waiting") return app.stage === "Offer Sent" || app.stage === "Fee Payment";
                return true;
              });
              return (
                <TabsContent key={tab} value={tab}>
                  {filtered.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No applications in this category</p>
                  ) : (
                    <div className="space-y-3">
                      {filtered.map((app) => (
                        <div key={app.id} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-bold text-primary">{app.name.charAt(0)}</span>
                            </div>
                            <div>
                              <p className="font-medium text-sm">{app.name}</p>
                              <p className="text-xs text-muted-foreground">{app.grade} · {app.parentPhone}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">{app.date}</span>
                            <Badge variant={stageColors[app.stage]} className="text-[10px]">{app.stage}</Badge>
                            {app.stage !== "Enrolled" && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleAdvanceStage(app.id, app.stage)}>
                                    <ArrowRight className="w-4 h-4 mr-2" />
                                    {app.stage === "Fee Payment" ? "Enrol Student" : `Move to ${getNextStage(app.stage)}`}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdmissionsPage;
