import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { BookOpen, Users, ArrowLeft, Save, Plus } from "lucide-react";
import Swal from "sweetalert2";
import Pagination from "@/utils/Pagination";
import { useAuth } from "@/context/AuthContext";
import { StaffApi, AssessmentApi, GradingApi } from "@/services/api";
import { getBackendErrorMessage } from "@/utils/errorHandler";

const terms = ["Term 1", "Term 2", "Term 3"];
const currentYear = new Date().getFullYear();

const TeacherClasses = () => {
  const { user } = useAuth();
  const [staff, setStaff] = useState<any | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [mode, setMode] = useState<"list" | "view" | "scores">("list");

  const [assessments, setAssessments] = useState<any[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<any | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [rowsLoading, setRowsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showScoreModal, setShowScoreModal] = useState(false);
  const [modalClass, setModalClass] = useState<any | null>(null);
  const [modalAssessmentUuid, setModalAssessmentUuid] = useState<string>("__new__");
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"CAT" | "EXAM">("CAT");
  const [newTerm, setNewTerm] = useState("");
  const [newYear, setNewYear] = useState(String(currentYear));
  const [modalAssessments, setModalAssessments] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);

  const [studentsPage, setStudentsPage] = useState(1);
  const [studentsPerPage, setStudentsPerPage] = useState(10);
  const [gradingStructures, setGradingStructures] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.profileRef) return;
    StaffApi.getByUuid(user.profileRef).then(setStaff).catch(() => setStaff(null));
  }, [user?.profileRef]);

  useEffect(() => {
    GradingApi.getAll().then(setGradingStructures);
  }, []);

  // Looks up the grade label/points/remark for a percentage using whatever grading structure is
  // configured (Admin > Management > Grading Structure) for this class's grade — no scale is
  // assumed here, so a grade with no structure configured just shows no grade info.
  const getGradeInfo = (percentage: number | null, grade?: string): { label: string; points: number; remark: string } | null => {
    if (percentage === null || isNaN(percentage) || !grade) return null;
    const structure = gradingStructures.find((s) => s.grade === grade);
    const entry = structure?.entries?.find((e: any) => percentage >= e.minScore && percentage <= e.maxScore);
    return entry ? { label: entry.label, points: entry.points, remark: entry.remark } : null;
  };

  useEffect(() => {
    if (!staff?.uuid) return;
    setLoadingClasses(true);
    AssessmentApi.getMyClasses(staff.uuid).then((data) => {
      setClasses(data);
      setLoadingClasses(false);
    });
  }, [staff?.uuid]);

  const classKey = (c: any) => `${c.gradeLevelUuid}|${c.stream}|${c.subjectUuid}`;

  const assessmentLabel = (a: any) => `${a.name} — ${a.term} ${a.year}`;

  const openScoreModal = async (cls: any) => {
    setModalClass(cls);
    setModalAssessmentUuid("__new__");
    setNewName("");
    setNewType("CAT");
    setNewTerm("");
    setNewYear(String(currentYear));
    setShowScoreModal(true);
    if (staff?.uuid) {
      const list = await AssessmentApi.getMine(staff.uuid, cls.gradeLevelUuid, cls.stream, cls.subjectUuid);
      setModalAssessments(list);
    }
  };

  const loadMarksFor = async (assessment: any) => {
    setRowsLoading(true);
    try {
      const marks = await AssessmentApi.getMarks(assessment.uuid);
      setRows(marks);
      const initialScores: Record<string, string> = {};
      marks.forEach((m: any) => { initialScores[m.studentUuid] = m.score === null || m.score === undefined ? "" : String(m.score); });
      setScores(initialScores);
    } finally {
      setRowsLoading(false);
    }
  };

  const handleModalProceed = async () => {
    if (!modalClass) return;
    setCreating(true);
    try {
      let assessment;
      if (modalAssessmentUuid === "__new__") {
        if (!newName.trim() || !newTerm) {
          Swal.fire({ icon: "error", title: "Error", text: "Please provide a name and term for the new assessment" });
          setCreating(false);
          return;
        }
        assessment = await AssessmentApi.create({
          name: newName.trim(),
          type: newType,
          term: newTerm,
          year: Number(newYear),
          subjectUuid: modalClass.subjectUuid,
          gradeLevelUuid: modalClass.gradeLevelUuid,
          stream: modalClass.stream,
        });
      } else {
        assessment = modalAssessments.find((a) => a.uuid === modalAssessmentUuid);
      }
      setSelectedClass(modalClass);
      setSelectedAssessment(assessment);
      await loadMarksFor(assessment);
      setShowScoreModal(false);
      setMode("scores");
      setStudentsPage(1);
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: getBackendErrorMessage(err, "Failed to prepare assessment") });
    } finally {
      setCreating(false);
    }
  };

  const handleViewStudents = async (cls: any) => {
    setSelectedClass(cls);
    setMode("view");
    setStudentsPage(1);
    if (staff?.uuid) {
      const list = await AssessmentApi.getMine(staff.uuid, cls.gradeLevelUuid, cls.stream, cls.subjectUuid);
      setAssessments(list);
      if (list.length > 0) {
        setSelectedAssessment(list[0]);
        await loadMarksFor(list[0]);
      } else {
        setSelectedAssessment(null);
        setRows([]);
      }
    }
  };

  const handleSelectViewAssessment = async (uuid: string) => {
    const a = assessments.find((x) => x.uuid === uuid);
    if (!a) return;
    setSelectedAssessment(a);
    await loadMarksFor(a);
  };

  const handleSaveScores = async () => {
    if (!selectedAssessment) return;
    setSaving(true);
    try {
      const entries = rows.map((r: any) => ({
        studentUuid: r.studentUuid,
        score: scores[r.studentUuid] === "" || scores[r.studentUuid] === undefined ? null : Number(scores[r.studentUuid]),
      }));
      await AssessmentApi.saveMarks(selectedAssessment.uuid, entries);
      Swal.fire({ icon: "success", title: "Scores saved", text: `${selectedAssessment.name} scores for ${selectedClass.grade} ${selectedClass.stream} saved.` });
      setMode("list");
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: getBackendErrorMessage(err, "Failed to save scores") });
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    setMode("list");
    setSelectedClass(null);
    setSelectedAssessment(null);
    setRows([]);
  };

  const totalStudentPages = Math.ceil(rows.length / studentsPerPage);
  const pagedRows = rows.slice((studentsPage - 1) * studentsPerPage, studentsPage * studentsPerPage);

  // Class list view
  if (mode === "list") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Classes</h1>
          <p className="text-muted-foreground">All classes and subjects assigned to you on the timetable</p>
        </div>
        {loadingClasses ? (
          <p className="text-sm text-muted-foreground text-center py-8">Loading your classes...</p>
        ) : classes.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
            You have no timetabled classes yet — ask an admin to assign you subjects on the timetable.
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((cls) => (
              <Card key={classKey(cls)} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <BookOpen className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{cls.grade} {cls.stream}</p>
                        <p className="text-xs text-muted-foreground">{cls.subjectName}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{cls.studentCount} students</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => handleViewStudents(cls)}>
                      <Users className="w-3.5 h-3.5 mr-1" /> View Students
                    </Button>
                    <Button size="sm" className="flex-1 text-xs" onClick={() => openScoreModal(cls)}>
                      Enter Scores
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Score Entry Modal */}
        <Dialog open={showScoreModal} onOpenChange={setShowScoreModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Enter Scores — {modalClass?.grade} {modalClass?.stream}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Assessment</Label>
                <Select value={modalAssessmentUuid} onValueChange={setModalAssessmentUuid}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__new__">
                      <span className="flex items-center gap-1"><Plus className="w-3 h-3" /> New Assessment</span>
                    </SelectItem>
                    {modalAssessments.map((a) => (
                      <SelectItem key={a.uuid} value={a.uuid}>{assessmentLabel(a)} ({a.gradedCount}/{a.studentCount} graded)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {modalAssessmentUuid === "__new__" && (
                <>
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input placeholder="e.g. CAT 1, Mid Term Exam" value={newName} onChange={(e) => setNewName(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={newType} onValueChange={(v) => setNewType(v as "CAT" | "EXAM")}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CAT">CAT</SelectItem>
                          <SelectItem value="EXAM">Exam</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Term</Label>
                      <Select value={newTerm} onValueChange={setNewTerm}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {terms.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Year</Label>
                    <Input type="number" value={newYear} onChange={(e) => setNewYear(e.target.value)} />
                  </div>
                </>
              )}

              <Button className="w-full" disabled={creating} onClick={handleModalProceed}>
                {creating ? "Preparing..." : "Proceed"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // View Students
  if (mode === "view" && selectedClass) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{selectedClass.grade} {selectedClass.stream} — {selectedClass.subjectName}</h1>
            <p className="text-muted-foreground">{selectedClass.studentCount} students</p>
          </div>
        </div>

        {assessments.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
            No assessments have been created for this class yet.
            <div className="mt-3"><Button size="sm" onClick={() => openScoreModal(selectedClass)}>Create Assessment</Button></div>
          </CardContent></Card>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Select value={selectedAssessment?.uuid} onValueChange={handleSelectViewAssessment}>
                <SelectTrigger className="w-[260px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {assessments.map((a) => <SelectItem key={a.uuid} value={a.uuid}>{assessmentLabel(a)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardContent className="pt-4">
                {rowsLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Adm No</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead className="text-right">Score</TableHead>
                        <TableHead className="text-center">Grade</TableHead>
                        <TableHead className="text-center">Points</TableHead>
                        <TableHead>Remark</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedRows.map((r, i) => {
                        const pct = r.score === null || r.score === undefined ? null : (r.score / (selectedAssessment?.maxScore || 100)) * 100;
                        const gradeInfo = getGradeInfo(pct, selectedClass.grade);
                        return (
                          <TableRow key={r.studentUuid}>
                            <TableCell className="text-muted-foreground text-xs">{(studentsPage - 1) * studentsPerPage + i + 1}</TableCell>
                            <TableCell className="font-mono text-xs">{r.admissionNumber}</TableCell>
                            <TableCell className="font-medium text-sm">{r.studentName}</TableCell>
                            <TableCell className="text-right">
                              {r.score !== null && r.score !== undefined ? (
                                <Badge variant={pct !== null && pct >= 50 ? "default" : "destructive"} className="text-[10px]">{r.score}/{selectedAssessment?.maxScore}</Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center text-sm font-semibold">{gradeInfo?.label || "—"}</TableCell>
                            <TableCell className="text-center text-sm">{gradeInfo?.points || "—"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{gradeInfo?.remark || "—"}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
                <Pagination currentPage={studentsPage} totalPages={totalStudentPages} onPageChange={setStudentsPage}
                  itemsPerPage={studentsPerPage} onItemsPerPageChange={v => { setStudentsPerPage(v); setStudentsPage(1); }} />
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={() => openScoreModal(selectedClass)}>Enter / Edit Scores</Button>
            </div>
          </>
        )}
      </div>
    );
  }

  // Enter Scores
  if (mode === "scores" && selectedClass && selectedAssessment) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{selectedAssessment.name} — {selectedClass.grade} {selectedClass.stream}</h1>
              <p className="text-muted-foreground">{selectedClass.subjectName} · {selectedAssessment.term} {selectedAssessment.year} · Max {selectedAssessment.maxScore}</p>
            </div>
          </div>
          <Button onClick={handleSaveScores} disabled={saving}>
            <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save Scores"}
          </Button>
        </div>

        {rowsLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Loading roster...</p>
        ) : (
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Adm No</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead className="w-28 text-right">Score (/{selectedAssessment.maxScore})</TableHead>
                    <TableHead className="text-center">Grade</TableHead>
                    <TableHead className="text-center">Points</TableHead>
                    <TableHead>Remark</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => {
                    const raw = scores[r.studentUuid] ?? "";
                    const pct = raw === "" ? null : (parseFloat(raw) / selectedAssessment.maxScore) * 100;
                    const gradeInfo = getGradeInfo(pct);
                    return (
                      <TableRow key={r.studentUuid}>
                        <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                        <TableCell className="font-mono text-xs">{r.admissionNumber}</TableCell>
                        <TableCell className="font-medium text-sm">{r.studentName}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min="0"
                            max={selectedAssessment.maxScore}
                            className="w-20 ml-auto text-right h-8 text-sm"
                            placeholder="—"
                            value={raw}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "" || (parseFloat(val) >= 0 && parseFloat(val) <= selectedAssessment.maxScore)) {
                                setScores((prev) => ({ ...prev, [r.studentUuid]: val }));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-center text-sm font-semibold">{gradeInfo?.label || "—"}</TableCell>
                        <TableCell className="text-center text-sm">{gradeInfo?.points || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{gradeInfo?.remark || "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end">
          <Button onClick={handleSaveScores} disabled={saving}>
            <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save Scores"}
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

export default TeacherClasses;
