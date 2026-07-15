import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { DEFAULT_ALLOWANCES, DEFAULT_DEDUCTIONS, calculatePayroll, formatKES } from "@/lib/payroll/kenya";
import type { StaffSalary } from "@/context/PayrollContext";

interface Props {
  value: StaffSalary;
  onChange: (v: StaffSalary) => void;
}

const StaffSalaryForm = ({ value, onChange }: Props) => {
  const toggleAllowance = (id: number, checked: boolean) => {
    const next = { ...value.allowances };
    if (checked) next[id] = DEFAULT_ALLOWANCES.find((a) => a.id === id)?.defaultValue ?? 0;
    else delete next[id];
    onChange({ ...value, allowances: next });
  };
  const setAllowanceAmount = (id: number, amt: number) =>
    onChange({ ...value, allowances: { ...value.allowances, [id]: amt } });

  const toggleDeduction = (id: number, checked: boolean) => {
    const next = { ...value.deductions };
    if (checked) next[id] = DEFAULT_DEDUCTIONS.find((d) => d.id === id)?.defaultValue ?? 0;
    else delete next[id];
    onChange({ ...value, deductions: next });
  };
  const setDeductionAmount = (id: number, amt: number) =>
    onChange({ ...value, deductions: { ...value.deductions, [id]: amt } });

  const taxable = DEFAULT_ALLOWANCES.filter((a) => a.taxable && value.allowances[a.id]).reduce((s, a) => s + (value.allowances[a.id] || 0), 0);
  const nonTaxable = DEFAULT_ALLOWANCES.filter((a) => !a.taxable && value.allowances[a.id]).reduce((s, a) => s + (value.allowances[a.id] || 0), 0);
  const other = Object.values(value.deductions).reduce((s, v) => s + (v || 0), 0);
  const result = calculatePayroll(value.basic || 0, taxable, nonTaxable, other);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Basic Salary (KES) <span className="text-destructive">*</span></Label>
        <Input
          type="number"
          value={value.basic || ""}
          onChange={(e) => onChange({ ...value, basic: Number(e.target.value) })}
          placeholder="e.g. 55000"
        />
      </div>

      <div className="space-y-2">
        <Label>Allowances</Label>
        <div className="space-y-2 border rounded-md p-3">
          {DEFAULT_ALLOWANCES.map((a) => {
            const enabled = a.id in value.allowances;
            return (
              <div key={a.id} className="flex items-center gap-3">
                <Checkbox checked={enabled} onCheckedChange={(c) => toggleAllowance(a.id, !!c)} />
                <div className="flex-1 text-sm">
                  {a.name}
                  <span className="ml-2 text-[10px] text-muted-foreground">{a.taxable ? "Taxable" : "Non-taxable"}</span>
                </div>
                <Input
                  type="number"
                  disabled={!enabled}
                  className="w-32 h-8 text-sm"
                  value={enabled ? value.allowances[a.id] : ""}
                  onChange={(e) => setAllowanceAmount(a.id, Number(e.target.value))}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Other Deductions</Label>
        <div className="space-y-2 border rounded-md p-3">
          {DEFAULT_DEDUCTIONS.map((d) => {
            const enabled = d.id in value.deductions;
            return (
              <div key={d.id} className="flex items-center gap-3">
                <Checkbox checked={enabled} onCheckedChange={(c) => toggleDeduction(d.id, !!c)} />
                <div className="flex-1 text-sm">{d.name}</div>
                <Input
                  type="number"
                  disabled={!enabled}
                  className="w-32 h-8 text-sm"
                  value={enabled ? value.deductions[d.id] : ""}
                  onChange={(e) => setDeductionAmount(d.id, Number(e.target.value))}
                />
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground">Statutory deductions (NSSF, NHIF/SHIF, Housing Levy, PAYE) are auto-applied using Kenya rates from Payroll Setup.</p>
      </div>

      <Card className="bg-muted/30">
        <CardContent className="pt-4 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Gross Pay</span><span className="font-semibold">{formatKES(result.gross)}</span></div>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">NSSF</span><span>{formatKES(result.nssf)}</span></div>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">NHIF / SHIF</span><span>{formatKES(result.nhif)}</span></div>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Housing Levy</span><span>{formatKES(result.housingLevy)}</span></div>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">PAYE (after relief)</span><span>{formatKES(result.paye)}</span></div>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Other Deductions</span><span>{formatKES(result.otherDeductions)}</span></div>
          <div className="flex justify-between pt-2 border-t mt-2"><span className="font-medium">Net Pay</span><span className="font-bold text-primary">{formatKES(result.net)}</span></div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffSalaryForm;