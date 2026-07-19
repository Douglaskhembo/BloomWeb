import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Download, Send, Calculator, TrendingUp, Settings2, Search, FileText, FileSpreadsheet, FileType } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import StatCard from "@/components/dashboard/StatCard";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { StaffApi } from "@/services/api";
import { usePayroll, StaffSalary } from "@/context/PayrollContext";
import { DEFAULT_ALLOWANCES, calculatePayroll, formatKES, PayrollConfig } from "@/lib/payroll/kenya";
import { loadPayrollConfig } from "@/lib/payroll/loadConfig";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

const computeLine = (s: StaffSalary, config?: Partial<PayrollConfig>) => {
  const taxable = DEFAULT_ALLOWANCES.filter((a) => a.taxable && s.allowances[a.id]).reduce((sum, a) => sum + (s.allowances[a.id] || 0), 0);
  const nonTaxable = DEFAULT_ALLOWANCES.filter((a) => !a.taxable && s.allowances[a.id]).reduce((sum, a) => sum + (s.allowances[a.id] || 0), 0);
  const other = Object.values(s.deductions).reduce((sum, v) => sum + (v || 0), 0);
  return calculatePayroll(s.basic || 0, taxable, nonTaxable, other, config);
};

const PayrollPage = () => {
  const { toast } = useToast();
  const { getSalary, salaries, payrollHistory, addPayrollRun } = usePayroll();
  const [paid, setPaid] = useState<Record<string, boolean>>({});
  const [selectedRunId, setSelectedRunId] = useState<string | "current">("current");
  const [search, setSearch] = useState("");
  const [initialStaff, setInitialStaff] = useState<any[]>([]);
  const [payrollConfig, setPayrollConfig] = useState<Partial<PayrollConfig>>({});

  useEffect(() => {
    StaffApi.getAll().then((data) => {
      const list = Array.isArray(data) ? data : [];
      setInitialStaff(list.map((s: any) => ({
        uuid: s.uuid,
        firstName: s.firstName,
        lastName: s.lastName,
        staffType: s.staffType,
        status: s.status,
      })));
    }).catch(() => setInitialStaff([]));
    loadPayrollConfig().then(setPayrollConfig).catch(() => setPayrollConfig({}));
  }, []);

  const rows = useMemo(
    () =>
      initialStaff
        .filter((s) => s.status !== "Resigned")
        .map((s) => {
          const sal = getSalary(s.uuid);
          return { staff: s, sal, line: computeLine(sal, payrollConfig) };
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [salaries, initialStaff, payrollConfig],
  );

  const currentTotals = rows.reduce(
    (acc, r) => {
      acc.gross += r.line.gross;
      acc.net += r.line.net;
      acc.deductions += r.line.totalDeductions;
      return acc;
    },
    { gross: 0, net: 0, deductions: 0 },
  );
  const configuredCount = rows.filter((r) => r.sal.basic > 0).length;
  const paidCount = rows.filter((r) => paid[r.staff.uuid]).length;

  const now = new Date();
  const currentMonthLabel = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;

  const runPayroll = () => {
    const nextPaid: Record<string, boolean> = {};
    const lines: Record<string, ReturnType<typeof computeLine>> = {};
    rows.forEach((r) => {
      if (r.sal.basic > 0) {
        nextPaid[r.staff.uuid] = true;
        lines[r.staff.uuid] = r.line;
      }
    });
    setPaid(nextPaid);

    const run = {
      id: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${Date.now()}`,
      monthLabel: currentMonthLabel,
      year: now.getFullYear(),
      monthIndex: now.getMonth(),
      processedAt: new Date().toISOString(),
      lines,
      paidStaff: Object.keys(nextPaid),
    };
    addPayrollRun(run);

    toast({ title: "Payroll processed", description: `${Object.keys(nextPaid).length} payslips generated for ${currentMonthLabel}.` });
  };

  const activeRun = selectedRunId === "current" ? null : payrollHistory.find((r) => r.id === selectedRunId);

  const displayRows = useMemo(() => {
    if (!activeRun) return rows.map((r) => ({ ...r, isPaid: paid[r.staff.uuid] || false }));
    return initialStaff
      .filter((s) => s.status !== "Resigned")
      .map((s) => ({
        staff: s,
        sal: getSalary(s.uuid),
        line: activeRun.lines[s.uuid] || computeLine(getSalary(s.uuid), payrollConfig),
        isPaid: activeRun.paidStaff.includes(s.uuid),
      }));
  }, [activeRun, rows, paid, getSalary, initialStaff, payrollConfig]);

  const displayTotals = displayRows.reduce(
    (acc, r) => {
      acc.gross += r.line.gross;
      acc.net += r.line.net;
      acc.deductions += r.line.totalDeductions;
      return acc;
    },
    { gross: 0, net: 0, deductions: 0 },
  );
  const displayPaidCount = displayRows.filter((r) => r.isPaid).length;
  const displayConfiguredCount = displayRows.filter((r) => r.sal.basic > 0).length;

  const q = search.trim().toLowerCase();
  const filteredRows = q
    ? displayRows.filter(({ staff }) => {
        const hay = `${staff.uuid} ${staff.firstName} ${staff.lastName} ${(staff as any).email ?? ""} ${(staff as any).role ?? ""} ${(staff as any).department ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
    : displayRows;

  const monthLabel = activeRun ? activeRun.monthLabel : currentMonthLabel;

  const buildExportRows = () =>
    filteredRows
      .filter((r) => r.sal.basic > 0)
      .map(({ staff, line, isPaid }) => ({
        ID: staff.uuid,
        Name: `${staff.firstName} ${staff.lastName}`,
        Basic: line.basic,
        Allowances: line.taxableAllowances + line.nonTaxableAllowances,
        Gross: line.gross,
        PAYE: line.paye,
        NSSF: line.nssf,
        SHIF: line.nhif,
        Housing: line.housingLevy,
        Other: line.otherDeductions,
        "Net Pay": line.net,
        Status: isPaid ? "Paid" : "Pending",
      }));

  const exportCSV = () => {
    const data = buildExportRows();
    if (!data.length) return toast({ title: "Nothing to export" });
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(","),
      ...data.map((row) => headers.map((h) => JSON.stringify((row as any)[h] ?? "")).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Payroll-${monthLabel.replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exported" });
  };

  const exportExcel = () => {
    const data = buildExportRows();
    if (!data.length) return toast({ title: "Nothing to export" });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payroll");
    XLSX.writeFile(wb, `Payroll-${monthLabel.replace(/\s+/g, "-")}.xlsx`);
    toast({ title: "Excel exported" });
  };

  const exportPDF = () => {
    const data = buildExportRows();
    if (!data.length) return toast({ title: "Nothing to export" });
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(`Payroll — ${monthLabel}`, 14, 14);
    const headers = Object.keys(data[0]);
    autoTable(doc, {
      startY: 20,
      head: [headers],
      body: data.map((r) => headers.map((h) => (r as any)[h])),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 41, 59] },
    });
    doc.save(`Payroll-${monthLabel.replace(/\s+/g, "-")}.pdf`);
    toast({ title: "PDF exported" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payroll</h1>
          <p className="text-muted-foreground">Computes from Staff Salaries + Kenya statutory rules (PAYE, NSSF, SHIF, Housing Levy)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/staff-salaries"><Settings2 className="w-4 h-4 mr-1" /> Staff Salaries</Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" /> Export</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportPDF}><FileText className="w-4 h-4 mr-2" /> Export as PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={exportExcel}><FileSpreadsheet className="w-4 h-4 mr-2" /> Export as Excel</DropdownMenuItem>
              <DropdownMenuItem onClick={exportCSV}><FileType className="w-4 h-4 mr-2" /> Export as CSV</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" onClick={runPayroll}><Send className="w-4 h-4 mr-1" /> Process Payroll</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Gross" value={formatKES(displayTotals.gross)} icon={DollarSign} iconColor="bg-primary/10 text-primary" />
        <StatCard title="Total Net Pay" value={formatKES(displayTotals.net)} icon={TrendingUp} iconColor="bg-success/10 text-success" />
        <StatCard title="Total Deductions" value={formatKES(displayTotals.deductions)} icon={Calculator} iconColor="bg-destructive/10 text-destructive" />
        <StatCard title="Staff Paid" value={`${displayPaidCount} / ${displayConfiguredCount}`} icon={Send} iconColor="bg-info/10 text-info" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-lg">
                {activeRun ? `${activeRun.monthLabel} Payroll` : `${currentMonthLabel} Payroll`}
              </CardTitle>
              <CardDescription>Net pay = Gross − (PAYE + NSSF + SHIF + Housing Levy + Other Deductions)</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search staff by name, ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 w-[240px]"
                />
              </div>
              <span className="text-sm text-muted-foreground">Payroll month:</span>
              <Select value={selectedRunId} onValueChange={(v) => setSelectedRunId(v)}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">{currentMonthLabel} (Current)</SelectItem>
                  {payrollHistory.map((run) => (
                    <SelectItem key={run.id} value={run.id}>{run.monthLabel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Basic</TableHead>
                <TableHead className="text-right">Allow.</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">PAYE</TableHead>
                <TableHead className="text-right">NSSF</TableHead>
                <TableHead className="text-right">SHIF</TableHead>
                <TableHead className="text-right">Housing</TableHead>
                <TableHead className="text-right">Other</TableHead>
                <TableHead className="text-right">Net Pay</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} className="text-center text-sm text-muted-foreground py-8">
                    No staff match "{search}"
                  </TableCell>
                </TableRow>
              )}
              {filteredRows.map(({ staff, sal, line, isPaid }) => {
                const allow = line.taxableAllowances + line.nonTaxableAllowances;
                if (sal.basic === 0) {
                  return (
                    <TableRow key={staff.uuid} className="opacity-60">
                      <TableCell className="font-mono text-xs">{staff.uuid}</TableCell>
                      <TableCell className="font-medium">{staff.firstName} {staff.lastName}</TableCell>
                      <TableCell colSpan={9} className="text-center text-xs text-muted-foreground italic">
                        No salary configured — <Link to="/admin/staff-salaries" className="text-primary underline">set it up</Link>
                      </TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px]">Not set</Badge></TableCell>
                    </TableRow>
                  );
                }
                return (
                  <TableRow key={staff.uuid}>
                    <TableCell className="font-mono text-xs">{staff.uuid}</TableCell>
                    <TableCell className="font-medium">{staff.firstName} {staff.lastName}</TableCell>
                    <TableCell className="text-right">{line.basic.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-success">{allow.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{line.gross.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-destructive">{line.paye.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-destructive">{line.nssf.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-destructive">{line.nhif.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-destructive">{line.housingLevy.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-destructive">{line.otherDeductions.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-semibold">{line.net.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={isPaid ? "default" : "secondary"} className="text-[10px]">{isPaid ? "Paid" : "Pending"}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayrollPage;