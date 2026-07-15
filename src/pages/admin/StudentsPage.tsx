import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Search, Download, Filter, Eye, ArrowLeft, Trash2, Save, Pencil, FileText, Upload, X } from "lucide-react";
import { useStudentContext, Student } from "@/context/StudentContext";
import { toast } from "sonner";

const statusOptions = ["Active", "Suspended", "Disabled", "Graduated"];
const statusColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  Active: "default",
  Suspended: "destructive",
  Disabled: "outline",
  Graduated: "secondary",
};

const StudentsPage = () => {
  const { students, updateStudent, deleteStudent } = useStudentContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Student | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenStudent = (student: Student) => {
    setSelectedStudent(student);
    setEditData({ ...student });
    setIsEditing(false);
  };

  const handleEnableEdit = () => {
    setEditData({ ...selectedStudent! });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditData({ ...selectedStudent! });
    setIsEditing(false);
  };

  const handleSave = () => {
    if (!editData) return;
    updateStudent(editData.id, editData);
    setSelectedStudent(editData);
    setIsEditing(false);
    toast.success("Student updated successfully");
  };

  const handleDelete = () => {
    if (!selectedStudent) return;
    deleteStudent(selectedStudent.id);
    toast.success("Student deleted successfully");
    setSelectedStudent(null);
    setEditData(null);
    setShowDeleteConfirm(false);
  };

  const handleStatusUpdate = () => {
    if (!selectedStudent || !newStatus) return;
    updateStudent(selectedStudent.id, { status: newStatus });
    const updated = { ...selectedStudent, status: newStatus };
    setSelectedStudent(updated);
    setEditData(updated);
    setShowStatusDialog(false);
    toast.success(`Status changed to ${newStatus}`);
  };

  // Detail view (read-only by default)
  if (selectedStudent && editData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => { setSelectedStudent(null); setEditData(null); setIsEditing(false); }}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">{selectedStudent.name}</h1>
            <p className="text-muted-foreground text-sm">Adm No: {selectedStudent.id}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 className="w-4 h-4 mr-1" /> Delete
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setNewStatus(selectedStudent.status); setShowStatusDialog(true); }}>
              Update Status
            </Button>
            {!isEditing ? (
              <Button size="sm" onClick={handleEnableEdit}>
                <Pencil className="w-4 h-4 mr-1" /> Edit
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={handleCancelEdit}>Cancel</Button>
                <Button size="sm" onClick={handleSave}><Save className="w-4 h-4 mr-1" /> Save</Button>
              </>
            )}
          </div>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-6">
            {/* Personal Info */}
            <div>
              <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">First Name</Label>
                  {isEditing ? (
                    <Input value={editData.firstName} onChange={e => setEditData({ ...editData, firstName: e.target.value, name: `${e.target.value} ${editData.lastName}` })} />
                  ) : (
                    <p className="font-medium mt-1">{selectedStudent.firstName}</p>
                  )}
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Last Name</Label>
                  {isEditing ? (
                    <Input value={editData.lastName} onChange={e => setEditData({ ...editData, lastName: e.target.value, name: `${editData.firstName} ${e.target.value}` })} />
                  ) : (
                    <p className="font-medium mt-1">{selectedStudent.lastName}</p>
                  )}
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Date of Birth</Label>
                  {isEditing ? (
                    <Input type="date" value={editData.dob} onChange={e => setEditData({ ...editData, dob: e.target.value })} />
                  ) : (
                    <p className="font-medium mt-1">{selectedStudent.dob}</p>
                  )}
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Gender</Label>
                  {isEditing ? (
                    <Select value={editData.gender} onValueChange={v => setEditData({ ...editData, gender: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="font-medium mt-1">{selectedStudent.gender}</p>
                  )}
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Address</Label>
                  {isEditing ? (
                    <Input value={editData.address} onChange={e => setEditData({ ...editData, address: e.target.value })} />
                  ) : (
                    <p className="font-medium mt-1">{selectedStudent.address}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Academic Info */}
            <div>
              <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Academic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Admission Number</Label>
                  <p className="font-medium mt-1 font-mono">{selectedStudent.id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Grade</Label>
                  {isEditing ? (
                    <Input value={editData.grade} onChange={e => setEditData({ ...editData, grade: e.target.value })} />
                  ) : (
                    <p className="font-medium mt-1">{selectedStudent.grade}</p>
                  )}
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Stream</Label>
                  {isEditing ? (
                    <Input value={editData.stream} onChange={e => setEditData({ ...editData, stream: e.target.value })} />
                  ) : (
                    <p className="font-medium mt-1">{selectedStudent.stream}</p>
                  )}
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Status</Label>
                  <div className="mt-1">
                    <Badge variant={statusColors[selectedStudent.status] || "outline"}>{selectedStudent.status}</Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Parent/Guardian */}
            <div>
              <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Parent / Guardian</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Name</Label>
                  {isEditing ? (
                    <Input value={editData.parent} onChange={e => setEditData({ ...editData, parent: e.target.value })} />
                  ) : (
                    <p className="font-medium mt-1">{selectedStudent.parent}</p>
                  )}
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Phone</Label>
                  {isEditing ? (
                    <Input value={editData.parentPhone} onChange={e => setEditData({ ...editData, parentPhone: e.target.value })} />
                  ) : (
                    <p className="font-medium mt-1">{selectedStudent.parentPhone}</p>
                  )}
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Email</Label>
                  {isEditing ? (
                    <Input value={editData.parentEmail} onChange={e => setEditData({ ...editData, parentEmail: e.target.value })} />
                  ) : (
                    <p className="font-medium mt-1">{selectedStudent.parentEmail}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Medical */}
            <div>
              <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Medical Notes</h3>
              {isEditing ? (
                <Textarea value={editData.medicalNotes} onChange={e => setEditData({ ...editData, medicalNotes: e.target.value })} placeholder="Any medical conditions or notes..." />
              ) : (
                <p className="font-medium">{selectedStudent.medicalNotes || "—"}</p>
              )}
            </div>

            {/* Documents */}
            <div>
              <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Admission Documents</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Type</TableHead>
                    <TableHead>File Name</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(isEditing ? editData.documents : selectedStudent.documents)?.length > 0 ? (
                    (isEditing ? editData.documents : selectedStudent.documents).map((doc, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary" />
                            <span className="text-sm">{doc.type}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{doc.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {doc.size < 1024 * 1024 ? `${(doc.size / 1024).toFixed(1)} KB` : `${(doc.size / (1024 * 1024)).toFixed(1)} MB`}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => toast.info("Preview not available in demo mode")}>
                              <Eye className="w-4 h-4 mr-1" /> Preview
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => toast.info("Download not available in demo mode")}>
                              <Download className="w-4 h-4 mr-1" /> Download
                            </Button>
                            {isEditing && (
                              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => {
                                setEditData({ ...editData, documents: editData.documents.filter((_, idx) => idx !== i) });
                              }}>
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">
                        No documents uploaded
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {isEditing && (
                <div className="mt-3">
                  <Label className="text-sm font-medium mb-2 block">Upload New Document</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      id="student-doc-upload"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const docType = prompt("Document type (e.g. Birth Certificate, Transfer Letter, Medical Records):");
                        if (!docType) return;
                        setEditData({
                          ...editData,
                          documents: [...editData.documents, { name: file.name, type: docType, size: file.size }],
                        });
                        e.target.value = "";
                      }}
                    />
                    <Button variant="outline" size="sm" onClick={() => document.getElementById("student-doc-upload")?.click()}>
                      <Upload className="w-4 h-4 mr-1" /> Add Document
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Status Update Dialog */}
        <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Update Status</DialogTitle>
              <DialogDescription>Change status for {selectedStudent.name}</DialogDescription>
            </DialogHeader>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowStatusDialog(false)}>Cancel</Button>
              <Button onClick={handleStatusUpdate}>Update</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Student</AlertDialogTitle>
              <AlertDialogDescription>Are you sure you want to delete {selectedStudent.name}? This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Students</h1>
          <p className="text-muted-foreground">View enrolled student records — new students are added via Admissions</p>
        </div>
        <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" /> Export</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by name, admission number..." className="pl-10" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <Button variant="outline" size="sm"><Filter className="w-4 h-4 mr-1" /> Filters</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Adm No</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Stream</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-mono text-xs">{student.id}</TableCell>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>{student.grade}</TableCell>
                  <TableCell>{student.stream}</TableCell>
                  <TableCell>{student.gender}</TableCell>
                  <TableCell className="text-muted-foreground">{student.parent}</TableCell>
                  <TableCell>
                    <Badge variant={statusColors[student.status] || "outline"} className="text-[10px]">
                      {student.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenStudent(student)}>
                      <Eye className="w-4 h-4 mr-1" /> View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentsPage;
