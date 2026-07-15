import { useState } from "react";
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

const initialTaxBrackets: TaxBracket[] = [
  { id: 1, minAmount: 0, maxAmount: 24000, rate: 10 },
  { id: 2, minAmount: 24001, maxAmount: 32333, rate: 25 },
  { id: 3, minAmount: 32334, maxAmount: 500000, rate: 30 },
  { id: 4, minAmount: 500001, maxAmount: 800000, rate: 32.5 },
  { id: 5, minAmount: 800001, maxAmount: null, rate: 35 },
];

const initialStatutory: StatutoryDeduction[] = [
  { id: 1, name: "NSSF (Tier I)", type: "percentage", value: 6, maxAmount: 1080, employerContribution: true, employerValue: 6, active: true },
  { id: 2, name: "NSSF (Tier II)", type: "percentage", value: 6, maxAmount: 1080, employerContribution: true, employerValue: 6, active: true },
  { id: 3, name: "NHIF", type: "tiered", value: 0, maxAmount: null, employerContribution: false, employerValue: 0, active: true },
  { id: 4, name: "Housing Levy", type: "percentage", value: 1.5, maxAmount: null, employerContribution: true, employerValue: 1.5, active: true },
];

const initialNHIFTiers: NHIFTier[] = [
  { id: 1, minSalary: 0, maxSalary: 5999, amount: 150 },
  { id: 2, minSalary: 6000, maxSalary: 7999, amount: 300 },
  { id: 3, minSalary: 8000, maxSalary: 11999, amount: 400 },
  { id: 4, minSalary: 12000, maxSalary: 14999, amount: 500 },
  { id: 5, minSalary: 15000, maxSalary: 19999, amount: 600 },
  { id: 6, minSalary: 20000, maxSalary: 24999, amount: 750 },
  { id: 7, minSalary: 25000, maxSalary: 29999, amount: 850 },
  { id: 8, minSalary: 30000, maxSalary: 34999, amount: 900 },
  { id: 9, minSalary: 35000, maxSalary: 39999, amount: 950 },
  { id: 10, minSalary: 40000, maxSalary: 44999, amount: 1000 },
  { id: 11, minSalary: 45000, maxSalary: 49999, amount: 1100 },
  { id: 12, minSalary: 50000, maxSalary: 59999, amount: 1200 },
  { id: 13, minSalary: 60000, maxSalary: 69999, amount: 1300 },
  { id: 14, minSalary: 70000, maxSalary: 79999, amount: 1400 },
  { id: 15, minSalary: 80000, maxSalary: 89999, amount: 1500 },
  { id: 16, minSalary: 90000, maxSalary: 99999, amount: 1600 },
  { id: 17, minSalary: 100000, maxSalary: null, amount: 1700 },
];

const initialAllowances: AllowanceType[] = [
  { id: 1, name: "House Allowance", type: "fixed", defaultValue: 8000, taxable: true, active: true },
  { id: 2, name: "Transport Allowance", type: "fixed", defaultValue: 4000, taxable: true, active: true },
  { id: 3, name: "Medical Allowance", type: "fixed", defaultValue: 3000, taxable: false, active: true },
  { id: 4, name: "Hardship Allowance", type: "fixed", defaultValue: 5000, taxable: true, active: false },
  { id: 5, name: "Responsibility Allowance", type: "fixed", defaultValue: 10000, taxable: true, active: true },
];

const initialOtherDeductions: OtherDeduction[] = [
  { id: 1, name: "Staff Welfare", type: "fixed", defaultValue: 500, mandatory: false, active: true },
  { id: 2, name: "SACCO Contribution", type: "fixed", defaultValue: 2000, mandatory: false, active: true },
  { id: 3, name: "Loan Repayment", type: "fixed", defaultValue: 0, mandatory: false, active: true },
  { id: 4, name: "Insurance Premium", type: "fixed", defaultValue: 1500, mandatory: false, active: false },
];

interface PayrollSettings {
  personalRelief: number;
  insuranceRelief: number;
  payDay: number;
  paymentMethod: string;
  currency: string;
}

const initialSettings: PayrollSettings = {
  personalRelief: 2400,
  insuranceRelief: 5000,
  payDay: 28,
  paymentMethod: "bank_transfer",
  currency: "KES",
};

const formatAmount = (n: number | null) => (n === null ? "No limit" : `KES ${n.toLocaleString()}`);
const nextId = <T extends { id: number }>(arr: T[]) => Math.max(...arr.map((x) => x.id), 0) + 1;

