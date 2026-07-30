import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { BookOpen, Users, ArrowLeft, Save } from "lucide-react";
import Swal from "sweetalert2";
import Pagination from "@/utils/Pagination";

interface GradeEntry {
  label: string;
  minScore: number;
  maxScore: number;
  points: number;
  remark: string;
}

const defaultGradingEntries: GradeEntry[] = [
  { label: "A", minScore: 80, maxScore: 100, points: 12, remark: "Excellent" },
  { label: "A-", minScore: 75, maxScore: 79, points: 11, remark: "Very Good" },
  { label: "B+", minScore: 70, maxScore: 74, points: 10, remark: "Good" },
  { label: "B", minScore: 65, maxScore: 69, points: 9, remark: "Fairly Good" },
  { label: "B-", minScore: 60, maxScore: 64, points: 8, remark: "Good Average" },
  { label: "C+", minScore: 55, maxScore: 59, points: 7, remark: "Average" },
  { label: "C", minScore: 50, maxScore: 54, points: 6, remark: "Fair" },
  { label: "C-", minScore: 45, maxScore: 49, points: 5, remark: "Below Average" },
  { label: "D+", minScore: 40, maxScore: 44, points: 4, remark: "Below Average" },
  { label: "D", minScore: 35, maxScore: 39, points: 3, remark: "Weak" },
  { label: "D-", minScore: 30, maxScore: 34, points: 2, remark: "Very Weak" },
  { label: "E", minScore: 0, maxScore: 29, points: 1, remark: "Very Poor" },
];

const getGradeInfo = (score: string): { label: string; points: number; remark: string } | null => {
  const num = parseFloat(score);
  if (isNaN(num)) return null;
  const entry = defaultGradingEntries.find((e) => num >= e.minScore && num <= e.maxScore);
  return entry ? { label: entry.label, points: entry.points, remark: entry.remark } : null;
};

interface StudentScores {
  exam: Record<string, string>; // term -> score
  cat: Record<string, string>;  // term -> score
}

interface Student {
  id: string;
  name: string;
  admNo: string;
  scores: StudentScores;
}

interface ClassData {
  grade: string;
  students: Student[];
  subject: string;
  room: string;
  avgScore: number;
}

const generateStudents = (grade: string, count: number): Student[] => {
  const names = [
    "Joy Kamau", "Brian Njuguna", "Alice Muthoni", "Peter Njoroge", "Grace Akinyi",
    "David Wafula", "Faith Wanjiku", "Kevin Mwangi", "Mercy Chelimo", "Samuel Otieno",
    "Lucy Wambui", "James Mutua", "Daniel Kipchoge", "Amina Hassan", "Ruth Kemunto",
    "Michael Omondi", "Sarah Chebet", "John Karanja", "Mary Nyambura", "Joseph Kiprop",
    "Esther Njeri", "Paul Ochieng", "Nancy Wangari", "George Kimani", "Christine Adhiambo",
    "Robert Maina", "Catherine Nyokabi", "Dennis Korir", "Joyce Moraa", "Stephen Rotich",
    "Anne Wanjiru", "Patrick Musyoka", "Helen Chelagat", "Victor Onyango", "Diana Mugure",
  ];
  return names.slice(0, count).map((name, i) => ({
    id: `${grade.replace(/\s/g, "")}-${String(i + 1).padStart(3, "0")}`,
    name,
    admNo: `ADM-${String(1000 + i)}`,
    scores: { exam: {}, cat: {} },
  }));
};

const initialClasses: ClassData[] = [
  { grade: "Grade 5A", students: generateStudents("Grade 5A", 35), subject: "Mathematics", room: "Room 12", avgScore: 0 },
  { grade: "Grade 5B", students: generateStudents("Grade 5B", 33), subject: "Mathematics", room: "Room 14", avgScore: 0 },
  { grade: "Grade 3A", students: generateStudents("Grade 3A", 30), subject: "Mathematics", room: "Room 8", avgScore: 0 },
  { grade: "Grade 4A", students: generateStudents("Grade 4A", 32), subject: "Mathematics", room: "Room 10", avgScore: 0 },
  { grade: "Grade 6A", students: generateStudents("Grade 6A", 28), subject: "Mathematics", room: "Room 16", avgScore: 0 },
  { grade: "Grade 7A", students: generateStudents("Grade 7A", 28), subject: "Mathematics", room: "Room 18", avgScore: 0 },
];

