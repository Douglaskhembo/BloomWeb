import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, ArrowLeft, FileText } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import LeaveTypeFormModal from "@/components/modal/LeaveTypeFormModal";
import { LeaveTypeFormValues } from "@/components/forms/LeaveTypeForm";

interface LeaveType {
  id: number;
  name: string;
  days: number;
  paid: boolean;
  active: boolean;
  requiresDocument: boolean;
  documentTypes: string[];
}

const initialLeaveTypes: LeaveType[] = [
  { id: 1, name: "Annual Leave", days: 21, paid: true, active: true, requiresDocument: false, documentTypes: [] },
  { id: 2, name: "Sick Leave", days: 10, paid: true, active: true, requiresDocument: true, documentTypes: ["Medical Certificate", "Doctor's Note"] },
  { id: 3, name: "Maternity Leave", days: 90, paid: true, active: true, requiresDocument: true, documentTypes: ["Medical Certificate"] },
  { id: 4, name: "Paternity Leave", days: 14, paid: true, active: true, requiresDocument: true, documentTypes: ["Birth Certificate"] },
  { id: 5, name: "Compassionate Leave", days: 5, paid: true, active: true, requiresDocument: true, documentTypes: ["Death Certificate", "Hospital Admission Letter"] },
  { id: 6, name: "Study Leave", days: 30, paid: false, active: false, requiresDocument: true, documentTypes: ["Admission Letter", "Exam Timetable"] },
];

const allDocumentTypes = [
  "Medical Certificate", "Doctor's Note", "Birth Certificate", "Death Certificate",
  "Hospital Admission Letter", "Admission Letter", "Exam Timetable", "Court Summons",
  "Travel Itinerary", "Other",
];

const emptyForm: LeaveTypeFormValues = { name: "", days: "", paid: true, requiresDocument: false, documentTypes: [] };

const LeaveTypesSetupPage = () => {
  const navigate = useNavigate();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>(initialLeaveTypes);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LeaveType | null>(null);
  const [form, setForm] = useState<LeaveTypeFormValues>(emptyForm);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (lt: LeaveType) => {
    setEditing(lt);
    setForm({ name: lt.name, days: String(lt.days), paid: lt.paid, requiresDocument: lt.requiresDocument, documentTypes: [...lt.documentTypes] });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.days) { toast.error("Please fill in all required fields"); return; }
    if (editing) {
      setLeaveTypes((prev) => prev.map((lt) => lt.id === editing.id
        ? { ...lt, name: form.name, days: Number(form.days), paid: form.paid, requiresDocument: form.requiresDocument, documentTypes: form.requiresDocument ? form.documentTypes : [] }
        : lt));
      toast.success("Leave type updated");
    } else {
      const newId = Math.max(...leaveTypes.map((l) => l.id), 0) + 1;
      setLeaveTypes((prev) => [...prev, { id: newId, name: form.name, days: Number(form.days), paid: form.paid, active: true, requiresDocument: form.requiresDocument, documentTypes: form.requiresDocument ? form.documentTypes : [] }]);
      toast.success("Leave type added");
    }
    setDialogOpen(false);
  };

  const toggleActive = (id: number) => setLeaveTypes((prev) => prev.map((lt) => (lt.id === id ? { ...lt, active: !lt.active } : lt)));
  const handleDelete = (id: number) => { setLeaveTypes((prev) => prev.filter((lt) => lt.id !== id)); toast.success("Leave type deleted"); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/management")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Leave Types</h1>
            <p className="text-muted-foreground">Configure leave categories, entitlements, and policies</p>
          </div>
        </div>
        <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> Add Leave Type</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Leave Types</CardTitle>
          <CardDescription>{leaveTypes.filter((l) => l.active).length} active · {leaveTypes.length} total</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Leave Type</TableHead>
                <TableHead className="text-center">Entitlement (Days)</TableHead>
                <TableHead className="text-center">Paid</TableHead>
                <TableHead className="text-center">Document Required</TableHead>
                <TableHead>Accepted Documents</TableHead>
                <TableHead className="text-center">Active</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaveTypes.map((lt) => (
                <TableRow key={lt.id}>
                  <TableCell className="font-medium">{lt.name}</TableCell>
                  <TableCell className="text-center">{lt.days}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={lt.paid ? "default" : "secondary"} className="text-[10px]">{lt.paid ? "Yes" : "No"}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {lt.requiresDocument ? (
                      <Badge variant="default" className="text-[10px] bg-amber-500 hover:bg-amber-600">Required</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">No</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {lt.documentTypes.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {lt.documentTypes.map((dt) => (
                          <Badge key={dt} variant="outline" className="text-[10px]">
                            <FileText className="w-3 h-3 mr-1" />{dt}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch checked={lt.active} onCheckedChange={() => toggleActive(lt.id)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(lt)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(lt.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <LeaveTypeFormModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        isEditing={!!editing}
        value={form}
        onChange={setForm}
        allDocumentTypes={allDocumentTypes}
        onSubmit={handleSave}
      />
    </div>
  );
};

export default LeaveTypesSetupPage;