const PayrollSetupPage = () => {
  const navigate = useNavigate();
  const [taxBrackets, setTaxBrackets] = useState(initialTaxBrackets);
  const [statutory, setStatutory] = useState(initialStatutory);
  const [nhifTiers, setNhifTiers] = useState(initialNHIFTiers);
  const [allowances, setAllowances] = useState(initialAllowances);
  const [otherDeductions, setOtherDeductions] = useState(initialOtherDeductions);
  const [settings, setSettings] = useState(initialSettings);

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
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setTaxBrackets((prev) => prev.filter((x) => x.id !== b.id)); toast.success("Band removed"); }}><Trash2 className="w-3.5 h-3.5" /></Button>
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
                      <TableCell><Badge variant="outline" className="text-[10px]">{s.type === "percentage" ? "%" : s.type === "tiered" ? "Tiered" : "Fixed"}</Badge></TableCell>
                      <TableCell className="text-right">{s.type === "tiered" ? "See NHIF tiers" : s.type === "percentage" ? `${s.value}%` : `KES ${s.value.toLocaleString()}`}</TableCell>
                      <TableCell className="text-right">{formatAmount(s.maxAmount)}</TableCell>
                      <TableCell className="text-center">{s.employerContribution ? <Badge variant="default" className="text-[10px]">{s.employerValue}%</Badge> : <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                      <TableCell className="text-center">
                        <Switch checked={s.active} onCheckedChange={() => setStatutory((prev) => prev.map((x) => x.id === s.id ? { ...x, active: !x.active } : x))} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingStat(s); setStatOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setStatutory((prev) => prev.filter((x) => x.id !== s.id)); toast.success("Deleted"); }}><Trash2 className="w-3.5 h-3.5" /></Button>
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
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setNhifTiers((prev) => prev.filter((x) => x.id !== t.id)); toast.success("Tier removed"); }}><Trash2 className="w-3.5 h-3.5" /></Button>
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
                        <Switch checked={a.active} onCheckedChange={() => setAllowances((prev) => prev.map((x) => x.id === a.id ? { ...x, active: !x.active } : x))} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingAl(a); setAlOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setAllowances((prev) => prev.filter((x) => x.id !== a.id)); toast.success("Deleted"); }}><Trash2 className="w-3.5 h-3.5" /></Button>
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
                        <Switch checked={d.active} onCheckedChange={() => setOtherDeductions((prev) => prev.map((x) => x.id === d.id ? { ...x, active: !x.active } : x))} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingDed(d); setDedOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setOtherDeductions((prev) => prev.filter((x) => x.id !== d.id)); toast.success("Deleted"); }}><Trash2 className="w-3.5 h-3.5" /></Button>
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
              <Button onClick={() => toast.success("Payroll settings saved")}>Save Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PayeBandModal
        open={bandOpen}
        onOpenChange={setBandOpen}
        initial={editingBand}
        defaultMin={lastBandMax ? lastBandMax + 1 : 0}
        onSubmit={(data) => {
          if (editingBand) {
            setTaxBrackets((prev) => prev.map((x) => x.id === editingBand.id ? { ...x, ...data } : x).sort((a, b) => a.minAmount - b.minAmount));
            toast.success("Band updated");
          } else {
            setTaxBrackets((prev) => [...prev, { id: nextId(prev), ...data }].sort((a, b) => a.minAmount - b.minAmount));
            toast.success("Band added");
          }
          setBandOpen(false);
        }}
      />

      <StatutoryDeductionModal
        open={statOpen}
        onOpenChange={setStatOpen}
        initial={editingStat}
        onSubmit={(data) => {
          if (editingStat) {
            setStatutory((prev) => prev.map((x) => x.id === editingStat.id ? { ...x, ...data } : x));
            toast.success("Deduction updated");
          } else {
            setStatutory((prev) => [...prev, { id: nextId(prev), ...data, active: true }]);
            toast.success("Deduction added");
          }
          setStatOpen(false);
        }}
      />

      <NhifTierModal
        open={nhifOpen}
        onOpenChange={setNhifOpen}
        initial={editingNhif}
        defaultMin={lastNhifMax ? lastNhifMax + 1 : 0}
        onSubmit={(data) => {
          if (editingNhif) {
            setNhifTiers((prev) => prev.map((x) => x.id === editingNhif.id ? { ...x, ...data } : x).sort((a, b) => a.minSalary - b.minSalary));
            toast.success("Tier updated");
          } else {
            setNhifTiers((prev) => [...prev, { id: nextId(prev), ...data }].sort((a, b) => a.minSalary - b.minSalary));
            toast.success("Tier added");
          }
          setNhifOpen(false);
        }}
      />

      <AllowanceTypeModal
        open={alOpen}
        onOpenChange={setAlOpen}
        initial={editingAl}
        onSubmit={(data) => {
          if (editingAl) {
            setAllowances((prev) => prev.map((x) => x.id === editingAl.id ? { ...x, ...data } : x));
            toast.success("Allowance updated");
          } else {
            setAllowances((prev) => [...prev, { id: nextId(prev), ...data, active: true }]);
            toast.success("Allowance added");
          }
          setAlOpen(false);
        }}
      />

      <OtherDeductionModal
        open={dedOpen}
        onOpenChange={setDedOpen}
        initial={editingDed}
        onSubmit={(data) => {
          if (editingDed) {
            setOtherDeductions((prev) => prev.map((x) => x.id === editingDed.id ? { ...x, ...data } : x));
            toast.success("Deduction updated");
          } else {
            setOtherDeductions((prev) => [...prev, { id: nextId(prev), ...data, active: true }]);
            toast.success("Deduction added");
          }
          setDedOpen(false);
        }}
      />
    </div>
  );
};

export default PayrollSetupPage;
