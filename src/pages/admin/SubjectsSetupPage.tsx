import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import SubjectFormModal from "@/components/modal/SubjectFormModal";
import { SubjectFormValues } from "@/components/forms/SubjectForm";
import { SubjectApi, SchoolApi } from "@/services/api";
import { getBackendErrorMessage } from "@/utils/errorHandler";
import Pagination from "@/utils/Pagination";
import { useAuth } from "@/context/AuthContext";

interface Subject { id: number; name: string; code: string; grades: string[]; status: "active" | "inactive"; }
interface GradeLevelOption { uuid: string; name: string; active: boolean; }

const toSubject = (raw: any): Subject => ({
  id: raw.id,
  name: raw.name,
  code: raw.code ?? "",
  grades: (raw.gradeLevels ?? []).map((g: any) => g.name),
  status: raw.active ? "active" : "inactive",
});

const toGradeLevelOption = (raw: any): GradeLevelOption => ({
  uuid: raw.uuid,
  name: raw.name,
  active: raw.status === "ACTIVE",
});

const emptyForm: SubjectFormValues = { name: "", code: "", grades: [], active: true };

const SubjectsSetupPage = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("SUBJECTS_MANAGE");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevelOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<SubjectFormValues>(emptyForm);
  const [subjectsPage, setSubjectsPage] = useState(1);
  const [subjectsPerPage, setSubjectsPerPage] = useState(10);

  const load = () => {
    setLoading(true);
    SubjectApi.getAll()
      .then((data) => setSubjects(data.map(toSubject)))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
    SchoolApi.getGradeLevels().then((data) => setGradeLevels(data.map(toGradeLevelOption)));
  }, []);

  const gradeOptions = gradeLevels.filter((g) => g.active).map((g) => g.name);
  const totalSubjectPages = Math.ceil(subjects.length / subjectsPerPage);
  const pagedSubjects = subjects.slice((subjectsPage - 1) * subjectsPerPage, subjectsPage * subjectsPerPage);

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (s: Subject) => {
    setEditingId(s.id);
    setForm({ name: s.name, code: s.code, grades: s.grades, active: s.status === "active" });
    setOpen(true);
  };

  const handleSubmit = async () => {
    const gradeLevelUuids = form.grades
      .map((name) => gradeLevels.find((g) => g.name === name)?.uuid)
      .filter((uuid): uuid is string => Boolean(uuid));
    const payload = { name: form.name, code: form.code, gradeLevelUuids, active: form.active };
    try {
      if (editingId !== null) {
        await SubjectApi.update(editingId, payload);
        Swal.fire({ title: "Subject updated", icon: "success", showConfirmButton: true });
      } else {
        await SubjectApi.create(payload);
        Swal.fire({ title: "Subject added", icon: "success", showConfirmButton: true });
      }
      setOpen(false);
      load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to save subject", text: getBackendErrorMessage(err), showConfirmButton: true });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await SubjectApi.delete(id);
      Swal.fire({ title: "Subject removed", icon: "success", showConfirmButton: true });
      load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to delete subject", text: getBackendErrorMessage(err), showConfirmButton: true });
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
        {canManage && <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> Add Subject</Button>}
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
          <>
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
              {pagedSubjects.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">No subjects configured yet.</TableCell></TableRow>
              ) : pagedSubjects.map((subject) => (
                <TableRow key={subject.id}>
                  <TableCell className="font-medium">{subject.name}</TableCell>
                  <TableCell className="text-muted-foreground">{subject.code}</TableCell>
                  <TableCell className="text-sm">
                    {subject.grades.length === 0
                      ? "—"
                      : subject.grades.length === gradeOptions.length
                        ? "All Grades"
                        : subject.grades.join(", ")}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={subject.status === "active" ? "default" : "secondary"}>
                      {subject.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {canManage && (
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(subject)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(subject.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination currentPage={subjectsPage} totalPages={totalSubjectPages} onPageChange={setSubjectsPage}
            itemsPerPage={subjectsPerPage} onItemsPerPageChange={v => { setSubjectsPerPage(v); setSubjectsPage(1); }} />
          </>
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
        gradeOptions={gradeOptions}
      />
    </div>
  );
};

export default SubjectsSetupPage;
