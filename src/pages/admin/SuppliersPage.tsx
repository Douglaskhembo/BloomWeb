import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Filter, Store, Truck, Package, Star } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import { useToast } from "@/hooks/use-toast";
import SupplierFormModal from "@/components/modal/SupplierFormModal";
import { SupplierFormValues } from "@/components/forms/SupplierForm";

const initialSuppliers = [
  { id: "SUP-001", name: "Nairobi Book Suppliers", category: "Textbooks", contact: "+254 700 100 200", email: "info@nbs.co.ke", rating: 4.5, status: "Active" },
  { id: "SUP-002", name: "Kenya Stationery Ltd", category: "Stationery", contact: "+254 711 200 300", email: "sales@ksl.co.ke", rating: 4.2, status: "Active" },
  { id: "SUP-003", name: "CleanPro Services", category: "Cleaning", contact: "+254 722 300 400", email: "hello@cleanpro.ke", rating: 3.8, status: "Active" },
  { id: "SUP-004", name: "FoodMaster Catering", category: "Food & Catering", contact: "+254 733 400 500", email: "orders@foodmaster.co.ke", rating: 4.0, status: "Active" },
  { id: "SUP-005", name: "TechEd Solutions", category: "IT Equipment", contact: "+254 744 500 600", email: "support@teched.co.ke", rating: 4.7, status: "Active" },
  { id: "SUP-006", name: "Safaricom Business", category: "Telecom", contact: "+254 755 600 700", email: "business@safaricom.co.ke", rating: 4.8, status: "Active" },
  { id: "SUP-007", name: "ABC Uniforms", category: "Uniforms", contact: "+254 766 700 800", email: "info@abcuniforms.co.ke", rating: 3.5, status: "Inactive" },
];

const emptyForm: SupplierFormValues = { name: "", category: "", contact: "", email: "", status: "Active" };

const SuppliersPage = () => {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SupplierFormValues>(emptyForm);

  const openAdd = () => { setForm(emptyForm); setOpen(true); };
  const handleSubmit = () => {
    const nextNum = suppliers.length + 1;
    const id = `SUP-${String(nextNum).padStart(3, "0")}`;
    setSuppliers((p) => [...p, { id, ...form, rating: 0 }]);
    toast({ title: "Supplier added" });
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground">Manage vendors and supplier relationships</p>
        </div>
        <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> Add Supplier</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Suppliers" value={7} icon={Store} iconColor="bg-primary/10 text-primary" />
        <StatCard title="Active" value={6} icon={Truck} iconColor="bg-success/10 text-success" />
        <StatCard title="Categories" value={7} icon={Package} iconColor="bg-info/10 text-info" />
        <StatCard title="Avg Rating" value="4.2" icon={Star} iconColor="bg-warning/10 text-warning" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search suppliers..." className="pl-10" />
            </div>
            <Button variant="outline" size="sm"><Filter className="w-4 h-4 mr-1" /> Filters</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Supplier Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((s) => (
                <TableRow key={s.id} className="cursor-pointer">
                  <TableCell className="font-mono text-xs">{s.id}</TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{s.category}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{s.contact}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{s.email}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-warning text-warning" />
                      <span className="text-xs font-medium">{s.rating}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.status === "Active" ? "default" : "secondary"} className="text-[10px]">{s.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <SupplierFormModal
        open={open}
        onOpenChange={setOpen}
        isEditing={false}
        value={form}
        onChange={setForm}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default SuppliersPage;
