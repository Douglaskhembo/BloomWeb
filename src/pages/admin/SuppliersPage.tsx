import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Store, Truck, Package, Pencil, Trash2 } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import { useToast } from "@/hooks/use-toast";
import SupplierFormModal from "@/components/modal/SupplierFormModal";
import { SupplierFormValues } from "@/components/forms/SupplierForm";
import { SupplierApi } from "@/services/api";
import { getBackendErrorMessage } from "@/utils/errorHandler";

interface Supplier {
  id: number;
  name: string;
  category: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  kraPin: string;
  status: "Active" | "Inactive";
}

const toSupplier = (raw: any): Supplier => ({
  id: raw.id,
  name: raw.name ?? "",
  category: raw.category ?? "",
  contactPerson: raw.contactPerson ?? "",
  phone: raw.phone ?? "",
  email: raw.email ?? "",
  address: raw.address ?? "",
  kraPin: raw.kraPin ?? "",
  status: String(raw.status).toUpperCase() === "ACTIVE" ? "Active" : "Inactive",
});

const emptyForm: SupplierFormValues = {
  name: "", category: "", contactPerson: "", phone: "", email: "", address: "", kraPin: "", status: "Active",
};

const SuppliersPage = () => {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<SupplierFormValues>(emptyForm);

  const load = (q?: string) => {
    setLoading(true);
    SupplierApi.getAll(q)
      .then((data) => setSuppliers(data.map(toSupplier)))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search || undefined), 300);
    return () => clearTimeout(t);
  }, [search]);

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (s: Supplier) => {
    setEditingId(s.id);
    setForm({
      name: s.name, category: s.category, contactPerson: s.contactPerson,
      phone: s.phone, email: s.email, address: s.address, kraPin: s.kraPin, status: s.status,
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    const payload = {
      name: form.name,
      category: form.category,
      contactPerson: form.contactPerson,
      phone: form.phone,
      email: form.email,
      address: form.address,
      kraPin: form.kraPin,
      status: form.status === "Active" ? "ACTIVE" : "INACTIVE",
    };
    try {
      if (editingId !== null) {
        await SupplierApi.update(editingId, payload);
        toast({ title: "Supplier updated" });
      } else {
        await SupplierApi.create(payload);
        toast({ title: "Supplier added" });
      }
      setOpen(false);
      load(search || undefined);
    } catch (err) {
      toast({ title: "Failed to save supplier", description: getBackendErrorMessage(err), variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await SupplierApi.delete(id);
      toast({ title: "Supplier removed" });
      load(search || undefined);
    } catch (err) {
      toast({ title: "Failed to delete supplier", description: getBackendErrorMessage(err), variant: "destructive" });
    }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      await SupplierApi.toggleStatus(id);
      load(search || undefined);
    } catch (err) {
      toast({ title: "Failed to update status", description: getBackendErrorMessage(err), variant: "destructive" });
    }
  };

  const stats = useMemo(() => {
    const total = suppliers.length;
    const active = suppliers.filter((s) => s.status === "Active").length;
    const categories = new Set(suppliers.map((s) => s.category).filter(Boolean)).size;
    return { total, active, categories };
  }, [suppliers]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground">Manage vendors and supplier relationships</p>
        </div>
        <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> Add Supplier</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Suppliers" value={stats.total} icon={Store} iconColor="bg-primary/10 text-primary" />
        <StatCard title="Active" value={stats.active} icon={Truck} iconColor="bg-success/10 text-success" />
        <StatCard title="Categories" value={stats.categories} icon={Package} iconColor="bg-info/10 text-info" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search suppliers..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading suppliers...</p>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">No suppliers found.</TableCell></TableRow>
              ) : suppliers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{s.category}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{s.contactPerson}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{s.phone}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{s.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant={s.status === "Active" ? "default" : "secondary"}
                      className="text-[10px] cursor-pointer"
                      onClick={() => handleToggleStatus(s.id)}
                    >
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(s.id)}>
                        <Trash2 className="w-4 h-4" />
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

      <SupplierFormModal
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

export default SuppliersPage;
