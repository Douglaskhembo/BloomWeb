import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { UserPlus, Search, Pencil, Trash2, KeyRound } from "lucide-react";
import { UserApi, RoleApi, StaffApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { getBackendErrorMessage } from "@/utils/errorHandler";
import Pagination from "@/utils/Pagination";
import Swal from "sweetalert2";

const UsersPage = () => {
  const { user: authUser } = useAuth();
  const roleSectionRef = useRef<HTMLDivElement>(null);

  const [users, setUsers]             = useState<any[]>([]);
  const [search, setSearch]           = useState("");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  // pagination – users table
  const [currentPage, setCurrentPage]     = useState(1);
  const [itemsPerPage, setItemsPerPage]   = useState(10);

  // role assignment
  const [assignedRoles, setAssignedRoles]     = useState<any[]>([]);
  const [unassignedRoles, setUnassignedRoles] = useState<any[]>([]);
  const [pickedAssigned, setPickedAssigned]   = useState<string | null>(null);
  const [pickedUnassigned, setPickedUnassigned] = useState<string | null>(null);
  const [assignedPage, setAssignedPage]       = useState(1);
  const [assignedPerPage, setAssignedPerPage] = useState(5);
  const [unassignedPage, setUnassignedPage]   = useState(1);
  const [unassignedPerPage, setUnassignedPerPage] = useState(5);

  // permissions panel
  const [permissions, setPermissions] = useState<any[]>([]);
  const [permSearch, setPermSearch]   = useState("");
  const [permPage, setPermPage]       = useState(1);
  const [permPerPage, setPermPerPage] = useState(10);

  // add/edit modal
  const [modalOpen, setModalOpen]     = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [allRoles, setAllRoles]       = useState<any[]>([]);
  const [form, setForm] = useState({
    userName: "", firstName: "", otherNames: "",
    email: "", phoneNumber: "", profileRef: "", roleUuids: [] as string[],
  });

  // onboard-from-staff (create mode only)
  const [allStaff, setAllStaff]         = useState<any[]>([]);
  const [staffSearch, setStaffSearch]   = useState("");
  const [onboardForm, setOnboardForm] = useState({
    staffUuid: "", userName: "", roleUuids: [] as string[], enable2FA: false,
  });

  const fetchUsers = async () => {
    try { setUsers(await UserApi.getAll()); }
    catch (err) { Swal.fire("Error", getBackendErrorMessage(err), "error"); }
  };

  useEffect(() => {
    fetchUsers();
    RoleApi.getAll().then(setAllRoles).catch(() => {});
    StaffApi.getAll().then(setAllStaff).catch(() => {});
  }, []);

  // Staff who already have a login (matched by profileRef → staff uuid) shouldn't be offered again.
  const onboardedStaffUuids = new Set(users.map(u => u.profileRef).filter(Boolean));
  const availableStaff = allStaff
    .filter(s => !onboardedStaffUuids.has(s.uuid))
    .filter(s => `${s.firstName} ${s.lastName} ${s.staffId} ${s.email}`.toLowerCase().includes(staffSearch.toLowerCase()));

  const handleStaffSelect = (staffUuid: string) => {
    const staff = allStaff.find(s => s.uuid === staffUuid);
    if (!staff) return;
    const firstInitial = staff.firstName?.charAt(0)?.toUpperCase() ?? "";
    const lastInitial = staff.lastName?.charAt(0)?.toUpperCase() ?? "";
    const numericPart = (staff.staffId ?? "").replace(/^[^0-9]+/, "");
    setOnboardForm(f => ({ ...f, staffUuid, userName: `${firstInitial}${lastInitial}${numericPart}` }));
  };

  const selectedStaff = allStaff.find(s => s.uuid === onboardForm.staffUuid);

  // ── select user ───────────────────────────────────────────────────────────
  const handleUserSelect = async (user: any) => {
    if (selectedUser?.userUuid === user.userUuid) { clearSelection(); return; }
    setSelectedUser(user);
    setPickedAssigned(null); setPickedUnassigned(null); setPermissions([]);
    try {
      const [all, assigned, perms] = await Promise.all([
        RoleApi.getAll(),
        UserApi.getAssignedRoles(user.userUuid),
        UserApi.getEffectivePermissions(user.userUuid),
      ]);
      const assignedUuids = new Set(assigned.map((r: any) => r.uuid ?? r.roleUuid));
      setAssignedRoles(assigned);
      setUnassignedRoles(all.filter((r: any) => !assignedUuids.has(r.uuid ?? r.roleUuid)));
      setPermissions(perms);
      setAssignedPage(1); setUnassignedPage(1); setPermPage(1);
      setTimeout(() => roleSectionRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) { Swal.fire("Error", getBackendErrorMessage(err), "error"); }
  };

  const clearSelection = () => {
    setSelectedUser(null); setAssignedRoles([]); setUnassignedRoles([]);
    setPickedAssigned(null); setPickedUnassigned(null);
    setPermissions([]); setPermSearch("");
  };

  // ── role assignment ───────────────────────────────────────────────────────
  const refreshRolesAndPerms = async () => {
    const [all, assigned, perms] = await Promise.all([
      RoleApi.getAll(),
      UserApi.getAssignedRoles(selectedUser.userUuid),
      UserApi.getEffectivePermissions(selectedUser.userUuid),
    ]);
    const assignedUuids = new Set(assigned.map((r: any) => r.uuid ?? r.roleUuid));
    setAssignedRoles(assigned);
    setUnassignedRoles(all.filter((r: any) => !assignedUuids.has(r.uuid ?? r.roleUuid)));
    setPermissions(perms);
    setPickedAssigned(null); setPickedUnassigned(null);
    fetchUsers();
  };

  const assignRole = async () => {
    if (!pickedUnassigned) return Swal.fire("Warning", "Select a role to assign", "warning");
    try {
      await UserApi.assignRoles({ userUuid: selectedUser.userUuid, roleUuids: [pickedUnassigned] });
      Swal.fire({ icon: "success", title: "Role assigned", timer: 1500, showConfirmButton: false });
      await refreshRolesAndPerms();
    } catch (err) { Swal.fire("Error", getBackendErrorMessage(err), "error"); }
  };

  const removeRole = async () => {
    if (!pickedAssigned) return Swal.fire("Warning", "Select a role to remove", "warning");
    const ok = await Swal.fire({ title: "Remove role?", icon: "warning", showCancelButton: true });
    if (!ok.isConfirmed) return;
    try {
      await UserApi.unassignRoles({ userUuid: selectedUser.userUuid, roleUuids: [pickedAssigned] });
      Swal.fire({ icon: "success", title: "Role removed", timer: 1500, showConfirmButton: false });
      await refreshRolesAndPerms();
    } catch (err) { Swal.fire("Error", getBackendErrorMessage(err), "error"); }
  };

  // ── permission overrides ──────────────────────────────────────────────────
  const handleGrantPerm = async (permUuid: string) => {
    try {
      await UserApi.grantPermission({ userUuid: selectedUser.userUuid, permissionUuids: [permUuid] });
      setPermissions(await UserApi.getEffectivePermissions(selectedUser.userUuid));
    } catch (err) { Swal.fire("Error", getBackendErrorMessage(err), "error"); }
  };

  const handleRevokePerm = async (permUuid: string) => {
    try {
      await UserApi.revokePermission({ userUuid: selectedUser.userUuid, permissionUuid: permUuid });
      setPermissions(await UserApi.getEffectivePermissions(selectedUser.userUuid));
    } catch (err) { Swal.fire("Error", getBackendErrorMessage(err), "error"); }
  };

  // ── toggle / reset / delete ───────────────────────────────────────────────
  const handleToggleActive = async (user: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (user.userName === authUser?.userName) {
      Swal.fire("Not Allowed", "You cannot enable/disable your own account.", "warning"); return;
    }
    const action = user.active ? "disable" : "enable";
    const ok = await Swal.fire({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} user?`,
      text: `Are you sure you want to ${action} ${user.firstName}?`,
      icon: "warning", showCancelButton: true, confirmButtonText: `Yes, ${action}!`,
    });
    if (!ok.isConfirmed) return;
    try { await UserApi.toggleStatus(user.userUuid); fetchUsers(); }
    catch (err) { Swal.fire("Error", getBackendErrorMessage(err), "error"); }
  };

  const handleResetPassword = async (user: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user.active) { Swal.fire("Not Allowed", "Enable the account before resetting password.", "warning"); return; }
    const ok = await Swal.fire({ title: "Reset password?", text: "A temporary password will be generated.", icon: "warning", showCancelButton: true, confirmButtonText: "Yes, reset!" });
    if (!ok.isConfirmed) return;
    try {
      await UserApi.adminResetPassword(user.userUuid);
      Swal.fire({ icon: "success", title: "Password reset", timer: 2000, showConfirmButton: false });
    } catch (err) { Swal.fire("Error", getBackendErrorMessage(err), "error"); }
  };

  const handleDelete = async (user: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await Swal.fire({ title: "Delete user?", text: `Delete ${user.firstName}?`, icon: "warning", showCancelButton: true, confirmButtonColor: "#d33" });
    if (!ok.isConfirmed) return;
    try {
      await UserApi.delete(user.userUuid);
      if (selectedUser?.userUuid === user.userUuid) clearSelection();
      fetchUsers();
    } catch (err) { Swal.fire("Error", getBackendErrorMessage(err), "error"); }
  };

  // ── add / edit modal ──────────────────────────────────────────────────────
  const openAdd = () => {
    setEditingUser(null);
    setStaffSearch("");
    setOnboardForm({ staffUuid: "", userName: "", roleUuids: [], enable2FA: false });
    setModalOpen(true);
  };

  const openEdit = (user: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingUser(user);
    setForm({ userName: user.userName ?? "", firstName: user.firstName ?? "", otherNames: user.otherNames ?? "", email: user.email ?? "", phoneNumber: user.phoneNumber ?? "", profileRef: user.profileRef ?? "", roleUuids: [] });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (editingUser) {
      if (!form.userName || !form.firstName || !form.email) {
        Swal.fire("Validation", "Username, first name and email are required.", "warning"); return;
      }
      try {
        await UserApi.update(editingUser.userUuid, form);
        Swal.fire({ icon: "success", title: "User updated", timer: 1500, showConfirmButton: false });
        setModalOpen(false); fetchUsers();
      } catch (err) { Swal.fire("Error", getBackendErrorMessage(err), "error"); }
      return;
    }

    if (!onboardForm.staffUuid) { Swal.fire("Validation", "Select a staff member to onboard.", "warning"); return; }
    if (!onboardForm.userName) { Swal.fire("Validation", "Username is required.", "warning"); return; }
    if (onboardForm.roleUuids.length === 0) { Swal.fire("Validation", "Select a role.", "warning"); return; }
    try {
      const result = await UserApi.onboardStaff(onboardForm);
      setModalOpen(false); fetchUsers();
      const tempPassword = result?.temporaryPassword;
      await Swal.fire({
        icon: "success",
        title: "Staff onboarded",
        html: tempPassword
          ? `<p>Account created for <b>${result.user?.firstName ?? ""} ${result.user?.otherNames ?? ""}</b>.</p>
             <p>Temporary password (share with them securely — valid 24 hours):</p>
             <code style="font-size:1.1em">${tempPassword}</code>`
          : "Account created.",
      });
    } catch (err) { Swal.fire("Error", getBackendErrorMessage(err), "error"); }
  };

  // ── pagination helpers ────────────────────────────────────────────────────
  const filtered = users.filter(u =>
    `${u.firstName} ${u.otherNames} ${u.email} ${u.userName}`.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages  = Math.ceil(filtered.length / itemsPerPage);
  const pagedUsers  = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalAssignedPages   = Math.ceil(assignedRoles.length / assignedPerPage);
  const pagedAssigned        = assignedRoles.slice((assignedPage - 1) * assignedPerPage, assignedPage * assignedPerPage);
  const totalUnassignedPages = Math.ceil(unassignedRoles.length / unassignedPerPage);
  const pagedUnassigned      = unassignedRoles.slice((unassignedPage - 1) * unassignedPerPage, unassignedPage * unassignedPerPage);

  const filteredPerms  = permissions.filter(p => permSearch.trim() === "" || (p.name ?? "").toLowerCase().includes(permSearch.toLowerCase()));
  const totalPermPages = Math.ceil(filteredPerms.length / permPerPage);
  const pagedPerms     = filteredPerms.slice((permPage - 1) * permPerPage, permPage * permPerPage);

  const overrideBadge = (type: string) => {
    if (type === "GRANT")  return <Badge className="text-[10px] bg-green-100 text-green-700 hover:bg-green-100">GRANT</Badge>;
    if (type === "REVOKE") return <Badge className="text-[10px] bg-red-100 text-red-700 hover:bg-red-100">REVOKE</Badge>;
    return <Badge variant="outline" className="text-[10px]">INHERITED</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">Manage system users and their access</p>
        </div>
        <Button size="sm" onClick={openAdd}><UserPlus className="w-4 h-4 mr-1" /> Add User</Button>
      </div>

      {/* ── Users table ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">All Users</CardTitle>
              <CardDescription>{users.length} users registered</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search users..." className="pl-9" value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>First Name</TableHead>
                <TableHead>Other Names</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedUsers.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No users found</TableCell></TableRow>
              ) : pagedUsers.map(u => (
                <TableRow key={u.userUuid} onClick={() => handleUserSelect(u)}
                  className={`cursor-pointer hover:bg-muted ${selectedUser?.userUuid === u.userUuid ? "bg-muted" : ""}`}>
                  <TableCell className="font-medium">{u.firstName}</TableCell>
                  <TableCell>{u.otherNames}</TableCell>
                  <TableCell className="font-mono text-xs">{u.userName}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                  <TableCell className="text-sm">{u.phoneNumber}</TableCell>
                  <TableCell>
                    {(u.roles ?? []).length > 0
                      ? (u.roles as string[]).map((r: string) => <Badge key={r} variant="outline" className="text-xs mr-1">{r}</Badge>)
                      : <span className="text-xs text-muted-foreground">None</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.active ? "default" : "secondary"} className="text-[10px]">
                      {u.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600" onClick={e => openEdit(u, e)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <button onClick={e => handleToggleActive(u, e)}
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full border-0 cursor-pointer ${u.active ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-green-100 text-green-700 hover:bg-green-200"}`}>
                        {u.active ? "Disable" : "Enable"}
                      </button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600" title="Reset Password" onClick={e => handleResetPassword(u, e)}>
                        <KeyRound className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={e => handleDelete(u, e)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage} onItemsPerPageChange={v => { setItemsPerPage(v); setCurrentPage(1); }} />
        </CardContent>
      </Card>

      {selectedUser && (
        <div ref={roleSectionRef} className="space-y-6">

          {/* ── Manage Roles ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                Manage Roles — {selectedUser.firstName} {selectedUser.otherNames}
                <Button variant="outline" size="sm" onClick={clearSelection}>Clear</Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {/* Available */}
                <div>
                  <h5 className="font-semibold mb-2 text-sm">Available Roles</h5>
                  <ul className="border rounded divide-y min-h-[60px]">
                    {pagedUnassigned.length === 0
                      ? <li className="p-2 text-sm text-muted-foreground">No roles</li>
                      : pagedUnassigned.map(r => (
                        <li key={r.uuid ?? r.roleUuid}
                          onClick={() => { setPickedUnassigned(r.uuid ?? r.roleUuid); setPickedAssigned(null); }}
                          className={`p-2 text-sm cursor-pointer hover:bg-muted ${pickedUnassigned === (r.uuid ?? r.roleUuid) ? "bg-blue-50 border-l-4 border-blue-500" : ""}`}>
                          {r.name ?? r.roleName}
                        </li>
                      ))}
                  </ul>
                  <Pagination currentPage={unassignedPage} totalPages={totalUnassignedPages} onPageChange={setUnassignedPage}
                    itemsPerPage={unassignedPerPage} onItemsPerPageChange={v => { setUnassignedPerPage(v); setUnassignedPage(1); }} />
                </div>
                {/* Arrows */}
                <div className="flex flex-col justify-center items-center gap-2">
                  <Button onClick={assignRole} disabled={!pickedUnassigned} className="bg-green-600 hover:bg-green-700 w-full">
                    Assign &gt;&gt;
                  </Button>
                  <Button onClick={removeRole} disabled={!pickedAssigned} variant="destructive" className="w-full">
                    &lt;&lt; Remove
                  </Button>
                </div>
                {/* Assigned */}
                <div>
                  <h5 className="font-semibold mb-2 text-sm">Assigned Roles</h5>
                  <ul className="border rounded divide-y min-h-[60px]">
                    {pagedAssigned.length === 0
                      ? <li className="p-2 text-sm text-muted-foreground">No roles</li>
                      : pagedAssigned.map(r => (
                        <li key={r.uuid ?? r.roleUuid}
                          onClick={() => { setPickedAssigned(r.uuid ?? r.roleUuid); setPickedUnassigned(null); }}
                          className={`p-2 text-sm cursor-pointer hover:bg-muted ${pickedAssigned === (r.uuid ?? r.roleUuid) ? "bg-blue-50 border-l-4 border-blue-500" : ""}`}>
                          {r.name ?? r.roleName}
                        </li>
                      ))}
                  </ul>
                  <Pagination currentPage={assignedPage} totalPages={totalAssignedPages} onPageChange={setAssignedPage}
                    itemsPerPage={assignedPerPage} onItemsPerPageChange={v => { setAssignedPerPage(v); setAssignedPage(1); }} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Effective Permissions ── */}
          <Card>
            <CardHeader>
              <CardTitle>Permissions — {selectedUser.firstName} {selectedUser.otherNames}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search permissions..." value={permSearch}
                  onChange={e => { setPermSearch(e.target.value); setPermPage(1); }} className="max-w-sm" />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Permission</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Access Type</TableHead>
                    <TableHead>Override</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedPerms.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No permissions</TableCell></TableRow>
                  ) : pagedPerms.map((p: any, i: number) => (
                    <TableRow key={p.permissionUuid ?? i}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.permDesc}</TableCell>
                      <TableCell className="text-sm">{p.accessType}</TableCell>
                      <TableCell>{overrideBadge(p.overrideType)}</TableCell>
                      <TableCell className="text-right">
                        {p.overrideType === "REVOKE" ? (
                          <Button size="sm" onClick={() => handleGrantPerm(p.permissionUuid)}>Grant</Button>
                        ) : (
                          <Button size="sm" variant="destructive" onClick={() => handleRevokePerm(p.permissionUuid)}>Revoke</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination currentPage={permPage} totalPages={totalPermPages} onPageChange={setPermPage}
                itemsPerPage={permPerPage} onItemsPerPageChange={v => { setPermPerPage(v); setPermPage(1); }} />
            </CardContent>
          </Card>

        </div>
      )}

      {/* ── Add (onboard from staff) / Edit Modal ── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Onboard Staff"}</DialogTitle>
          </DialogHeader>

          {editingUser ? (
            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="space-y-1">
                <Label>Username *</Label>
                <Input value={form.userName} disabled onChange={e => setForm(f => ({ ...f, userName: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>First Name *</Label>
                <Input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Other Names</Label>
                <Input value={form.otherNames} onChange={e => setForm(f => ({ ...f, otherNames: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input value={form.phoneNumber} onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Profile Ref</Label>
                <Input value={form.profileRef} placeholder="Staff/Student UUID" onChange={e => setForm(f => ({ ...f, profileRef: e.target.value }))} />
              </div>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label>Staff Member *</Label>
                <Select value={onboardForm.staffUuid || undefined} onValueChange={handleStaffSelect}>
                  <SelectTrigger><SelectValue placeholder="Select a staff member" /></SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-2">
                      <Input
                        placeholder="Search by name, staff ID, email..."
                        value={staffSearch}
                        onChange={e => setStaffSearch(e.target.value)}
                        onKeyDown={e => e.stopPropagation()}
                      />
                    </div>
                    {availableStaff.length === 0 ? (
                      <div className="px-2 py-3 text-sm text-muted-foreground">No unonboarded staff found</div>
                    ) : availableStaff.map(s => (
                      <SelectItem key={s.uuid} value={s.uuid}>
                        {s.firstName} {s.lastName} — {s.staffId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Only staff without an existing account are shown.</p>
              </div>

              {selectedStaff && (
                <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
                  <div><span className="text-muted-foreground">Email:</span> {selectedStaff.email || "—"}</div>
                  <div><span className="text-muted-foreground">Phone:</span> {selectedStaff.phone || "—"}</div>
                  <div><span className="text-muted-foreground">Staff Type:</span> {selectedStaff.staffType || "—"}</div>
                </div>
              )}

              <div className="space-y-1">
                <Label>Username *</Label>
                <Input value={onboardForm.userName} onChange={e => setOnboardForm(f => ({ ...f, userName: e.target.value }))} />
              </div>

              <div className="space-y-1">
                <Label>Role *</Label>
                <select className="w-full border rounded px-3 py-2 text-sm"
                  value={onboardForm.roleUuids[0] ?? ""}
                  onChange={e => setOnboardForm(f => ({ ...f, roleUuids: e.target.value ? [e.target.value] : [] }))}>
                  <option value="">— Select role —</option>
                  {allRoles.map(r => (
                    <option key={r.uuid ?? r.roleUuid} value={r.uuid ?? r.roleUuid}>{r.name ?? r.roleName}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between rounded-md border p-3">
                <Label htmlFor="enable2fa" className="cursor-pointer">Enable Two-Factor Authentication</Label>
                <Switch id="enable2fa" checked={onboardForm.enable2FA} onCheckedChange={c => setOnboardForm(f => ({ ...f, enable2FA: c }))} />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingUser ? "Save" : "Onboard"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersPage;
