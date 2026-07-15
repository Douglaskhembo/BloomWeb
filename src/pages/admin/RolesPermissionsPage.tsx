import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Plus, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import RoleFormModal from "@/components/modal/RoleFormModal";
import { RoleFormValues, emptyRoleForm, permissionKeys } from "@/components/forms/RoleForm";

const initialRoles = [
  {
    role: "Super Admin",
    description: "Full system access",
    users: 2,
    permissions: { students: true, finance: true, academics: true, erp: true, settings: true, reports: true },
  },
  {
    role: "Finance Officer",
    description: "Manage fees, payroll, bills",
    users: 1,
    permissions: { students: false, finance: true, academics: false, erp: true, settings: false, reports: true },
  },
  {
    role: "Receptionist",
    description: "Admissions and communication",
    users: 1,
    permissions: { students: true, finance: false, academics: false, erp: false, settings: false, reports: false },
  },
  {
    role: "ICT Support",
    description: "System configuration and users",
    users: 1,
    permissions: { students: false, finance: false, academics: false, erp: false, settings: true, reports: true },
  },
  {
    role: "Teacher",
    description: "Class and academic management",
    users: 8,
    permissions: { students: true, finance: false, academics: true, erp: false, settings: false, reports: false },
  },
];

const RolesPermissionsPage = () => {
  const { toast } = useToast();
  const [roles, setRoles] = useState(initialRoles);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<RoleFormValues>(emptyRoleForm);

  const openAdd = () => { setForm(emptyRoleForm); setOpen(true); };
  const handleSubmit = () => {
    setRoles((p) => [...p, { role: form.role, description: form.description, users: 0, permissions: form.permissions }]);
    toast({ title: "Role added" });
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Roles & Permissions</h1>
          <p className="text-muted-foreground">Define roles and control module access</p>
        </div>
        <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> Add Role</Button>
      </div>

      <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2"><Shield className="w-5 h-5" /> Role Matrix</CardTitle>
        <CardDescription>Permission overview across all roles</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Users</TableHead>
              {permissionKeys.map((p) => (
                <TableHead key={p} className="text-center capitalize">{p}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((r) => (
              <TableRow key={r.role}>
                <TableCell>
                  <div>
                    <span className="font-medium">{r.role}</span>
                    <p className="text-xs text-muted-foreground">{r.description}</p>
                  </div>
                </TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{r.users}</Badge></TableCell>
                {permissionKeys.map((p) => (
                  <TableCell key={p} className="text-center">
                    {r.permissions[p] ? (
                      <Check className="w-4 h-4 text-success mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      </Card>

      <RoleFormModal
        open={open}
        onOpenChange={setOpen}
        isEditing={false}
        value={form}
        onChange={setForm}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default RolesPermissionsPage;
