import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, ArrowLeft, Landmark, Smartphone, Tags } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PayrollApi } from "@/services/api";
import { getBackendErrorMessage } from "@/utils/errorHandler";

interface Bank { id: number; uuid: string; name: string; bankCode?: string; swiftCode?: string; active: boolean; }
interface Provider { id: number; uuid: string; name: string; shortCode?: string; active: boolean; }
type PaymentTypeCategory = "BANK" | "MOBILE_WALLET";
interface PaymentType { id: number; uuid: string; category: PaymentTypeCategory; code: string; active: boolean; }

const BanksSetupPage = () => {
  const navigate = useNavigate();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);

  const [bankOpen, setBankOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [bankForm, setBankForm] = useState({ name: "", bankCode: "", swiftCode: "" });

  const [providerOpen, setProviderOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [providerForm, setProviderForm] = useState({ name: "", shortCode: "" });

  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [typeOpen, setTypeOpen] = useState(false);
  const [editingType, setEditingType] = useState<PaymentType | null>(null);
  const [typeForm, setTypeForm] = useState<{ category: PaymentTypeCategory; code: string }>({ category: "BANK", code: "" });

  const load = async () => {
    try {
      const [bankRows, providerRows, typeRows] = await Promise.all([
        PayrollApi.getBanks(), PayrollApi.getMobileMoneyProviders(), PayrollApi.getPaymentTypes(),
      ]);
      setBanks(bankRows);
      setProviders(providerRows);
      setPaymentTypes(typeRows);
    } catch (err) {
      toast.error(getBackendErrorMessage(err, "Failed to load banks & mobile money providers"));
    }
  };

  useEffect(() => { load(); }, []);

  const openAddBank = () => { setEditingBank(null); setBankForm({ name: "", bankCode: "", swiftCode: "" }); setBankOpen(true); };
  const openEditBank = (b: Bank) => { setEditingBank(b); setBankForm({ name: b.name, bankCode: b.bankCode ?? "", swiftCode: b.swiftCode ?? "" }); setBankOpen(true); };

  const saveBank = async () => {
    if (!bankForm.name.trim()) return;
    try {
      if (editingBank) {
        await PayrollApi.updateBank(editingBank.id, bankForm);
        toast.success("Bank updated");
      } else {
        await PayrollApi.createBank(bankForm);
        toast.success("Bank added");
      }
      setBankOpen(false);
      load();
    } catch (err) {
      toast.error(getBackendErrorMessage(err, "Failed to save bank"));
    }
  };

  const toggleBank = async (b: Bank) => {
    try { await PayrollApi.toggleBank(b.id); load(); }
    catch (err) { toast.error(getBackendErrorMessage(err, "Failed to update bank")); }
  };

  const deleteBank = async (b: Bank) => {
    try { await PayrollApi.deleteBank(b.id); toast.success("Bank deleted"); load(); }
    catch (err) { toast.error(getBackendErrorMessage(err, "Failed to delete bank")); }
  };

  const openAddProvider = () => { setEditingProvider(null); setProviderForm({ name: "", shortCode: "" }); setProviderOpen(true); };
  const openEditProvider = (p: Provider) => { setEditingProvider(p); setProviderForm({ name: p.name, shortCode: p.shortCode ?? "" }); setProviderOpen(true); };

  const saveProvider = async () => {
    if (!providerForm.name.trim()) return;
    try {
      if (editingProvider) {
        await PayrollApi.updateMobileMoneyProvider(editingProvider.id, providerForm);
        toast.success("Provider updated");
      } else {
        await PayrollApi.createMobileMoneyProvider(providerForm);
        toast.success("Provider added");
      }
      setProviderOpen(false);
      load();
    } catch (err) {
      toast.error(getBackendErrorMessage(err, "Failed to save provider"));
    }
  };

  const toggleProvider = async (p: Provider) => {
    try { await PayrollApi.toggleMobileMoneyProvider(p.id); load(); }
    catch (err) { toast.error(getBackendErrorMessage(err, "Failed to update provider")); }
  };

  const deleteProvider = async (p: Provider) => {
    try { await PayrollApi.deleteMobileMoneyProvider(p.id); toast.success("Provider deleted"); load(); }
    catch (err) { toast.error(getBackendErrorMessage(err, "Failed to delete provider")); }
  };

  const openAddType = () => { setEditingType(null); setTypeForm({ category: "BANK", code: "" }); setTypeOpen(true); };
  const openEditType = (t: PaymentType) => { setEditingType(t); setTypeForm({ category: t.category, code: t.code }); setTypeOpen(true); };

  const saveType = async () => {
    if (!typeForm.code.trim()) return;
    try {
      if (editingType) {
        await PayrollApi.updatePaymentType(editingType.id, typeForm);
        toast.success("Payment type updated");
      } else {
        await PayrollApi.createPaymentType(typeForm);
        toast.success("Payment type added");
      }
      setTypeOpen(false);
      load();
    } catch (err) {
      toast.error(getBackendErrorMessage(err, "Failed to save payment type"));
    }
  };

  const toggleType = async (t: PaymentType) => {
    try { await PayrollApi.togglePaymentType(t.id); load(); }
    catch (err) { toast.error(getBackendErrorMessage(err, "Failed to update payment type")); }
  };

  const deleteType = async (t: PaymentType) => {
    try { await PayrollApi.deletePaymentType(t.id); toast.success("Payment type deleted"); load(); }
    catch (err) { toast.error(getBackendErrorMessage(err, "Failed to delete payment type")); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/system-setups")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Banks &amp; Mobile Money</h1>
          <p className="text-muted-foreground">Master list of banks and mobile money providers (M-Pesa, Airtel Money) used for payroll disbursement</p>
        </div>
      </div>

      <Tabs defaultValue="banks">
        <TabsList>
          <TabsTrigger value="banks">Banks</TabsTrigger>
          <TabsTrigger value="mobile-money">Mobile Money Providers</TabsTrigger>
          <TabsTrigger value="payment-types">Payment Types</TabsTrigger>
        </TabsList>

        <TabsContent value="banks">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2"><Landmark className="w-5 h-5" /> Banks</CardTitle>
                <CardDescription>No live bank API integration — used for manual/physical payroll submission and staff account records</CardDescription>
              </div>
              <Button size="sm" onClick={openAddBank}><Plus className="w-4 h-4 mr-1" /> Add Bank</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Bank Code</TableHead>
                    <TableHead>SWIFT Code</TableHead>
                    <TableHead className="text-center">Active</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {banks.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No banks configured yet</TableCell></TableRow>
                  ) : banks.map((b) => (
                    <TableRow key={b.uuid}>
                      <TableCell className="font-medium">{b.name}</TableCell>
                      <TableCell>{b.bankCode || "—"}</TableCell>
                      <TableCell>{b.swiftCode || "—"}</TableCell>
                      <TableCell className="text-center"><Switch checked={b.active} onCheckedChange={() => toggleBank(b)} /></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditBank(b)}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteBank(b)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mobile-money">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2"><Smartphone className="w-5 h-5" /> Mobile Money Providers</CardTitle>
                <CardDescription>M-Pesa, Airtel Money, or other mobile wallet providers usable for staff payouts</CardDescription>
              </div>
              <Button size="sm" onClick={openAddProvider}><Plus className="w-4 h-4 mr-1" /> Add Provider</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Short Code / Paybill</TableHead>
                    <TableHead className="text-center">Active</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providers.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No providers configured yet</TableCell></TableRow>
                  ) : providers.map((p) => (
                    <TableRow key={p.uuid}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.shortCode || "—"}</TableCell>
                      <TableCell className="text-center"><Switch checked={p.active} onCheckedChange={() => toggleProvider(p)} /></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditProvider(p)}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteProvider(p)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment-types">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2"><Tags className="w-5 h-5" /> Payment Types</CardTitle>
                <CardDescription>
                  Settlement rail written to the "Payment Type" column of the bank submission file — e.g.
                  PESALINK, RTGS, EFT, WITHIN BANK for bank transfers, or MPESA, AIRTEL MONEY for mobile wallets.
                  Always stored in caps regardless of how it's typed.
                </CardDescription>
              </div>
              <Button size="sm" onClick={openAddType}><Plus className="w-4 h-4 mr-1" /> Add Payment Type</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">Active</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentTypes.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No payment types configured yet</TableCell></TableRow>
                  ) : paymentTypes.map((t) => (
                    <TableRow key={t.uuid}>
                      <TableCell><Badge variant="secondary" className="text-[10px]">{t.category === "BANK" ? "Bank" : "Mobile Wallet"}</Badge></TableCell>
                      <TableCell className="font-medium font-mono">{t.code}</TableCell>
                      <TableCell className="text-center"><Switch checked={t.active} onCheckedChange={() => toggleType(t)} /></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditType(t)}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteType(t)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={bankOpen} onOpenChange={setBankOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingBank ? "Edit Bank" : "Add Bank"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Bank Name</Label>
              <Input value={bankForm.name} onChange={(e) => setBankForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Equity Bank" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Bank Code</Label>
                <Input value={bankForm.bankCode} onChange={(e) => setBankForm((f) => ({ ...f, bankCode: e.target.value }))} placeholder="e.g. 068" />
              </div>
              <div className="space-y-2">
                <Label>SWIFT Code</Label>
                <Input value={bankForm.swiftCode} onChange={(e) => setBankForm((f) => ({ ...f, swiftCode: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBankOpen(false)}>Cancel</Button>
            <Button onClick={saveBank}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={providerOpen} onOpenChange={setProviderOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingProvider ? "Edit Provider" : "Add Mobile Money Provider"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Provider Name</Label>
              <Input value={providerForm.name} onChange={(e) => setProviderForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. M-PESA, Airtel Money" />
            </div>
            <div className="space-y-2">
              <Label>Short Code / Paybill (optional)</Label>
              <Input value={providerForm.shortCode} onChange={(e) => setProviderForm((f) => ({ ...f, shortCode: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProviderOpen(false)}>Cancel</Button>
            <Button onClick={saveProvider}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={typeOpen} onOpenChange={setTypeOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingType ? "Edit Payment Type" : "Add Payment Type"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={typeForm.category} onValueChange={(v) => setTypeForm((f) => ({ ...f, category: v as PaymentTypeCategory }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK">Bank</SelectItem>
                  <SelectItem value="MOBILE_WALLET">Mobile Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Input
                value={typeForm.code}
                onChange={(e) => setTypeForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="e.g. PESALINK, RTGS, EFT, WITHIN BANK, MPESA, AIRTEL MONEY"
              />
              <p className="text-xs text-muted-foreground">Saved in caps regardless of how it's typed here.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTypeOpen(false)}>Cancel</Button>
            <Button onClick={saveType}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BanksSetupPage;
