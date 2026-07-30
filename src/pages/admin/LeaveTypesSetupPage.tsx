import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, ArrowLeft, FileText } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import LeaveTypeFormModal from "@/components/modal/LeaveTypeFormModal";
import { LeaveTypeFormValues } from "@/components/forms/LeaveTypeForm";
import { LeaveApi } from "@/services/api";
import { getBackendErrorMessage } from "@/utils/errorHandler";
import Pagination from "@/utils/Pagination";

interface LeaveType {
  id: number;
  name: string;
  days: number;
  paid: boolean;
  active: boolean;
  requiresDocument: boolean;
  documentTypes: string[];
}

const toLeaveType = (lt: any): LeaveType => ({
  id: lt.id,
  name: lt.name,
  days: lt.maxDaysPerYear,
  paid: lt.paid,
  active: lt.active,
  requiresDocument: lt.requiresDocument,
  documentTypes: lt.documentTypes ?? [],
});

const allDocumentTypes = [
  "Medical Certificate", "Doctor's Note", "Birth Certificate", "Death Certificate",
  "Hospital Admission Letter", "Admission Letter", "Exam Timetable", "Court Summons",
  "Travel Itinerary", "Other",
];

const emptyForm: LeaveTypeFormValues = { name: "", days: "", paid: true, requiresDocument: false, documentTypes: [] };

const LeaveTypesSetupPage = () => {
  const navigate = useNavigate();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LeaveType | null>(null);
  const [form, setForm] = useState<LeaveTypeFormValues>(emptyForm);
  const [leaveTypesPage, setLeaveTypesPage] = useState(1);
  const [leaveTypesPerPage, setLeaveTypesPerPage] = useState(10);

  const load = () => {
    setLoading(true);
    LeaveApi.getTypes()
      .then((data) => setLeaveTypes(data.map(toLeaveType)))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (lt: LeaveType) => {
    setEditing(lt);
    setForm({ name: lt.name, days: String(lt.days), paid: lt.paid, requiresDocument: lt.requiresDocument, documentTypes: [...lt.documentTypes] });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.days) { Swal.fire({ icon: "error", title: "Error", text: "Please fill in all required fields", showConfirmButton: true }); return; }
    const payload = {
      name: form.name,
      maxDaysPerYear: Number(form.days),
      paid: form.paid,
      requiresDocument: form.requiresDocument,
      documentTypes: form.requiresDocument ? form.documentTypes : [],
    };
    try {
      if (editing) {
        await LeaveApi.updateType(editing.id, payload);
        Swal.fire({ title: "Success", text: "Leave type updated", icon: "success", showConfirmButton: true });
      } else {
        await LeaveApi.createType(payload);
        Swal.fire({ title: "Success", text: "Leave type added", icon: "success", showConfirmButton: true });
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: getBackendErrorMessage(err, "Failed to save leave type"), showConfirmButton: true });
    }
  };

  const toggleActive = async (id: number) => {
    try {
      await LeaveApi.toggleTypeStatus(id);
      load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: getBackendErrorMessage(err, "Failed to update leave type status"), showConfirmButton: true });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await LeaveApi.deleteType(id);
      Swal.fire({ title: "Success", text: "Leave type deleted", icon: "success", showConfirmButton: true });
      load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: getBackendErrorMessage(err, "Failed to delete leave type"), showConfirmButton: true });
    }
  };

  const totalLeaveTypePages = Math.ceil(leaveTypes.length / leaveTypesPerPage);
  const pagedLeaveTypes = leaveTypes.slice((leaveTypesPage - 1) * leaveTypesPerPage, leaveTypesPage * leaveTypesPerPage);

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
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading leave types...</p>
          ) : (
          <>
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
              {pagedLeaveTypes.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">No leave types configured yet.</TableCell></TableRow>
              ) : pagedLeaveTypes.map((lt) => (
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
          <Pagination currentPage={leaveTypesPage} totalPages={totalLeaveTypePages} onPageChange={setLeaveTypesPage}
            itemsPerPage={leaveTypesPerPage} onItemsPerPageChange={v => { setLeaveTypesPerPage(v); setLeaveTypesPage(1); }} />
          </>
          )}
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