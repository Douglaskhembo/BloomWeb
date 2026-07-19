import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Network, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import AddDepartmentModal, { DepartmentFormValue } from "@/components/modals/AddDepartmentModal";
import { SchoolApi } from "@/services/api";
import { getBackendErrorMessage } from "@/utils/errorHandler";

interface Department {
  uuid: string;
  name: string;
  code: string;
  head: { uuid: string; firstName: string; lastName: string } | null;
  status: "ACTIVE" | "INACTIVE";
}

const DepartmentsPage = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);

  const load = () => SchoolApi.getDepartments().then(d => setDepartments(Array.isArray(d) ? d : []));
  useEffect(() => { load(); }, []);

  const handleSave = async (v: DepartmentFormValue) => {
    try {
      if (editing) {
        await SchoolApi.updateDepartment(editing.uuid, v);
      } else {
        await SchoolApi.createDepartment(v);
      }
      setEditing(null);
      toast.success(editing ? "Department updated" : "Department created");
      load();
    } catch (err) {
      toast.error(getBackendErrorMessage(err, "Failed to save department"));
    }
  };

  const handleToggle = async (uuid: string) => {
    try {
      await SchoolApi.toggleDepartmentStatus(uuid);
      load();
    } catch (err) {
      toast.error(getBackendErrorMessage(err, "Failed to update department status"));
    }
  };

  const handleDelete = async (uuid: string) => {
    try {
      await SchoolApi.deleteDepartment(uuid);
      load();
    } catch (err) {
      toast.error(getBackendErrorMessage(err, "Failed to delete department"));
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Network className="w-5 h-5" /> Departments
          </CardTitle>
          <CardDescription>Define departments at school level. Assign them to branches from the Branches tab.</CardDescription>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setAddOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Add Department
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Department</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Department Head</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments.map((d) => {
              const active = d.status === "ACTIVE";
              return (
              <TableRow key={d.uuid}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell className="text-muted-foreground">{d.code}</TableCell>
                <TableCell>{d.head ? `${d.head.firstName} ${d.head.lastName}` : "—"}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={active ? "default" : "secondary"}>{active ? "Active" : "Inactive"}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" className="h-8" onClick={() => handleToggle(d.uuid)}>
                      {active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(d); setAddOpen(true); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(d.uuid)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              );
            })}
            {departments.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No departments yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <AddDepartmentModal
        open={addOpen}
        onOpenChange={(o) => { setAddOpen(o); if (!o) setEditing(null); }}
        initialValues={editing ? { name: editing.name, code: editing.code, headUuid: editing.head?.uuid ?? null, status: editing.status === "ACTIVE" ? "active" : "inactive" } : undefined}
        onSave={handleSave}
      />
    </Card>
  );
};

export default DepartmentsPage;
