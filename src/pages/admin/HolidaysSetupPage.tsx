import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import HolidayFormModal from "@/components/modal/HolidayFormModal";
import { HolidayFormValues } from "@/components/forms/HolidayForm";
import { HolidayApi } from "@/services/api";
import { getBackendErrorMessage } from "@/utils/errorHandler";
import Pagination from "@/utils/Pagination";

interface Holiday { id: number; name: string; date: string; recurringAnnually: boolean; status: "active" | "inactive"; }

const toHoliday = (raw: any): Holiday => ({
  id: raw.id,
  name: raw.name,
  date: raw.date,
  recurringAnnually: !!raw.recurringAnnually,
  status: raw.active ? "active" : "inactive",
});

const emptyForm: HolidayFormValues = { name: "", date: "", recurringAnnually: false, active: true };

const HolidaysSetupPage = () => {
  const navigate = useNavigate();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<HolidayFormValues>(emptyForm);
  const [holidaysPage, setHolidaysPage] = useState(1);
  const [holidaysPerPage, setHolidaysPerPage] = useState(10);

  const load = () => {
    setLoading(true);
    HolidayApi.getAll()
      .then((data) => setHolidays(data.map(toHoliday).sort((a, b) => a.date.localeCompare(b.date))))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (h: Holiday) => {
    setEditingId(h.id);
    setForm({ name: h.name, date: h.date, recurringAnnually: h.recurringAnnually, active: h.status === "active" });
    setOpen(true);
  };

  const handleSubmit = async () => {
    const payload = { name: form.name, date: form.date, recurringAnnually: form.recurringAnnually, active: form.active };
    try {
      if (editingId !== null) {
        await HolidayApi.update(editingId, payload);
        Swal.fire({ title: "Success", text: "Holiday updated", icon: "success", showConfirmButton: true });
      } else {
        await HolidayApi.create(payload);
        Swal.fire({ title: "Success", text: "Holiday added", icon: "success", showConfirmButton: true });
      }
      setOpen(false);
      load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to save holiday", text: getBackendErrorMessage(err), showConfirmButton: true });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await HolidayApi.delete(id);
      Swal.fire({ title: "Success", text: "Holiday removed", icon: "success", showConfirmButton: true });
      load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to delete holiday", text: getBackendErrorMessage(err), showConfirmButton: true });
    }
  };

  const totalHolidaysPages = Math.ceil(holidays.length / holidaysPerPage);
  const pagedHolidays = holidays.slice((holidaysPage - 1) * holidaysPerPage, holidaysPage * holidaysPerPage);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/management")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Public Holidays</h1>
          <p className="text-muted-foreground">Manage the dates leave requests treat as non-working days</p>
        </div>
        <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> Add Holiday</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configured Holidays</CardTitle>
          <CardDescription>{holidays.filter((h) => h.status === "active").length} active · {holidays.length} total</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading holidays...</p>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-center">Recurring Annually</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holidays.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">No public holidays configured yet.</TableCell></TableRow>
              ) : pagedHolidays.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="font-medium">{h.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{h.date}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={h.recurringAnnually ? "default" : "secondary"} className="text-[10px]">
                      {h.recurringAnnually ? "Yes" : "No"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={h.status === "active" ? "default" : "secondary"}>
                      {h.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(h)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(h.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
          <Pagination currentPage={holidaysPage} totalPages={totalHolidaysPages} onPageChange={setHolidaysPage}
            itemsPerPage={holidaysPerPage} onItemsPerPageChange={v => { setHolidaysPerPage(v); setHolidaysPage(1); }} />
        </CardContent>
      </Card>

      <HolidayFormModal
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

export default HolidaysSetupPage;
