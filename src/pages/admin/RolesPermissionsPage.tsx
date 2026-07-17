import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Shield, Plus, Edit, Trash2, Search } from "lucide-react";
import { RoleApi, ModuleApi, PermissionApi } from "@/services/api";
import { getBackendErrorMessage } from "@/utils/errorHandler";
import Pagination from "@/utils/Pagination";
import Swal from "sweetalert2";

const RolesPermissionsPage = () => {
  const [roles, setRoles]               = useState<any[]>([]);
  const [search, setSearch]             = useState("");
  const [selectedRole, setSelectedRole] = useState<any | null>(null);

  // pagination – roles
  const [rolesPage, setRolesPage]       = useState(1);
  const [rolesPerPage, setRolesPerPage] = useState(10);

  // modules
  const [modules, setModules]               = useState<any[]>([]);
  const [selectedModule, setSelectedModule] = useState<any | null>(null);
  const [modulesPage, setModulesPage]       = useState(1);
  const [modulesPerPage, setModulesPerPage] = useState(10);

  // permissions
  const [permissions, setPermissions]     = useState<any[]>([]);
  const [permsPage, setPermsPage]         = useState(1);
  const [permsPerPage, setPermsPerPage]   = useState(10);

  // modal
  const [modalOpen, setModalOpen]         = useState(false);
  const [editingRole, setEditingRole]     = useState<any | null>(null);
  const [roleName, setRoleName]           = useState("");

  const fetchRoles = async () => {
    try { setRoles(await RoleApi.getAll()); }
    catch (err) { Swal.fire("Error", getBackendErrorMessage(err), "error"); }
  };

  useEffect(() => { fetchRoles(); }, []);

  const fetchPermissions = async (roleUuid: string, moduleUuid: string) => {
    try {
      setPermissions(await PermissionApi.getByModule(roleUuid, moduleUuid));
      setPermsPage(1);
    } catch { setPermissions([]); }
  };

  const handleSelectRole = async (role: any) => {
    if (selectedRole?.uuid === role.uuid) {
      setSelectedRole(null); setModules([]); setSelectedModule(null); setPermissions([]); return;
    }
    setSelectedRole(role); setSelectedModule(null); setPermissions([]);
    try {
      const mods = await ModuleApi.getAll();
      setModules(mods); setModulesPage(1);
      if (mods.length > 0) {
        setSelectedModule(mods[0]);
        fetchPermissions(role.uuid, mods[0].uuid);
      }
    } catch { setModules([]); }
  };

  const handleSelectModule = (mod: any) => {
    if (!selectedRole) return;
    setSelectedModule(mod);
    fetchPermissions(selectedRole.uuid, mod.uuid);
  };

  const handleGrant = async (permUuid: string) => {
    try {
      await PermissionApi.grant({ roleUuid: selectedRole.uuid, permissionUuid: permUuid });
      fetchPermissions(selectedRole.uuid, selectedModule.uuid);
    } catch (err) { Swal.fire("Error", getBackendErrorMessage(err), "error"); }
  };

  const handleRevoke = async (permUuid: string) => {
    try {
      await PermissionApi.revoke({ roleUuid: selectedRole.uuid, permissionUuid: permUuid });
      fetchPermissions(selectedRole.uuid, selectedModule.uuid);
    } catch (err) { Swal.fire("Error", getBackendErrorMessage(err), "error"); }
  };

  const openAdd = () => { setEditingRole(null); setRoleName(""); setModalOpen(true); };
  const openEdit = (role: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingRole(role); setRoleName(role.name ?? role.roleName ?? ""); setModalOpen(true);
  };

  const handleSave = async () => {
    if (!roleName.trim()) return;
    try {
      if (editingRole) {
        await RoleApi.update(editingRole.uuid, { roleName: roleName.trim() });
        Swal.fire({ icon: "success", title: "Role updated", timer: 1500, showConfirmButton: false });
      } else {
        await RoleApi.create({ roleName: roleName.trim() });
        Swal.fire({ icon: "success", title: "Role created", timer: 1500, showConfirmButton: false });
      }
      setModalOpen(false); fetchRoles();
    } catch (err) { Swal.fire("Error", getBackendErrorMessage(err), "error"); }
  };

  const handleDelete = async (role: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await Swal.fire({
      title: "Delete role?", text: `Delete "${role.name ?? role.roleName}"?`,
      icon: "warning", showCancelButton: true, confirmButtonColor: "#d33",
    });
    if (!ok.isConfirmed) return;
    try {
      await RoleApi.delete(role.uuid);
      if (selectedRole?.uuid === role.uuid) { setSelectedRole(null); setModules([]); setPermissions([]); }
      fetchRoles();
    } catch (err) { Swal.fire("Error", getBackendErrorMessage(err), "error"); }
  };

  // ── pagination helpers ────────────────────────────────────────────────────
  const filtered      = roles.filter(r => (r.name ?? r.roleName ?? "").toLowerCase().includes(search.toLowerCase()));
  const totalRolePages = Math.ceil(filtered.length / rolesPerPage);
  const pagedRoles    = filtered.slice((rolesPage - 1) * rolesPerPage, rolesPage * rolesPerPage);

  const totalModulePages = Math.ceil(modules.length / modulesPerPage);
  const pagedModules     = modules.slice((modulesPage - 1) * modulesPerPage, modulesPage * modulesPerPage);

  const totalPermsPages = Math.ceil(permissions.length / permsPerPage);
  const pagedPerms      = permissions.slice((permsPage - 1) * permsPerPage, permsPage * permsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Roles & Permissions</h1>
          <p className="text-muted-foreground">Define roles and control module access</p>
        </div>
        <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> Add Role</Button>
      </div>

      {/* ── Roles table ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5" /> Roles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search roles..." value={search}
              onChange={e => { setSearch(e.target.value); setRolesPage(1); }} className="max-w-sm" />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role Name</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedRoles.length === 0 ? (
                <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">No roles found</TableCell></TableRow>
              ) : pagedRoles.map(role => (
                <TableRow key={role.uuid} onClick={() => handleSelectRole(role)}
                  className={`cursor-pointer hover:bg-muted ${selectedRole?.uuid === role.uuid ? "bg-muted" : ""}`}>
                  <TableCell className="font-medium">{role.name ?? role.roleName}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600" onClick={e => openEdit(role, e)}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={e => handleDelete(role, e)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination currentPage={rolesPage} totalPages={totalRolePages} onPageChange={setRolesPage}
            itemsPerPage={rolesPerPage} onItemsPerPageChange={v => { setRolesPerPage(v); setRolesPage(1); }} />
        </CardContent>
      </Card>

      {/* ── Modules + Permissions ── */}
      {selectedRole && (
        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Modules</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Module Name</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {pagedModules.length === 0 ? (
                    <TableRow><TableCell className="text-muted-foreground">No modules found</TableCell></TableRow>
                  ) : pagedModules.map(mod => (
                    <TableRow key={mod.uuid} onClick={() => handleSelectModule(mod)}
                      className={`cursor-pointer hover:bg-muted ${selectedModule?.uuid === mod.uuid ? "bg-muted" : ""}`}>
                      <TableCell>{mod.moduleName}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination currentPage={modulesPage} totalPages={totalModulePages} onPageChange={setModulesPage}
                itemsPerPage={modulesPerPage} onItemsPerPageChange={v => { setModulesPerPage(v); setModulesPage(1); }} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Permissions {selectedModule ? `— ${selectedModule.moduleName}` : ""}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Access Type</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedPerms.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">
                      {selectedModule ? "No permissions for this module" : "Select a module"}
                    </TableCell></TableRow>
                  ) : pagedPerms.map(perm => (
                    <TableRow key={perm.permUuid ?? perm.uuid}>
                      <TableCell>{perm.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{perm.permDesc}</TableCell>
                      <TableCell className="text-sm">{perm.accessType}</TableCell>
                      <TableCell className="text-right">
                        {perm.granted ? (
                          <Button size="sm" variant="destructive" onClick={() => handleRevoke(perm.permUuid ?? perm.uuid)}>
                            Revoke
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => handleGrant(perm.permUuid ?? perm.uuid)}>
                            Grant
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination currentPage={permsPage} totalPages={totalPermsPages} onPageChange={setPermsPage}
                itemsPerPage={permsPerPage} onItemsPerPageChange={v => { setPermsPerPage(v); setPermsPage(1); }} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Role Modal ── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRole ? "Edit Role" : "Add Role"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Role Name</Label>
            <Input value={roleName} onChange={e => setRoleName(e.target.value)} placeholder="e.g. Finance Officer" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RolesPermissionsPage;
