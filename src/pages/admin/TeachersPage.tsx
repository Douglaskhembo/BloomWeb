import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Download, Filter, Users, GraduationCap, UserCheck, UserX, Eye, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import StatCard from "@/components/dashboard/StatCard";
import StaffViewModal, { StaffMember } from "@/components/modal/StaffViewModal";
import StaffFormModal from "@/components/modal/StaffFormModal";
import { emptyStaff, StaffFormData } from "@/components/forms/StaffForm";
import { initialStaff } from "@/data/staff";

const TeachersPage = () => {
  const { toast } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [formData, setFormData] = useState<StaffFormData>(emptyStaff);

  const filteredStaff = staff.filter((s) =>
    `${s.firstName} ${s.lastName} ${s.id} ${s.subject} ${s.staffType}`.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: staff.length,
    teaching: staff.filter((s) => s.staffType === "Teaching").length,
    active: staff.filter((s) => s.status === "Active").length,
    onLeave: staff.filter((s) => s.status === "On Leave").length,
  };

  const nextId = () => {
    const teachingCount = staff.filter((s) => s.id.startsWith("TCH")).length;
    const supportCount = staff.filter((s) => s.id.startsWith("SUP")).length;
    return formData.staffType === "Support"
      ? `SUP-${String(supportCount + 1).padStart(3, "0")}`
      : `TCH-${String(teachingCount + 1).padStart(3, "0")}`;
  };

  const handleOpenAdd = () => {
    setFormData({ ...emptyStaff });
    setIsEditing(false);
    setSelectedStaff(null);
    setDialogOpen(true);
  };

  const handleView = (s: StaffMember) => {
    setSelectedStaff(s);
    setViewDialogOpen(true);
  };

  const handleEdit = (s: StaffMember) => {
    const { id, ...rest } = s;
    setFormData(rest);
    setSelectedStaff(s);
    setIsEditing(true);
    setDialogOpen(true);
  };

  const handleDelete = (s: StaffMember) => {
    setStaff((prev) => prev.filter((x) => x.id !== s.id));
    toast({ title: "Staff removed", description: `${s.firstName} ${s.lastName} has been removed.` });
  };

  const handleSubmit = () => {
    if (!formData.firstName || !formData.lastName || !formData.phone || !formData.staffType || (formData.staffType === "Teaching" && !formData.practiceNumber)) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    if (isEditing && selectedStaff) {
      setStaff((prev) => prev.map((s) => (s.id === selectedStaff.id ? { ...formData, id: selectedStaff.id } : s)));
      toast({ title: "Staff updated", description: `${formData.firstName} ${formData.lastName} has been updated.` });
    } else {
      const newStaff: StaffMember = { ...formData, id: nextId() };
      setStaff((prev) => [...prev, newStaff]);
      toast({ title: "Staff added", description: `${formData.firstName} ${formData.lastName} has been added.` });
    }
    setDialogOpen(false);
  };

  const handleStatusChange = (s: StaffMember, newStatus: string) => {
    setStaff((prev) => prev.map((x) => (x.id === s.id ? { ...x, status: newStatus } : x)));
    setSelectedStaff((prev) => (prev?.id === s.id ? { ...prev, status: newStatus } : prev));
    toast({ title: "Status updated", description: `${s.firstName} ${s.lastName} is now ${newStatus}.` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff Management</h1>
          <p className="text-muted-foreground">Manage teachers and support staff records</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" /> Export</Button>
          <Button size="sm" onClick={handleOpenAdd}><Plus className="w-4 h-4 mr-1" /> Add Staff</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Staff" value={stats.total} icon={Users} iconColor="bg-primary/10 text-primary" />
        <StatCard title="Teaching Staff" value={stats.teaching} icon={GraduationCap} iconColor="bg-info/10 text-info" />
        <StatCard title="Active" value={stats.active} icon={UserCheck} iconColor="bg-success/10 text-success" />
        <StatCard title="On Leave" value={stats.onLeave} icon={UserX} iconColor="bg-warning/10 text-warning" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by name, subject, ID..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button variant="outline" size="sm"><Filter className="w-4 h-4 mr-1" /> Filters</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.id}</TableCell>
                  <TableCell className="font-medium">{s.firstName} {s.lastName}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{s.staffType}</Badge></TableCell>
                  <TableCell>{s.subject}</TableCell>
                  <TableCell>{s.grade}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{s.phone}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{s.joined}</TableCell>
                  <TableCell>
                    <Badge
                      variant={s.status === "Active" ? "default" : s.status === "On Leave" ? "secondary" : "destructive"}
                      className="text-[10px]"
                    >
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleView(s)}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(s)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(s)}>
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

      <StaffViewModal
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        staff={selectedStaff}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onStatusChange={handleStatusChange}
      />

      <StaffFormModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        value={formData}
        onChange={setFormData}
        onSubmit={handleSubmit}
        isEditing={isEditing}
      />
    </div>
  );
};

export default TeachersPage;