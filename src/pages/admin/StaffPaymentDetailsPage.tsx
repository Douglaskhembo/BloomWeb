import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Search, Pencil, CreditCard, Eye, Banknote, Smartphone } from "lucide-react";
import Swal from "sweetalert2";
import { StaffApi, PayrollApi, SchoolApi } from "@/services/api";
import { getBackendErrorMessage } from "@/utils/errorHandler";
import { getStaffIdentifier } from "@/utils/staff";
import PayrollNavTabs from "@/components/payroll/PayrollNavTabs";
import Pagination from "@/utils/Pagination";

type PaymentMethod = "BANK_TRANSFER" | "MOBILE_MONEY" | "CHEQUE";

interface FormState {
  paymentMethod: PaymentMethod;
  bankUuid: string;
  bankAccountNumber: string;
  bankAccountName: string;
  bankBranch: string;
  mobileMoneyProviderUuid: string;
  mobileNumber: string;
  mobileAccountName: string;
  paymentTypeUuid: string;
}

const emptyForm: FormState = {
  paymentMethod: "BANK_TRANSFER",
  bankUuid: "", bankAccountNumber: "", bankAccountName: "", bankBranch: "",
  mobileMoneyProviderUuid: "", mobileNumber: "", mobileAccountName: "",
  paymentTypeUuid: "",
};

const describe = (d: any, banks: any[], providers: any[]): string => {
  if (!d) return "Not configured";
  if (d.paymentMethod === "BANK_TRANSFER") {
    const bank = banks.find((b) => b.uuid === d.bank?.uuid);
    return `${bank?.name ?? d.bank?.name ?? "Bank"} — ${d.bankAccountNumber ?? ""}`;
  }
  if (d.paymentMethod === "MOBILE_MONEY") {
    const provider = providers.find((p) => p.uuid === d.mobileMoneyProvider?.uuid);
    return `${provider?.name ?? d.mobileMoneyProvider?.name ?? "Mobile Money"} — ${d.mobileNumber ?? ""}`;
  }
  return "Cheque";
};

