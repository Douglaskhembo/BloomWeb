import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Download, Filter, Users, GraduationCap, UserCheck, UserX, Eye, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import StatCard from "@/components/dashboard/StatCard";
import StaffViewModal from "@/components/modal/StaffViewModal";
import type { StaffMember } from "@/components/modal/StaffViewModal";
import StaffFormModal from "@/components/modal/StaffFormModal";
import { emptyStaff, StaffFormData } from "@/components/forms/StaffForm";
import { StaffApi } from "@/services/api";

const STATUS_LABELS: Record<string, string> = { ACTIVE: "Active", ON_LEAVE: "On Leave", RESIGNED: "Resigned", SUSPENDED: "Suspended" };
const STATUS_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default", ON_LEAVE: "secondary", RESIGNED: "destructive", SUSPENDED: "destructive",
};
const STAFF_TYPE_LABELS: Record<string, string> = { TEACHING: "Teaching", NON_TEACHING: "Non-Teaching", ADMIN: "Admin" };

const toStaffMember = (s: any): StaffMember => ({
  uuid: s.uuid,
  staffId: s.staffId,
  firstName: s.firstName,
  lastName: s.lastName,
  gender: s.gender ?? "",
  dateOfBirth: s.dateOfBirth ?? "",
  idNumber: s.idNumber ?? "",
  phone: s.phone ?? "",
  email: s.email ?? "",
  address: s.address ?? "",
  practiceNumber: s.practiceNumber ?? "",
  staffType: s.staffType ?? "",
  employmentType: s.employmentType ?? "",
  contractPeriodMonths: s.contractPeriodMonths ?? null,
  subject: s.subject ?? "",
  grade: s.grade ?? "",
  qualification: s.qualification ?? "",
  experience: s.experience ?? "",
  joined: s.joined ?? "",
  status: s.status ?? "ACTIVE",
  emergencyContactName: s.emergencyContactName ?? "",
  emergencyContactPhone: s.emergencyContactPhone ?? "",
  emergencyContactRelationship: s.emergencyContactRelationship ?? "",
  documents: s.documents ?? [],
});

const toRequest = (data: StaffFormData) => ({
  firstName: data.firstName,
  lastName: data.lastName,
  gender: data.gender || null,
  dateOfBirth: data.dateOfBirth || null,
  idNumber: data.idNumber || null,
  phone: data.phone,
  email: data.email || null,
  address: data.address || null,
  practiceNumber: data.practiceNumber || null,
  staffType: data.staffType || null,
  employmentType: data.employmentType || null,
  contractPeriodMonths: data.contractPeriodMonths ?? null,
  subject: data.subject || null,
  grade: data.grade || null,
  qualification: data.qualification || null,
  experience: data.experience || null,
  joined: data.joined || null,
  emergencyContactName: data.emergencyContactName || null,
  emergencyContactPhone: data.emergencyContactPhone || null,
  emergencyContactRelationship: data.emergencyContactRelationship || null,
});

const TeachersPage = () => {
  const { toast } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [formData, setFormData] = useState<StaffFormData>(emptyStaff);

  const loadStaff = async () => {
    setLoading(true);
    try {
      const data = await StaffApi.getAll();
      setStaff(data.map(toStaffMember));
    } catch {
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStaff(); }, []);

  const filteredStaff = staff.filter(s =>
    `${s.firstName} ${s.lastName} ${s.staffId} ${s.subject} ${s.staffType}`.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: staff.length,
    teaching: staff.filter(s => s.staffType === "TEACHING").length,
    active: staff.filter(s => s.status === "ACTIVE").length,
    onLeave: staff.filter(s => s.status === "ON_LEAVE").length,
  };

  const handleOpenAdd = () => {
    setFormData({ ...emptyStaff });
    setIsEditing(false);
    setSelectedStaff(null);
    setDialogOpen(true);
  };

  const handleView = (s: StaffMember) => { setSelectedStaff(s); setViewDialogOpen(true); };

  const handleEdit = (s: StaffMember) => {
    const { uuid, staffId, ...rest } = s as any;
    setFormData({ ...emptyStaff, ...rest });
    setSelectedStaff(s);
    setIsEditing(true);
    setDialogOpen(true);
  };

  const handleDelete = async (s: StaffMember) => {
    try {
      await StaffApi.delete(s.uuid);
      setStaff(prev => prev.filter(x => x.uuid !== s.uuid));
      toast({ title: "Staff removed", description: `${s.firstName} ${s.lastName} has been removed.` });
    } catch (err: any) {
      toast({ title: "Error", description: err?.response?.data?.message ?? "Failed to delete staff", variant: "destructive" });
    }
  };

  const handleSubmit = async () => {
    if (!formData.firstName || !formData.lastName || !formData.phone || !formData.staffType || !formData.employmentType ||
      (formData.staffType === "TEACHING" && !formData.practiceNumber)) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    if ((formData.employmentType === "CONTRACT" || formData.employmentType === "INTERN") && !formData.contractPeriodMonths) {
      toast({ title: "Missing fields", description: "Please enter the contract period in months.", variant: "destructive" });
      return;
    }
    try {
      if (isEditing && selectedStaff) {
        const updated = await StaffApi.update(selectedStaff.uuid, toRequest(formData));
        setStaff(prev => prev.map(s => s.uuid === selectedStaff.uuid ? toStaffMember(updated) : s));
        toast({ title: "Staff updated", description: `${formData.firstName} ${formData.lastName} has been updated.` });
      } else {
        const created = await StaffApi.create(toRequest(formData));
        setStaff(prev => [...prev, toStaffMember(created)]);
        toast({ title: "Staff added", description: `${formData.firstName} ${formData.lastName} has been added.` });
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err?.response?.data?.message ?? "Failed to save staff", variant: "destructive" });
    }
  };

  const handleStatusChange = async (s: StaffMember, newStatus: string) => {
    try {
      const updated = await StaffApi.updateStatus(s.uuid, newStatus);
      setStaff(prev => prev.map(x => x.uuid === s.uuid ? toStaffMember(updated) : x));
      setSelectedStaff(prev => prev?.uuid === s.uuid ? toStaffMember(updated) : prev);
      toast({ title: "Status updated", description: `${s.firstName} ${s.lastName} is now ${STATUS_LABELS[newStatus] ?? newStatus}.` });
    } catch (err: any) {
      toast({ title: "Error", description: err?.response?.data?.message ?? "Failed to update status", variant: "destructive" });
    }
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
              <Input placeholder="Search by name, subject, ID..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button variant="outline" size="sm"><Filter className="w-4 h-4 mr-1" /> Filters</Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading staff...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Staff Type</TableHead>
                  <TableHead>Employment</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">No staff found</TableCell></TableRow>
                ) : filteredStaff.map(s => (
                  <TableRow key={s.uuid}>
                    <TableCell className="font-mono text-xs">{s.staffId ?? s.uuid?.slice(0, 8) ?? "—"}</TableCell>
                    <TableCell className="font-medium">{s.firstName} {s.lastName}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{STAFF_TYPE_LABELS[s.staffType] ?? s.staffType}</Badge></TableCell>
                    <TableCell className="text-xs">{s.employmentType}{s.contractPeriodMonths ? ` (${s.contractPeriodMonths}mo)` : ""}</TableCell>
                    <TableCell>{s.subject || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{s.phone}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{s.joined || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE[s.status] ?? "outline"} className="text-[10px]">
                        {STATUS_LABELS[s.status] ?? s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleView(s)}><Eye className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(s)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(s)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
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
