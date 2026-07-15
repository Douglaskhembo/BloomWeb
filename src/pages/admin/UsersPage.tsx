import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { UserPlus, Search, Eye, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import UserViewModal, { SystemUser } from "@/components/modal/UserViewModal";
import UserFormModal from "@/components/modal/UserFormModal";

const staffList = [
  { id: "TCH-001", name: "Jane Njeri", email: "jane@school.com", staffType: "Teaching" },
  { id: "TCH-002", name: "Peter Ouma", email: "peter@school.com", staffType: "Teaching" },
  { id: "TCH-003", name: "Sarah Wambui", email: "sarah@school.com", staffType: "Teaching" },
  { id: "TCH-004", name: "David Kibet", email: "david@school.com", staffType: "Teaching" },
  { id: "TCH-005", name: "Grace Akinyi", email: "grace@school.com", staffType: "Teaching" },
  { id: "TCH-006", name: "James Wafula", email: "james@school.com", staffType: "Teaching" },
  { id: "TCH-007", name: "Mary Chebet", email: "mary@school.com", staffType: "Teaching" },
  { id: "SUP-001", name: "Samuel Njogu", email: "samuel@school.com", staffType: "Support" },
];

const availableRoles = ["Super Admin", "Admin", "Finance Officer", "Receptionist", "ICT Support", "Teacher", "Librarian"];

const initialUsers: SystemUser[] = [
  { id: 1, staffId: "TCH-001", name: "Jane Njeri", email: "jane@school.com", role: "Admin", status: "Active", lastLogin: "2026-04-07" },
  { id: 2, staffId: "SUP-001", name: "Samuel Njogu", email: "samuel@school.com", role: "ICT Support", status: "Active", lastLogin: "2026-04-06" },
];

const UsersPage = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<SystemUser[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [selectedRole, setSelectedRole] = useState("");

  const filteredUsers = users.filter((u) =>
    `${u.name} ${u.email} ${u.role} ${u.staffId}`.toLowerCase().includes(search.toLowerCase())
  );

  const availableStaff = staffList.filter((s) => !users.some((u) => u.staffId === s.id));

  const handleOpenAdd = () => {
    setSelectedStaffId("");
    setSelectedRole("");
    setIsEditing(false);
    setSelectedUser(null);
    setDialogOpen(true);
  };

  const handleView = (u: SystemUser) => {
    setSelectedUser(u);
    setViewDialogOpen(true);
  };

  const handleEdit = (u: SystemUser) => {
    setSelectedUser(u);
    setSelectedStaffId(u.staffId);
    setSelectedRole(u.role);
    setIsEditing(true);
    setDialogOpen(true);
  };

  const handleDelete = (u: SystemUser) => {
    setUsers((prev) => prev.filter((x) => x.id !== u.id));
    toast({ title: "User removed", description: `${u.name} has been removed from system users.` });
  };

  const handleSubmit = () => {
    if (!isEditing && !selectedStaffId) {
      toast({ title: "Select staff", description: "Please select a staff member.", variant: "destructive" });
      return;
    }
    if (isEditing && selectedUser) {
      setUsers((prev) => prev.map((u) => u.id === selectedUser.id ? { ...u, role: selectedRole } : u));
      toast({ title: "User updated", description: `${selectedUser.name}'s role has been updated.` });
    } else {
      const staff = staffList.find((s) => s.id === selectedStaffId);
      if (!staff) return;
      const newUser: SystemUser = {
        id: Date.now(),
        staffId: staff.id,
        name: staff.name,
        email: staff.email,
        role: selectedRole,
        status: "Active",
        lastLogin: "—",
      };
      setUsers((prev) => [...prev, newUser]);
      toast({ title: "User added", description: `${staff.name} has been added as a system user.` });
    }
    setDialogOpen(false);
  };

  const handleStatusChange = (u: SystemUser, status: string) => {
    setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, status } : x));
    setSelectedUser((prev) => prev?.id === u.id ? { ...prev, status } : prev);
    toast({ title: "Status updated", description: `${u.name} is now ${status}.` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">Manage system users and their access</p>
        </div>
        <Button size="sm" onClick={handleOpenAdd}><UserPlus className="w-4 h-4 mr-1" /> Add User</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">All Users</CardTitle>
              <CardDescription>{users.length} users registered</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search users..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono text-xs">{u.staffId}</TableCell>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                  <TableCell>
                    {u.role ? (
                      <Badge variant="outline" className="text-xs">{u.role}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not assigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.status === "Active" ? "default" : "secondary"} className="text-[10px]">{u.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{u.lastLogin}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleView(u)}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(u)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(u)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <UserViewModal
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        user={selectedUser}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onStatusChange={handleStatusChange}
      />

      <UserFormModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        isEditing={isEditing}
        availableStaff={availableStaff}
        editingUserName={selectedUser?.name}
        editingUserStaffId={selectedUser?.staffId}
        staffId={selectedStaffId}
        onStaffIdChange={setSelectedStaffId}
        role={selectedRole}
        onRoleChange={setSelectedRole}
        availableRoles={availableRoles}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default UsersPage;