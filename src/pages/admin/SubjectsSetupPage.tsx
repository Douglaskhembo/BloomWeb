import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import SubjectFormModal from "@/components/modal/SubjectFormModal";
import { SubjectFormValues } from "@/components/forms/SubjectForm";
import { SubjectApi } from "@/services/api";
import { getBackendErrorMessage } from "@/utils/errorHandler";

interface Subject { id: number; name: string; code: string; grades: string; status: "active" | "inactive"; }

const toSubject = (raw: any): Subject => ({
  id: raw.id,
  name: raw.name,
  code: raw.code ?? "",
  grades: raw.grade ?? "",
  status: raw.active ? "active" : "inactive",
});

const emptyForm: SubjectFormValues = { name: "", code: "", grades: "", active: true };

const SubjectsSetupPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<SubjectFormValues>(emptyForm);

  const load = () => {
    setLoading(true);
    SubjectApi.getAll()
      .then((data) => setSubjects(data.map(toSubject)))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (s: Subject) => {
    setEditingId(s.id);
    setForm({ name: s.name, code: s.code, grades: s.grades, active: s.status === "active" });
    setOpen(true);
  };

  const handleSubmit = async () => {
    const payload = { name: form.name, code: form.code, grade: form.grades, active: form.active };
    try {
      if (editingId !== null) {
        await SubjectApi.update(editingId, payload);
        toast({ title: "Subject updated" });
      } else {
        await SubjectApi.create(payload);
        toast({ title: "Subject added" });
      }
      setOpen(false);
      load();
    } catch (err) {
      toast({ title: "Failed to save subject", description: getBackendErrorMessage(err), variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await SubjectApi.delete(id);
      toast({ title: "Subject removed" });
      load();
    } catch (err) {
      toast({ title: "Failed to delete subject", description: getBackendErrorMessage(err), variant: "destructive" });
    }
  };

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
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading subjects...</p>
          ) : (
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
              {subjects.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">No subjects configured yet.</TableCell></TableRow>
              ) : subjects.map((subject) => (
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
          )}
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
