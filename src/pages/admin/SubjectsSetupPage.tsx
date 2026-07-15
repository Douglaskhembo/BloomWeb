import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import SubjectFormModal from "@/components/modal/SubjectFormModal";
import { SubjectFormValues } from "@/components/forms/SubjectForm";

const initialSubjects = [
  { id: 1, name: "Mathematics", code: "MATH", grades: "PP1 – Grade 9", status: "active" },
  { id: 2, name: "English", code: "ENG", grades: "PP1 – Grade 9", status: "active" },
  { id: 3, name: "Kiswahili", code: "KSW", grades: "PP1 – Grade 9", status: "active" },
  { id: 4, name: "Science & Technology", code: "SCI", grades: "Grade 1 – Grade 6", status: "active" },
  { id: 5, name: "Social Studies", code: "SST", grades: "Grade 4 – Grade 9", status: "active" },
  { id: 6, name: "CRE", code: "CRE", grades: "Grade 4 – Grade 9", status: "active" },
  { id: 7, name: "Creative Arts", code: "ART", grades: "PP1 – Grade 6", status: "active" },
  { id: 8, name: "Physical Education", code: "PE", grades: "PP1 – Grade 9", status: "active" },
  { id: 9, name: "Agriculture", code: "AGR", grades: "Grade 7 – Grade 9", status: "inactive" },
  { id: 10, name: "Home Science", code: "HSC", grades: "Grade 7 – Grade 9", status: "inactive" },
];

const emptyForm: SubjectFormValues = { name: "", code: "", grades: "", active: true };

const SubjectsSetupPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [subjects, setSubjects] = useState(initialSubjects);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<SubjectFormValues>(emptyForm);

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (s: typeof subjects[number]) => {
    setEditingId(s.id);
    setForm({ name: s.name, code: s.code, grades: s.grades, active: s.status === "active" });
    setOpen(true);
  };
  const handleSubmit = () => {
    if (editingId !== null) {
      setSubjects((p) => p.map((s) => s.id === editingId ? { ...s, name: form.name, code: form.code, grades: form.grades, status: form.active ? "active" : "inactive" } : s));
      toast({ title: "Subject updated" });
    } else {
      setSubjects((p) => [...p, { id: Math.max(0, ...p.map((s) => s.id)) + 1, name: form.name, code: form.code, grades: form.grades, status: form.active ? "active" : "inactive" }]);
      toast({ title: "Subject added" });
    }
    setOpen(false);
  };
  const handleDelete = (id: number) => { setSubjects((p) => p.filter((s) => s.id !== id)); toast({ title: "Subject removed" }); };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/management")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Subjects</h1>
          <p className="text-muted-foreground">Define subjects offered per grade level</p>
        </div>
        <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> Add Subject</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configured Subjects</CardTitle>
          <CardDescription>Manage subjects and assign them to grade levels</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Applicable Grades</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects.map((subject) => (
                <TableRow key={subject.id}>
                  <TableCell className="font-medium">{subject.name}</TableCell>
                  <TableCell className="text-muted-foreground">{subject.code}</TableCell>
                  <TableCell className="text-sm">{subject.grades}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={subject.status === "active" ? "default" : "secondary"}>
                      {subject.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(subject)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(subject.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <SubjectFormModal
        open={open}
        onOpenChange={setOpen}
        isEditing={editingId !== null}
        value={form}
        onChange={setForm}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default SubjectsSetupPage;
