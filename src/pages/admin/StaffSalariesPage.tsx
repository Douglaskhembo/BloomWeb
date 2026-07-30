import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Pencil, Wallet } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import Swal from "sweetalert2";
import { StaffApi } from "@/services/api";
import { usePayroll, StaffSalary } from "@/context/PayrollContext";
import { getStaffIdentifier } from "@/utils/staff";
import { DEFAULT_ALLOWANCES, calculatePayroll, formatKES, PayrollConfig } from "@/lib/payroll/kenya";
import { loadPayrollConfig } from "@/lib/payroll/loadConfig";
import StaffSalaryModal from "@/components/modal/StaffSalaryModal";
import PayrollNavTabs from "@/components/payroll/PayrollNavTabs";
import Pagination from "@/utils/Pagination";

const computeFor = (s: StaffSalary, config?: Partial<PayrollConfig>) => {
  const taxable = DEFAULT_ALLOWANCES.filter((a) => a.taxable && s.allowances[a.id]).reduce((sum, a) => sum + (s.allowances[a.id] || 0), 0);
  const nonTaxable = DEFAULT_ALLOWANCES.filter((a) => !a.taxable && s.allowances[a.id]).reduce((sum, a) => sum + (s.allowances[a.id] || 0), 0);
  const other = Object.values(s.deductions).reduce((sum, v) => sum + (v || 0), 0);
  return calculatePayroll(s.basic || 0, taxable, nonTaxable, other, config);
};

const StaffSalariesPage = () => {
  const { getSalary, setSalary } = usePayroll();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StaffSalary>({ basic: 0, allowances: {}, deductions: {} });
  const [initialStaff, setInitialStaff] = useState<any[]>([]);
  const [payrollConfig, setPayrollConfig] = useState<Partial<PayrollConfig>>({});
  const [staffPage, setStaffPage] = useState(1);
  const [staffPerPage, setStaffPerPage] = useState(10);

  useEffect(() => {
    StaffApi.getAll().then((data) => {
      const list = Array.isArray(data) ? data : [];
      setInitialStaff(list.map((s: any) => ({
        uuid: s.uuid,
        firstName: s.firstName,
        lastName: s.lastName,
        staffType: s.staffType,
        status: s.status,
        idNumber: s.idNumber,
        passportNumber: s.passportNumber,
        staffId: s.staffId,
      })));
    }).catch(() => setInitialStaff([]));
    loadPayrollConfig().then(setPayrollConfig).catch(() => setPayrollConfig({}));
  }, []);

  const staff = initialStaff.filter((s) =>
    `${s.firstName} ${s.lastName} ${getStaffIdentifier(s)}`.toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (id: string) => {
    setEditingId(id);
    setForm(getSalary(id));
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!editingId) return;
    setSalary(editingId, form);
    Swal.fire({ title: "Salary saved", icon: "success", showConfirmButton: true });
    setOpen(false);
  };

  const totals = initialStaff.reduce(
    (acc, s) => {
      const r = computeFor(getSalary(s.uuid), payrollConfig);
      acc.gross += r.gross;
      acc.net += r.net;
      acc.tax += r.paye + r.nssf + r.nhif + r.housingLevy;
      acc.configured += getSalary(s.uuid).basic > 0 ? 1 : 0;
      return acc;
    },
    { gross: 0, net: 0, tax: 0, configured: 0 },
  );

  const editingStaff = initialStaff.find((s) => s.uuid === editingId);

  const totalStaffPages = Math.ceil(staff.length / staffPerPage);
  const pagedStaff = staff.slice((staffPage - 1) * staffPerPage, staffPage * staffPerPage);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff Salaries</h1>
          <p className="text-muted-foreground">Configure basic pay, allowances and deductions per staff member</p>
        </div>
        <PayrollNavTabs />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Configured" value={`${totals.configured} / ${initialStaff.length}`} icon={Wallet} iconColor="bg-primary/10 text-primary" />
        <StatCard title="Monthly Gross" value={formatKES(totals.gross)} icon={Wallet} iconColor="bg-info/10 text-info" />
        <StatCard title="Monthly Net" value={formatKES(totals.net)} icon={Wallet} iconColor="bg-success/10 text-success" />
        <StatCard title="Statutory + PAYE" value={formatKES(totals.tax)} icon={Wallet} iconColor="bg-destructive/10 text-destructive" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">All Staff</CardTitle>
              <CardDescription>Click edit to update a staff member's salary configuration</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search staff..." className="pl-10" value={search} onChange={(e) => { setSearch(e.target.value); setStaffPage(1); }} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Basic</TableHead>
                <TableHead className="text-right">Allowances</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Net Pay</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedStaff.map((s) => {
                const sal = getSalary(s.uuid);
                const result = computeFor(sal, payrollConfig);
                const allowanceTotal = Object.values(sal.allowances).reduce((sum, v) => sum + (v || 0), 0);
                const configured = sal.basic > 0;
                return (
                  <TableRow key={s.uuid}>
                    <TableCell className="font-mono text-xs">{getStaffIdentifier(s)}</TableCell>
                    <TableCell className="font-medium">{s.firstName} {s.lastName}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{s.staffType}</Badge></TableCell>
                    <TableCell className="text-right">{configured ? formatKES(sal.basic) : <span className="text-xs text-muted-foreground">Not set</span>}</TableCell>
                    <TableCell className="text-right text-success">{allowanceTotal ? formatKES(allowanceTotal) : "—"}</TableCell>
                    <TableCell className="text-right">{configured ? formatKES(result.gross) : "—"}</TableCell>
                    <TableCell className="text-right font-semibold">{configured ? formatKES(result.net) : "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(s.uuid)}>
                        <Pencil className="w-3.5 h-3.5 mr-1" /> {configured ? "Edit" : "Set Salary"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Pagination currentPage={staffPage} totalPages={totalStaffPages} onPageChange={setStaffPage}
            itemsPerPage={staffPerPage} onItemsPerPageChange={v => { setStaffPerPage(v); setStaffPage(1); }} />
        </CardContent>
      </Card>

      <StaffSalaryModal
        open={open}
        onOpenChange={setOpen}
        staffName={editingStaff ? `${editingStaff.firstName} ${editingStaff.lastName}` : ""}
        value={form}
        onChange={setForm}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default StaffSalariesPage;