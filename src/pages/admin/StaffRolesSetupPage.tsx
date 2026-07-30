import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import StaffRoleFormModal from "@/components/modal/StaffRoleFormModal";
import { StaffRoleFormValues } from "@/components/forms/StaffRoleForm";
import { StaffRoleApi } from "@/services/api";
import { getBackendErrorMessage } from "@/utils/errorHandler";
import Pagination from "@/utils/Pagination";

interface StaffRole { id: number; name: string; description: string; status: "active" | "inactive"; }

const toStaffRole = (raw: any): StaffRole => ({
  id: raw.id,
  name: raw.name,
  description: raw.description ?? "",
  status: raw.active ? "active" : "inactive",
});

const emptyForm: StaffRoleFormValues = { name: "", description: "", active: true };

const StaffRolesSetupPage = () => {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<StaffRoleFormValues>(emptyForm);
  const [rolesPage, setRolesPage] = useState(1);
  const [rolesPerPage, setRolesPerPage] = useState(10);

  const load = () => {
    setLoading(true);
    StaffRoleApi.getAll()
      .then((data) => setRoles(data.map(toStaffRole)))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (r: StaffRole) => {
    setEditingId(r.id);
    setForm({ name: r.name, description: r.description, active: r.status === "active" });
    setOpen(true);
  };

  const handleSubmit = async () => {
    const payload = { name: form.name, description: form.description, active: form.active };
    try {
      if (editingId !== null) {
        await StaffRoleApi.update(editingId, payload);
        Swal.fire({ title: "Success", text: "Staff role updated", icon: "success", showConfirmButton: true });
      } else {
        await StaffRoleApi.create(payload);
        Swal.fire({ title: "Success", text: "Staff role added", icon: "success", showConfirmButton: true });
      }
      setOpen(false);
      load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to save staff role", text: getBackendErrorMessage(err), showConfirmButton: true });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await StaffRoleApi.delete(id);
      Swal.fire({ title: "Success", text: "Staff role removed", icon: "success", showConfirmButton: true });
      load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to delete staff role", text: getBackendErrorMessage(err), showConfirmButton: true });
    }
  };

  const totalRolesPages = Math.ceil(roles.length / rolesPerPage);
  const pagedRoles = roles.slice((rolesPage - 1) * rolesPerPage, rolesPage * rolesPerPage);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/management")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Staff Roles</h1>
          <p className="text-muted-foreground">Define job titles/positions assignable to staff (e.g. Principal, Bursar, Cook)</p>
        </div>
        <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> Add Staff Role</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configured Staff Roles</CardTitle>
          <CardDescription>Manage the job titles available when onboarding staff</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading staff roles...</p>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">No staff roles configured yet.</TableCell></TableRow>
              ) : pagedRoles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{role.description || "—"}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={role.status === "active" ? "default" : "secondary"}>
                      {role.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(role)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(role.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
          <Pagination currentPage={rolesPage} totalPages={totalRolesPages} onPageChange={setRolesPage}
            itemsPerPage={rolesPerPage} onItemsPerPageChange={v => { setRolesPerPage(v); setRolesPage(1); }} />
        </CardContent>
      </Card>

      <StaffRoleFormModal
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

export default StaffRolesSetupPage;