const StaffPaymentDetailsPage = () => {
  const [search, setSearch] = useState("");
  const [staff, setStaff] = useState<any[]>([]);
  const [details, setDetails] = useState<Record<string, any>>({});
  const [banks, setBanks] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<any[]>([]);
  const [payrollDebitBankUuid, setPayrollDebitBankUuid] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [staffPage, setStaffPage] = useState(1);
  const [staffPerPage, setStaffPerPage] = useState(10);

  const load = async () => {
    try {
      const [staffRows, detailRows, bankRows, providerRows, typeRows, accountRows] = await Promise.all([
        StaffApi.getAll(),
        PayrollApi.getAllStaffPaymentDetails(),
        PayrollApi.getBanks(),
        PayrollApi.getMobileMoneyProviders(),
        PayrollApi.getPaymentTypes(),
        SchoolApi.getBankAccounts(),
      ]);
      setStaff((Array.isArray(staffRows) ? staffRows : []).map((s: any) => ({
        uuid: s.uuid, firstName: s.firstName, lastName: s.lastName, staffType: s.staffType, status: s.status,
        idNumber: s.idNumber, passportNumber: s.passportNumber, staffId: s.staffId,
      })));
      const byStaffId: Record<string, any> = {};
      detailRows.forEach((d: any) => { byStaffId[d.staffId] = d; });
      setDetails(byStaffId);
      setBanks(bankRows.filter((b: any) => b.active));
      setProviders(providerRows.filter((p: any) => p.active));
      setPaymentTypes(typeRows.filter((t: any) => t.active));
      const payrollAccount = (Array.isArray(accountRows) ? accountRows : []).find((a: any) => a.useForPayroll);
      setPayrollDebitBankUuid(payrollAccount?.bank?.uuid ?? null);
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to load", text: getBackendErrorMessage(err), showConfirmButton: true });
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => staff.filter((s) => `${s.firstName} ${s.lastName} ${getStaffIdentifier(s)}`.toLowerCase().includes(search.toLowerCase())),
    [staff, search],
  );

  const totalStaffPages = Math.ceil(filtered.length / staffPerPage);
  const pagedStaff = filtered.slice((staffPage - 1) * staffPerPage, staffPage * staffPerPage);

  const openEdit = (staffId: string) => {
    const existing = details[staffId];
    setEditingId(staffId);
    setForm(existing ? {
      paymentMethod: existing.paymentMethod,
      bankUuid: existing.bank?.uuid ?? "",
      bankAccountNumber: existing.bankAccountNumber ?? "",
      bankAccountName: existing.bankAccountName ?? "",
      bankBranch: existing.bankBranch ?? "",
      mobileMoneyProviderUuid: existing.mobileMoneyProvider?.uuid ?? "",
      mobileNumber: existing.mobileNumber ?? "",
      mobileAccountName: existing.mobileAccountName ?? "",
      paymentTypeUuid: existing.paymentType?.uuid ?? "",
    } : emptyForm);
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await PayrollApi.saveStaffPaymentDetails({
        staffId: editingId,
        paymentMethod: form.paymentMethod,
        bankUuid: form.paymentMethod === "BANK_TRANSFER" ? (form.bankUuid || null) : null,
        bankAccountNumber: form.paymentMethod === "BANK_TRANSFER" ? form.bankAccountNumber : null,
        bankAccountName: form.paymentMethod === "BANK_TRANSFER" ? form.bankAccountName : null,
        bankBranch: form.paymentMethod === "BANK_TRANSFER" ? form.bankBranch : null,
        mobileMoneyProviderUuid: form.paymentMethod === "MOBILE_MONEY" ? (form.mobileMoneyProviderUuid || null) : null,
        mobileNumber: form.paymentMethod === "MOBILE_MONEY" ? form.mobileNumber : null,
        mobileAccountName: form.paymentMethod === "MOBILE_MONEY" ? form.mobileAccountName : null,
        paymentTypeUuid: form.paymentMethod !== "CHEQUE" && !isWithinBank ? (form.paymentTypeUuid || null) : null,
      });
      Swal.fire({ title: "Success", text: "Payment details saved", icon: "success", showConfirmButton: true });
      setOpen(false);
      load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Could not save", text: getBackendErrorMessage(err), showConfirmButton: true });
    } finally {
      setSaving(false);
    }
  };

  const editingStaff = staff.find((s) => s.uuid === editingId);
  const configuredCount = staff.filter((s) => details[s.uuid]).length;
  const viewingStaff = staff.find((s) => s.uuid === viewingId);
  const viewingDetails = viewingId ? details[viewingId] : null;
  // Same bank as the payroll debit account = an intra-bank transfer — no settlement rail to pick,
  // it's always "WITHIN BANK" (derived at export time, not stored here).
  const isWithinBank = form.paymentMethod === "BANK_TRANSFER" && !!form.bankUuid && form.bankUuid === payrollDebitBankUuid;
  const viewingIsWithinBank = viewingDetails?.paymentMethod === "BANK_TRANSFER" && viewingDetails?.bank?.uuid === payrollDebitBankUuid;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff Payment Details</h1>
          <p className="text-muted-foreground">
            Finance-only bank account and mobile money (M-Pesa / Airtel Money) details used to prepare payroll for
            disbursement — kept separate from onboarding.
          </p>
        </div>
        <PayrollNavTabs />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">All Staff</CardTitle>
              <CardDescription>{configuredCount} / {staff.length} staff have payout details configured</CardDescription>
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
                <TableHead>Payment Method</TableHead>
                <TableHead>Payout Destination</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedStaff.map((s) => {
                const d = details[s.uuid];
                return (
                  <TableRow key={s.uuid}>
                    <TableCell className="font-mono text-xs">{getStaffIdentifier(s)}</TableCell>
                    <TableCell className="font-medium">{s.firstName} {s.lastName}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{s.staffType}</Badge></TableCell>
                    <TableCell>
                      {d ? <Badge variant="secondary" className="text-[10px]">{d.paymentMethod.replace("_", " ")}</Badge>
                         : <span className="text-xs text-muted-foreground">Not set</span>}
                    </TableCell>
                    <TableCell className="text-sm">{describe(d, banks, providers)}</TableCell>
                    <TableCell className="text-right space-x-1">
                      {d && (
                        <Button variant="ghost" size="sm" onClick={() => setViewingId(s.uuid)}>
                          <Eye className="w-3.5 h-3.5 mr-1" /> View
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => openEdit(s.uuid)}>
                        <Pencil className="w-3.5 h-3.5 mr-1" /> {d ? "Edit" : "Set Up"}
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

      <Dialog open={!!viewingId} onOpenChange={(o) => !o && setViewingId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Eye className="w-4 h-4" /> Payout Details</DialogTitle>
            <DialogDescription>{viewingStaff ? `${viewingStaff.firstName} ${viewingStaff.lastName}` : ""}</DialogDescription>
          </DialogHeader>
          {viewingDetails && (
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-2 pb-2 border-b">
                {viewingDetails.paymentMethod === "MOBILE_MONEY" ? (
                  <Smartphone className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Banknote className="w-4 h-4 text-muted-foreground" />
                )}
                <Badge variant="secondary">{viewingDetails.paymentMethod.replace("_", " ")}</Badge>
              </div>

              {viewingDetails.paymentMethod === "BANK_TRANSFER" && (
                <dl className="grid grid-cols-2 gap-y-3 text-sm">
                  <dt className="text-muted-foreground">Bank</dt>
                  <dd className="font-medium text-right">{viewingDetails.bank?.name ?? "—"}</dd>
                  <dt className="text-muted-foreground">Account Number</dt>
                  <dd className="font-medium text-right font-mono">{viewingDetails.bankAccountNumber || "—"}</dd>
                  <dt className="text-muted-foreground">Account Name</dt>
                  <dd className="font-medium text-right">{viewingDetails.bankAccountName || "—"}</dd>
                  <dt className="text-muted-foreground">Branch</dt>
                  <dd className="font-medium text-right">{viewingDetails.bankBranch || "—"}</dd>
                  <dt className="text-muted-foreground">Payment Type</dt>
                  <dd className="font-medium text-right">{viewingIsWithinBank ? "WITHIN BANK" : (viewingDetails.paymentType?.code || "—")}</dd>
                </dl>
              )}

              {viewingDetails.paymentMethod === "MOBILE_MONEY" && (
                <dl className="grid grid-cols-2 gap-y-3 text-sm">
                  <dt className="text-muted-foreground">Provider</dt>
                  <dd className="font-medium text-right">{viewingDetails.mobileMoneyProvider?.name ?? "—"}</dd>
                  <dt className="text-muted-foreground">Mobile Number</dt>
                  <dd className="font-medium text-right font-mono">{viewingDetails.mobileNumber || "—"}</dd>
                  <dt className="text-muted-foreground">Registered Name</dt>
                  <dd className="font-medium text-right">{viewingDetails.mobileAccountName || "—"}</dd>
                  <dt className="text-muted-foreground">Payment Type</dt>
                  <dd className="font-medium text-right">{viewingDetails.paymentType?.code || "—"}</dd>
                </dl>
              )}

              {viewingDetails.paymentMethod === "CHEQUE" && (
                <p className="text-sm text-muted-foreground">Paid by physical cheque — no account details required.</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingId(null)}>Close</Button>
            <Button onClick={() => { const id = viewingId!; setViewingId(null); openEdit(id); }}>
              <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CreditCard className="w-4 h-4" /> Payment Details</DialogTitle>
            <DialogDescription>{editingStaff ? `${editingStaff.firstName} ${editingStaff.lastName}` : ""}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={form.paymentMethod} onValueChange={(v) => setForm((f) => ({ ...f, paymentMethod: v as PaymentMethod, paymentTypeUuid: "" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="MOBILE_MONEY">Mobile Money (M-Pesa / Airtel Money)</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.paymentMethod === "BANK_TRANSFER" && (
              <>
                <div className="space-y-2">
                  <Label>Bank</Label>
                  <Select value={form.bankUuid} onValueChange={(v) => setForm((f) => ({ ...f, bankUuid: v, paymentTypeUuid: v === payrollDebitBankUuid ? "" : f.paymentTypeUuid }))}>
                    <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
                    <SelectContent>
                      {banks.map((b) => <SelectItem key={b.uuid} value={b.uuid}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {banks.length === 0 && (
                    <p className="text-xs text-muted-foreground">No banks set up yet — add one under System Setups → Banks &amp; Mobile Money.</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Account Number</Label>
                    <Input value={form.bankAccountNumber} onChange={(e) => setForm((f) => ({ ...f, bankAccountNumber: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Branch</Label>
                    <Input value={form.bankBranch} onChange={(e) => setForm((f) => ({ ...f, bankBranch: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Account Name</Label>
                  <Input value={form.bankAccountName} onChange={(e) => setForm((f) => ({ ...f, bankAccountName: e.target.value }))} />
                </div>
                {isWithinBank ? (
                  <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                    This staff member's bank matches the payroll debit account — this will be a within-bank
                    transfer, so no payment type is needed (recorded as "WITHIN BANK" on the bank submission file).
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Payment Type</Label>
                    <Select value={form.paymentTypeUuid} onValueChange={(v) => setForm((f) => ({ ...f, paymentTypeUuid: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select payment type" /></SelectTrigger>
                      <SelectContent>
                        {paymentTypes.filter((t) => t.category === "BANK").map((t) => <SelectItem key={t.uuid} value={t.uuid}>{t.code}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Settlement rail for the bank submission file — e.g. PESALINK, RTGS, or EFT. Leave
                      unset to default to PESALINK; only pick one explicitly for exceptions (e.g. RTGS for
                      large amounts).
                    </p>
                  </div>
                )}
              </>
            )}

            {form.paymentMethod === "MOBILE_MONEY" && (
              <>
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select value={form.mobileMoneyProviderUuid} onValueChange={(v) => setForm((f) => ({ ...f, mobileMoneyProviderUuid: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                    <SelectContent>
                      {providers.map((p) => <SelectItem key={p.uuid} value={p.uuid}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {providers.length === 0 && (
                    <p className="text-xs text-muted-foreground">No providers set up yet — add M-Pesa / Airtel Money under System Setups → Banks &amp; Mobile Money.</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Mobile Number</Label>
                    <Input value={form.mobileNumber} onChange={(e) => setForm((f) => ({ ...f, mobileNumber: e.target.value }))} placeholder="07XXXXXXXX" />
                  </div>
                  <div className="space-y-2">
                    <Label>Registered Name</Label>
                    <Input value={form.mobileAccountName} onChange={(e) => setForm((f) => ({ ...f, mobileAccountName: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Payment Type</Label>
                  <Select value={form.paymentTypeUuid} onValueChange={(v) => setForm((f) => ({ ...f, paymentTypeUuid: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select payment type" /></SelectTrigger>
                    <SelectContent>
                      {paymentTypes.filter((t) => t.category === "MOBILE_WALLET").map((t) => <SelectItem key={t.uuid} value={t.uuid}>{t.code}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">e.g. MPESA or AIRTEL MONEY.</p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffPaymentDetailsPage;
