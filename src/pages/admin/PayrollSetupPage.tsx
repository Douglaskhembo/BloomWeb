import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { TaxBracket, StatutoryDeduction, NHIFTier, AllowanceType, OtherDeduction } from "@/types/payroll";
import PayeBandModal from "@/components/modal/PayeBandModal";
import StatutoryDeductionModal from "@/components/modal/StatutoryDeductionModal";
import NhifTierModal from "@/components/modal/NhifTierModal";
import AllowanceTypeModal from "@/components/modal/AllowanceTypeModal";
import OtherDeductionModal from "@/components/modal/OtherDeductionModal";
import { PayrollApi } from "@/services/api";
import { getBackendErrorMessage } from "@/utils/errorHandler";

interface PayrollSettings {
  personalRelief: number;
  insuranceRelief: number;
  payDay: number;
  paymentMethod: string;
  currency: string;
}

const emptySettings: PayrollSettings = {
  personalRelief: 0,
  insuranceRelief: 0,
  payDay: 28,
  paymentMethod: "bank_transfer",
  currency: "KES",
};

const VALUE_TYPE_FROM_BACKEND: Record<string, "fixed" | "percentage" | "tiered"> = { FIXED: "fixed", PERCENTAGE: "percentage", TIERED: "tiered" };
const VALUE_TYPE_TO_BACKEND: Record<string, string> = { fixed: "FIXED", percentage: "PERCENTAGE", tiered: "TIERED" };
const CATEGORY_FROM_BACKEND: Record<string, "nssf" | "housing_levy" | "other"> = { NSSF: "nssf", HOUSING_LEVY: "housing_levy", OTHER: "other" };
const CATEGORY_TO_BACKEND: Record<string, string> = { nssf: "NSSF", housing_levy: "HOUSING_LEVY", other: "OTHER" };

const toTaxBracket = (raw: any): TaxBracket => ({ id: raw.id, minAmount: raw.minAmount, maxAmount: raw.maxAmount ?? null, rate: raw.rate });
const toNhifTier = (raw: any): NHIFTier => ({ id: raw.id, minSalary: raw.minSalary, maxSalary: raw.maxSalary ?? null, amount: raw.amount });
const toStatutoryDeduction = (raw: any): StatutoryDeduction => ({
  id: raw.id, name: raw.name, type: VALUE_TYPE_FROM_BACKEND[raw.type] ?? "percentage", category: CATEGORY_FROM_BACKEND[raw.category] ?? "other",
  value: raw.value, maxAmount: raw.maxAmount ?? null, employerContribution: raw.employerContribution, employerValue: raw.employerValue, active: raw.active,
});
const toAllowanceType = (raw: any): AllowanceType => ({
  id: raw.id, name: raw.name, type: (VALUE_TYPE_FROM_BACKEND[raw.type] as "fixed" | "percentage") ?? "fixed", defaultValue: raw.defaultValue, taxable: raw.taxable, active: raw.active,
});
const toOtherDeduction = (raw: any): OtherDeduction => ({
  id: raw.id, name: raw.name, type: (VALUE_TYPE_FROM_BACKEND[raw.type] as "fixed" | "percentage") ?? "fixed", defaultValue: raw.defaultValue, mandatory: raw.mandatory, active: raw.active,
});
const toSettings = (raw: any): PayrollSettings => ({
  personalRelief: raw.personalRelief, insuranceRelief: raw.insuranceRelief, payDay: raw.payDay,
  paymentMethod: raw.paymentMethod ?? "bank_transfer", currency: raw.currency ?? "KES",
});

const formatAmount = (n: number | null) => (n === null ? "No limit" : `KES ${n.toLocaleString()}`);