const terms = ["Term 1", "Term 2", "Term 3"];

const TeacherClasses = () => {
  const [classes, setClasses] = useState<ClassData[]>(initialClasses);
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [mode, setMode] = useState<"list" | "view" | "scores">("list");
  const [scores, setScores] = useState<Record<string, string>>({});
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [scoreType, setScoreType] = useState<"exam" | "cat">("exam");
  const [viewTab, setViewTab] = useState<"exam" | "cat">("exam");
  const [viewTerm, setViewTerm] = useState<string>("Term 1");
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [modalClass, setModalClass] = useState<ClassData | null>(null);
  const [modalType, setModalType] = useState<"exam" | "cat">("exam");
  const [modalTerm, setModalTerm] = useState<string>("");

  const handleViewStudents = (cls: ClassData) => {
    setSelectedClass(cls);
    setMode("view");
    setViewTab("exam");
    setViewTerm("Term 1");
  };

  const handleEnterScores = (cls: ClassData) => {
    setModalClass(cls);
    setModalType("exam");
    setModalTerm("");
    setShowScoreModal(true);
  };

  const handleModalProceed = () => {
    if (!modalClass || !modalTerm) return;
    setSelectedClass(modalClass);
    setScoreType(modalType);
    setSelectedTerm(modalTerm);
    const initial: Record<string, string> = {};
    modalClass.students.forEach((s) => {
      initial[s.id] = s.scores[modalType][modalTerm] || "";
    });
    setScores(initial);
    setShowScoreModal(false);
    setMode("scores");
  };


  const handleSaveScores = () => {
    if (!selectedClass || !selectedTerm) return;
    setClasses((prev) =>
      prev.map((cls) =>
        cls.grade === selectedClass.grade
          ? {
              ...cls,
              students: cls.students.map((s) => ({
                ...s,
                scores: {
                  ...s.scores,
                  [scoreType]: { ...s.scores[scoreType], [selectedTerm]: scores[s.id] || "" },
                },
              })),
            }
          : cls
      )
    );
    Swal.fire({ icon: "success", title: "Scores saved", text: `${scoreType === "exam" ? "Exam" : "CAT"} scores for ${selectedClass.grade} — ${selectedTerm} saved.`, showConfirmButton: true });
    setMode("list");
  };

  const handleBack = () => {
    setMode("list");
    setSelectedClass(null);
  };

  // Class list view
  if (mode === "list") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Classes</h1>
          <p className="text-muted-foreground">All classes assigned to you this term</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls, i) => (
            <Card key={i} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <BookOpen className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{cls.grade}</p>
                      <p className="text-xs text-muted-foreground">{cls.subject} · {cls.room}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{cls.students.length} students</Badge>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => handleViewStudents(cls)}>
                    <Users className="w-3.5 h-3.5 mr-1" /> View Students
                  </Button>
                  <Button size="sm" className="flex-1 text-xs" onClick={() => handleEnterScores(cls)}>
                    Enter Scores
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Score Entry Modal */}
        <Dialog open={showScoreModal} onOpenChange={setShowScoreModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Enter Scores — {modalClass?.grade}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Assessment Type</Label>
                <Select value={modalType} onValueChange={(v) => setModalType(v as "exam" | "cat")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exam">Exam</SelectItem>
                    <SelectItem value="cat">CAT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Term</Label>
                <Select value={modalTerm} onValueChange={setModalTerm}>
                  <SelectTrigger><SelectValue placeholder="Select Term" /></SelectTrigger>
                  <SelectContent>
                    {terms.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" disabled={!modalTerm} onClick={handleModalProceed}>
                Proceed
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // View Students with Exam/CAT tabs
  if (mode === "view" && selectedClass) {
    const currentClass = classes.find((c) => c.grade === selectedClass.grade) || selectedClass;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{currentClass.grade} — {currentClass.subject}</h1>
            <p className="text-muted-foreground">{currentClass.students.length} students · {currentClass.room}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Select value={viewTerm} onValueChange={setViewTerm}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {terms.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Tabs value={viewTab} onValueChange={(v) => setViewTab(v as "exam" | "cat")}>
          <TabsList>
            <TabsTrigger value="exam">Exam</TabsTrigger>
            <TabsTrigger value="cat">CAT</TabsTrigger>
          </TabsList>
          <TabsContent value="exam">
            <StudentViewTable students={currentClass.students} term={viewTerm} type="exam" />
          </TabsContent>
          <TabsContent value="cat">
            <StudentViewTable students={currentClass.students} term={viewTerm} type="cat" />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button onClick={() => handleEnterScores(currentClass)}>Enter Scores</Button>
        </div>
      </div>
    );
  }

  // Enter Scores - direct table (term/type already selected via modal)
  if (mode === "scores" && selectedClass) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Enter {scoreType === "exam" ? "Exam" : "CAT"} Scores — {selectedClass.grade}</h1>
              <p className="text-muted-foreground">{selectedClass.subject} · {selectedTerm}</p>
            </div>
          </div>
          <Button onClick={handleSaveScores}>
            <Save className="w-4 h-4 mr-1" /> Save Scores
          </Button>
        </div>

        <ScoreEntryTable students={selectedClass.students} scores={scores} setScores={setScores} />

        <div className="flex justify-end">
          <Button onClick={handleSaveScores}>
            <Save className="w-4 h-4 mr-1" /> Save Scores
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

// Sub-component: View students table with grade info
const StudentViewTable = ({ students, term, type }: { students: Student[]; term: string; type: "exam" | "cat" }) => {
  const [studentsPage, setStudentsPage] = useState(1);
  const [studentsPerPage, setStudentsPerPage] = useState(10);
  const totalStudentPages = Math.ceil(students.length / studentsPerPage);
  const pagedStudents = students.slice((studentsPage - 1) * studentsPerPage, studentsPage * studentsPerPage);

  return (
    <Card>
      <CardContent className="pt-4">
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
            {pagedStudents.map((s, i) => {
              const score = s.scores[type][term] || "";
              const gradeInfo = getGradeInfo(score);
              return (
                <TableRow key={s.id}>
                  <TableCell className="text-muted-foreground text-xs">{(studentsPage - 1) * studentsPerPage + i + 1}</TableCell>
                  <TableCell className="font-mono text-xs">{s.admNo}</TableCell>
                  <TableCell className="font-medium text-sm">{s.name}</TableCell>
                  <TableCell className="text-right">
                    {score ? (
                      <Badge variant={parseFloat(score) >= 50 ? "default" : "destructive"} className="text-[10px]">{score}%</Badge>
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
        <Pagination currentPage={studentsPage} totalPages={totalStudentPages} onPageChange={setStudentsPage}
          itemsPerPage={studentsPerPage} onItemsPerPageChange={v => { setStudentsPerPage(v); setStudentsPage(1); }} />
      </CardContent>
    </Card>
  );
};

// Sub-component: Score entry table with auto grade/points/remark
const ScoreEntryTable = ({ students, scores, setScores }: { students: Student[]; scores: Record<string, string>; setScores: React.Dispatch<React.SetStateAction<Record<string, string>>> }) => (
  <Card>
    <CardContent className="pt-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Adm No</TableHead>
            <TableHead>Student Name</TableHead>
            <TableHead className="w-28 text-right">Score (%)</TableHead>
            <TableHead className="text-center">Grade</TableHead>
            <TableHead className="text-center">Points</TableHead>
            <TableHead>Remark</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((s, i) => {
            const gradeInfo = getGradeInfo(scores[s.id] || "");
            return (
              <TableRow key={s.id}>
                <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                <TableCell className="font-mono text-xs">{s.admNo}</TableCell>
                <TableCell className="font-medium text-sm">{s.name}</TableCell>
                <TableCell className="text-right">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    className="w-20 ml-auto text-right h-8 text-sm"
                    placeholder="—"
                    value={scores[s.id] || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || (parseFloat(val) >= 0 && parseFloat(val) <= 100)) {
                        setScores((prev) => ({ ...prev, [s.id]: val }));
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
);

export default TeacherClasses;
