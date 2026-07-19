import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Receipt, DollarSign, CheckCircle, AlertCircle, Pencil, Trash2 } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import { useToast } from "@/hooks/use-toast";
import BillFormModal from "@/components/modal/BillFormModal";
import { BillFormValues } from "@/components/forms/BillForm";
import { BillApi, SupplierApi } from "@/services/api";
import { getBackendErrorMessage } from "@/utils/errorHandler";

const formatKES = (n: number) => `KES ${n.toLocaleString()}`;

const emptyForm: BillFormValues = { supplierId: "", supplierName: "", description: "", amount: "", dueDate: "" };

const BillsPage = () => {
  const { toast } = useToast();
  const [bills, setBills] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<BillFormValues>(emptyForm);

  const load = () => {
    setLoading(true);
    BillApi.getAll().then(setBills).finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
    SupplierApi.getAll().then((data) => setSuppliers(data.map((s: any) => ({ id: s.id, name: s.name }))));
  }, []);

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (b: any) => {
    setEditingId(b.id);
    setForm({
      supplierId: b.supplierId ? String(b.supplierId) : "",
      supplierName: b.supplierName ?? "",
      description: b.description ?? "",
      amount: String(b.amount ?? ""),
      dueDate: b.dueDate ?? "",
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    const payload = {
      supplierId: form.supplierId ? Number(form.supplierId) : undefined,
      supplierName: form.supplierName || undefined,
      description: form.description,
      amount: Number(form.amount),
      dueDate: form.dueDate,
    };
    try {
      if (editingId !== null) {
        await BillApi.update(editingId, payload);
        toast({ title: "Bill updated" });
      } else {
        await BillApi.create(payload);
        toast({ title: "Bill added" });
      }
      setOpen(false);
      load();
    } catch (err) {
      toast({ title: "Failed to save bill", description: getBackendErrorMessage(err), variant: "destructive" });
    }
  };

  const handleMarkPaid = async (id: number) => {
    try {
      await BillApi.markPaid(id);
      toast({ title: "Bill marked as paid" });
      load();
    } catch (err) {
      toast({ title: "Failed to update bill", description: getBackendErrorMessage(err), variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await BillApi.delete(id);
      toast({ title: "Bill deleted" });
      load();
    } catch (err) {
      toast({ title: "Failed to delete bill", description: getBackendErrorMessage(err), variant: "destructive" });
    }
  };

  const stats = useMemo(() => {
    const totalUnpaid = bills.filter((b) => b.status !== "PAID").reduce((a, b) => a + b.amount, 0);
    const totalPaid = bills.filter((b) => b.status === "PAID").reduce((a, b) => a + b.amount, 0);
    const overdue = bills.filter((b) => b.status === "OVERDUE").length;
    return { totalUnpaid, totalPaid, overdue, total: bills.length };
  }, [bills]);

  const statusVariant = (status: string) => status === "PAID" ? "default" : status === "OVERDUE" ? "destructive" : "secondary";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bills & Expenses</h1>
          <p className="text-muted-foreground">Track supplier invoices and school expenses</p>
        </div>
        <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> Add Bill</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Outstanding" value={formatKES(stats.totalUnpaid)} icon={DollarSign} iconColor="bg-destructive/10 text-destructive" />
        <StatCard title="Paid" value={formatKES(stats.totalPaid)} icon={CheckCircle} iconColor="bg-success/10 text-success" />
        <StatCard title="Overdue" value={stats.overdue} change="Needs attention" changeType="negative" icon={AlertCircle} iconColor="bg-warning/10 text-warning" />
        <StatCard title="Total Bills" value={stats.total} icon={Receipt} iconColor="bg-info/10 text-info" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Bills</CardTitle>
          <CardDescription>Supplier invoices and expense tracking</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading bills...</p>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill #</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">No bills recorded yet.</TableCell></TableRow>
              ) : bills.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-xs">BILL-{String(b.id).padStart(3, "0")}</TableCell>
                  <TableCell className="font-medium">{b.supplierName}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{b.description}</TableCell>
                  <TableCell className="text-right font-semibold">{b.amount.toLocaleString()}</TableCell>
                  <TableCell className="text-xs">{b.dueDate}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(b.status)} className="text-[10px]">{b.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {b.status !== "PAID" && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleMarkPaid(b.id)}>Mark Paid</Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(b)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(b.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>

      <BillFormModal
        open={open}
        onOpenChange={setOpen}
        isEditing={editingId !== null}
        value={form}
        onChange={setForm}
        onSubmit={handleSubmit}
        suppliers={suppliers}
      />
    </div>
  );
};

export default BillsPage;