const PayrollSetupPage = () => {
  const navigate = useNavigate();
  const [taxBrackets, setTaxBrackets] = useState<TaxBracket[]>([]);
  const [statutory, setStatutory] = useState<StatutoryDeduction[]>([]);
  const [nhifTiers, setNhifTiers] = useState<NHIFTier[]>([]);
  const [allowances, setAllowances] = useState<AllowanceType[]>([]);
  const [otherDeductions, setOtherDeductions] = useState<OtherDeduction[]>([]);
  const [settings, setSettings] = useState<PayrollSettings>(emptySettings);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [bands, tiers, statutoryDeductions, allowanceTypes, deductions, rawSettings] = await Promise.all([
        PayrollApi.getPayeBands(),
        PayrollApi.getNhifTiers(),
        PayrollApi.getStatutoryDeductions(),
        PayrollApi.getAllowanceTypes(),
        PayrollApi.getOtherDeductions(),
        PayrollApi.getSettings(),
      ]);
      setTaxBrackets(bands.map(toTaxBracket));
      setNhifTiers(tiers.map(toNhifTier));
      setStatutory(statutoryDeductions.map(toStatutoryDeduction));
      setAllowances(allowanceTypes.map(toAllowanceType));
      setOtherDeductions(deductions.map(toOtherDeduction));
      if (rawSettings) setSettings(toSettings(rawSettings));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  // Modal state
  const [bandOpen, setBandOpen] = useState(false);
  const [editingBand, setEditingBand] = useState<TaxBracket | null>(null);
  const [statOpen, setStatOpen] = useState(false);
  const [editingStat, setEditingStat] = useState<StatutoryDeduction | null>(null);
  const [nhifOpen, setNhifOpen] = useState(false);
  const [editingNhif, setEditingNhif] = useState<NHIFTier | null>(null);
  const [alOpen, setAlOpen] = useState(false);
  const [editingAl, setEditingAl] = useState<AllowanceType | null>(null);
  const [dedOpen, setDedOpen] = useState(false);
  const [editingDed, setEditingDed] = useState<OtherDeduction | null>(null);

  const lastBandMax = taxBrackets.reduce((m, b) => (b.maxAmount && b.maxAmount > m ? b.maxAmount : m), 0);
  const lastNhifMax = nhifTiers.reduce((m, t) => (t.maxSalary && t.maxSalary > m ? t.maxSalary : m), 0);

  const saveBand = async (data: Omit<TaxBracket, "id">) => {
    try {
      const payload = { minAmount: data.minAmount, maxAmount: data.maxAmount, rate: data.rate, displayOrder: Math.round(data.minAmount) };
      if (editingBand) {
        await PayrollApi.updatePayeBand(editingBand.id, payload);
        toast.success("Band updated");
      } else {
        await PayrollApi.createPayeBand(payload);
        toast.success("Band added");
      }
      setBandOpen(false);
      load();
    } catch (err) {
      toast.error(getBackendErrorMessage(err, "Failed to save PAYE band"));
    }
  };

  const deleteBand = async (id: number) => {
    try {
      await PayrollApi.deletePayeBand(id);
      toast.success("Band removed");
      load();
    } catch (err) {
      toast.error(getBackendErrorMessage(err, "Failed to delete PAYE band"));
    }
  };

  const saveNhifTier = async (data: Omit<NHIFTier, "id">) => {
    try {
      const payload = { minSalary: data.minSalary, maxSalary: data.maxSalary, amount: data.amount, displayOrder: Math.round(data.minSalary) };
      if (editingNhif) {
        await PayrollApi.updateNhifTier(editingNhif.id, payload);
        toast.success("Tier updated");
      } else {
        await PayrollApi.createNhifTier(payload);
        toast.success("Tier added");
      }
      setNhifOpen(false);
      load();
    } catch (err) {
      toast.error(getBackendErrorMessage(err, "Failed to save NHIF tier"));
    }
  };

  const deleteNhifTier = async (id: number) => {
    try {
      await PayrollApi.deleteNhifTier(id);
      toast.success("Tier removed");
      load();
    } catch (err) {
      toast.error(getBackendErrorMessage(err, "Failed to delete NHIF tier"));
    }
  };

  const saveAllowance = async (data: Omit<AllowanceType, "id" | "active">) => {
    try {
      const payload = { name: data.name, type: VALUE_TYPE_TO_BACKEND[data.type], defaultValue: data.defaultValue, taxable: data.taxable };
      if (editingAl) {
        await PayrollApi.updateAllowanceType(editingAl.id, payload);
        toast.success("Allowance updated");
      } else {
        await PayrollApi.createAllowanceType(payload);
        toast.success("Allowance added");
      }
      setAlOpen(false);
      load();
    } catch (err) {
      toast.error(getBackendErrorMessage(err, "Failed to save allowance"));
    }
  };

  const toggleAllowance = async (id: number) => {
    try {
      await PayrollApi.toggleAllowanceType(id);
      load();
    } catch (err) {
      toast.error(getBackendErrorMessage(err, "Failed to update allowance"));
    }
  };

  const deleteAllowance = async (id: number) => {
    try {
      await PayrollApi.deleteAllowanceType(id);
      toast.success("Deleted");
      load();
    } catch (err) {
      toast.error(getBackendErrorMessage(err, "Failed to delete allowance"));
    }
  };

  const saveDeduction = async (data: Omit<OtherDeduction, "id" | "active">) => {
    try {
      const payload = { name: data.name, type: VALUE_TYPE_TO_BACKEND[data.type], defaultValue: data.defaultValue, mandatory: data.mandatory };
      if (editingDed) {
        await PayrollApi.updateOtherDeduction(editingDed.id, payload);
        toast.success("Deduction updated");
      } else {
        await PayrollApi.createOtherDeduction(payload);
        toast.success("Deduction added");
      }
      setDedOpen(false);
      load();
    } catch (err) {
      toast.error(getBackendErrorMessage(err, "Failed to save deduction"));
    }
  };

  const toggleDeduction = async (id: number) => {
    try {
      await PayrollApi.toggleOtherDeduction(id);
      load();
    } catch (err) {
      toast.error(getBackendErrorMessage(err, "Failed to update deduction"));
    }
  };

  const deleteDeduction = async (id: number) => {
    try {
      await PayrollApi.deleteOtherDeduction(id);
      toast.success("Deleted");
      load();
    } catch (err) {
      toast.error(getBackendErrorMessage(err, "Failed to delete deduction"));
    }
  };

  const saveStatutory = async (data: Omit<StatutoryDeduction, "id" | "active">) => {
    try {
      const payload = {
        name: data.name, type: VALUE_TYPE_TO_BACKEND[data.type], category: CATEGORY_TO_BACKEND[data.category],
        value: data.value, maxAmount: data.maxAmount, employerContribution: data.employerContribution, employerValue: data.employerValue,
      };
      if (editingStat) {
        await PayrollApi.updateStatutoryDeduction(editingStat.id, payload);
        toast.success("Deduction updated");
      } else {
        await PayrollApi.createStatutoryDeduction(payload);
        toast.success("Deduction added");
      }
      setStatOpen(false);
      load();
    } catch (err) {
      toast.error(getBackendErrorMessage(err, "Failed to save statutory deduction"));
    }
  };

  const toggleStatutory = async (id: number) => {
    try {
      await PayrollApi.toggleStatutoryDeduction(id);
      load();
    } catch (err) {
      toast.error(getBackendErrorMessage(err, "Failed to update statutory deduction"));
    }
  };

  const deleteStatutory = async (id: number) => {
    try {
      await PayrollApi.deleteStatutoryDeduction(id);
      toast.success("Deleted");
      load();
    } catch (err) {
      toast.error(getBackendErrorMessage(err, "Failed to delete statutory deduction"));
    }
  };

  const saveSettings = async () => {
    try {
      await PayrollApi.saveSettings(settings);
      toast.success("Payroll settings saved");
      load();
    } catch (err) {
      toast.error(getBackendErrorMessage(err, "Failed to save settings"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/management")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Payroll Setup</h1>
            <p className="text-muted-foreground">Configure tax rates, deductions, allowances and payroll parameters</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="tax">
        <TabsList>
          <TabsTrigger value="tax">Tax Brackets (PAYE)</TabsTrigger>
          <TabsTrigger value="statutory">Statutory Deductions</TabsTrigger>
          <TabsTrigger value="nhif">NHIF Tiers</TabsTrigger>
          <TabsTrigger value="allowances">Allowances</TabsTrigger>
          <TabsTrigger value="deductions">Other Deductions</TabsTrigger>
          <TabsTrigger value="settings">General Settings</TabsTrigger>
        </TabsList>

        {/* PAYE Tax Brackets */}
        <TabsContent value="tax">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">PAYE Tax Brackets</CardTitle>
                <CardDescription>Monthly income tax bands as per KRA rates</CardDescription>
              </div>
              <Button size="sm" onClick={() => { setEditingBand(null); setBandOpen(true); }}>
                <Plus className="w-4 h-4 mr-1" /> Add Band
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Band</TableHead>
                    <TableHead className="text-right">Min (KES)</TableHead>
                    <TableHead className="text-right">Max (KES)</TableHead>
                    <TableHead className="text-right">Rate (%)</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxBrackets.map((b, i) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">Band {i + 1}</TableCell>
                      <TableCell className="text-right">{b.minAmount.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{b.maxAmount ? b.maxAmount.toLocaleString() : "Above"}</TableCell>
                      <TableCell className="text-right font-semibold">{b.rate}%</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingBand(b); setBandOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteBand(b.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground mt-3">* These rates are applied progressively on taxable income after personal relief deduction.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statutory Deductions */}
        <TabsContent value="statutory">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Statutory Deductions</CardTitle>
                <CardDescription>Government-mandated deductions (NSSF, NHIF, Housing Levy)</CardDescription>
              </div>
              <Button size="sm" onClick={() => { setEditingStat(null); setStatOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Add Deduction</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deduction</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Employee Rate/Amount</TableHead>
                    <TableHead className="text-right">Max Amount</TableHead>
                    <TableHead className="text-center">Employer Contribution</TableHead>
                    <TableHead className="text-center">Active</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statutory.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px]">{s.category === "nssf" ? "NSSF" : s.category === "housing_levy" ? "Housing Levy" : "Other"}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{s.type === "percentage" ? "%" : s.type === "tiered" ? "Tiered" : "Fixed"}</Badge></TableCell>
                      <TableCell className="text-right">{s.type === "tiered" ? "See NHIF tiers" : s.type === "percentage" ? `${s.value}%` : `KES ${s.value.toLocaleString()}`}</TableCell>
                      <TableCell className="text-right">{formatAmount(s.maxAmount)}</TableCell>
                      <TableCell className="text-center">{s.employerContribution ? <Badge variant="default" className="text-[10px]">{s.employerValue}%</Badge> : <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                      <TableCell className="text-center">
                        <Switch checked={s.active} onCheckedChange={() => toggleStatutory(s.id)} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingStat(s); setStatOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteStatutory(s.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NHIF Tiers */}
        <TabsContent value="nhif">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">NHIF Contribution Tiers</CardTitle>
                <CardDescription>Monthly NHIF deductions based on gross salary bands</CardDescription>
              </div>
              <Button size="sm" onClick={() => { setEditingNhif(null); setNhifOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Add Tier</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tier</TableHead>
                    <TableHead className="text-right">Min Salary (KES)</TableHead>
                    <TableHead className="text-right">Max Salary (KES)</TableHead>
                    <TableHead className="text-right">Monthly Amount (KES)</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nhifTiers.map((t, i) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">Tier {i + 1}</TableCell>
                      <TableCell className="text-right">{t.minSalary.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{t.maxSalary ? t.maxSalary.toLocaleString() : "Above"}</TableCell>
                      <TableCell className="text-right font-semibold">{t.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingNhif(t); setNhifOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteNhifTier(t.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Allowances */}
        <TabsContent value="allowances">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Allowance Types</CardTitle>
                <CardDescription>Define allowances that can be assigned to staff</CardDescription>
              </div>
              <Button size="sm" onClick={() => { setEditingAl(null); setAlOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Add Allowance</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Allowance</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Default Value</TableHead>
                    <TableHead className="text-center">Taxable</TableHead>
                    <TableHead className="text-center">Active</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allowances.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{a.type === "fixed" ? "Fixed" : "%"}</Badge></TableCell>
                      <TableCell className="text-right">{a.type === "fixed" ? `KES ${a.defaultValue.toLocaleString()}` : `${a.defaultValue}%`}</TableCell>
                      <TableCell className="text-center"><Badge variant={a.taxable ? "destructive" : "secondary"} className="text-[10px]">{a.taxable ? "Yes" : "No"}</Badge></TableCell>
                      <TableCell className="text-center">
                        <Switch checked={a.active} onCheckedChange={() => toggleAllowance(a.id)} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingAl(a); setAlOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteAllowance(a.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Other Deductions */}
        <TabsContent value="deductions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Other Deductions</CardTitle>
                <CardDescription>Voluntary and institutional deductions (SACCO, welfare, loans)</CardDescription>
              </div>
              <Button size="sm" onClick={() => { setEditingDed(null); setDedOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Add Deduction</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deduction</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Default Value</TableHead>
                    <TableHead className="text-center">Mandatory</TableHead>
                    <TableHead className="text-center">Active</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {otherDeductions.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{d.type === "fixed" ? "Fixed" : "%"}</Badge></TableCell>
                      <TableCell className="text-right">{d.type === "fixed" ? `KES ${d.defaultValue.toLocaleString()}` : `${d.defaultValue}%`}</TableCell>
                      <TableCell className="text-center"><Badge variant={d.mandatory ? "default" : "secondary"} className="text-[10px]">{d.mandatory ? "Yes" : "No"}</Badge></TableCell>
                      <TableCell className="text-center">
                        <Switch checked={d.active} onCheckedChange={() => toggleDeduction(d.id)} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingDed(d); setDedOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteDeduction(d.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* General Settings */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">General Payroll Settings</CardTitle>
              <CardDescription>Tax reliefs, payment schedule, and currency</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 max-w-lg">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Personal Relief (Monthly KES)</Label>
                  <Input type="number" value={settings.personalRelief} onChange={(e) => setSettings((s) => ({ ...s, personalRelief: Number(e.target.value) }))} />
                  <p className="text-xs text-muted-foreground">KRA personal relief deducted from PAYE</p>
                </div>
                <div className="space-y-2">
                  <Label>Insurance Relief (Annual Max KES)</Label>
                  <Input type="number" value={settings.insuranceRelief} onChange={(e) => setSettings((s) => ({ ...s, insuranceRelief: Number(e.target.value) }))} />
                  <p className="text-xs text-muted-foreground">Max annual insurance relief claim</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pay Day</Label>
                  <Select value={String(settings.payDay)} onValueChange={(v) => setSettings((s) => ({ ...s, payDay: Number(v) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[25, 26, 27, 28, 29, 30].map((d) => (<SelectItem key={d} value={String(d)}>{d}th of every month</SelectItem>))}
                      <SelectItem value="0">Last day of month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={settings.paymentMethod} onValueChange={(v) => setSettings((s) => ({ ...s, paymentMethod: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="mpesa">M-Pesa</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={saveSettings}>Save Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PayeBandModal
        open={bandOpen}
        onOpenChange={setBandOpen}
        initial={editingBand}
        defaultMin={lastBandMax ? lastBandMax + 1 : 0}
        onSubmit={saveBand}
      />

      <StatutoryDeductionModal
        open={statOpen}
        onOpenChange={setStatOpen}
        initial={editingStat}
        onSubmit={saveStatutory}
      />

      <NhifTierModal
        open={nhifOpen}
        onOpenChange={setNhifOpen}
        initial={editingNhif}
        defaultMin={lastNhifMax ? lastNhifMax + 1 : 0}
        onSubmit={saveNhifTier}
      />

      <AllowanceTypeModal
        open={alOpen}
        onOpenChange={setAlOpen}
        initial={editingAl}
        onSubmit={saveAllowance}
      />

      <OtherDeductionModal
        open={dedOpen}
        onOpenChange={setDedOpen}
        initial={editingDed}
        onSubmit={saveDeduction}
      />
    </div>
  );
};

export default PayrollSetupPage;
