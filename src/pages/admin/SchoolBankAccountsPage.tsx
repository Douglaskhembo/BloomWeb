import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Landmark, CheckCircle2 } from "lucide-react";
import Swal from "sweetalert2";
import { SchoolApi, PayrollApi } from "@/services/api";
import { getBackendErrorMessage } from "@/utils/errorHandler";
import Pagination from "@/utils/Pagination";
import { useAuth } from "@/context/AuthContext";

interface Bank { uuid: string; name: string; }
interface BankAccount {
  uuid: string;
  bank: Bank;
  accountNumber: string;
  accountName?: string;
  branch?: string;
  useForPayroll: boolean;
  active: boolean;
}

const emptyForm = { bankUuid: "", accountNumber: "", accountName: "", branch: "" };

const SchoolBankAccountsPage = () => {
  const { hasPermission } = useAuth();
  // This component's own page requires PAYROLL_STAFF_PAYMENT_MANAGE for its backend endpoints
  // (see SchoolController.java bank-accounts endpoints) — defense in depth in case this is ever
  // rendered directly rather than only inside the SchoolSetupPage tab that already hides it.
  const canManage = hasPermission("PAYROLL_STAFF_PAYMENT_MANAGE");
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [accountsPage, setAccountsPage] = useState(1);
  const [accountsPerPage, setAccountsPerPage] = useState(10);

  const load = async () => {
    try {
      const [accountRows, bankRows] = await Promise.all([SchoolApi.getBankAccounts(), PayrollApi.getBanks()]);
      setAccounts(accountRows);
      setBanks(bankRows.filter((b: any) => b.active));
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: getBackendErrorMessage(err, "Failed to load school bank accounts"), showConfirmButton: true });
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (a: BankAccount) => {
    setEditing(a);
    setForm({ bankUuid: a.bank?.uuid ?? "", accountNumber: a.accountNumber, accountName: a.accountName ?? "", branch: a.branch ?? "" });
    setOpen(true);
  };

  const save = async () => {
    if (!form.bankUuid || !form.accountNumber.trim()) { Swal.fire({ icon: "error", title: "Error", text: "Select a bank and enter an account number", showConfirmButton: true }); return; }
    try {
      if (editing) {
        await SchoolApi.updateBankAccount(editing.uuid, form);
        Swal.fire({ title: "Success", text: "Bank account updated", icon: "success", showConfirmButton: true });
      } else {
        await SchoolApi.createBankAccount(form);
        Swal.fire({ title: "Success", text: "Bank account added", icon: "success", showConfirmButton: true });
      }
      setOpen(false);
      load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: getBackendErrorMessage(err, "Failed to save bank account"), showConfirmButton: true });
    }
  };

  const remove = async (a: BankAccount) => {
    try { await SchoolApi.deleteBankAccount(a.uuid); Swal.fire({ title: "Success", text: "Bank account removed", icon: "success", showConfirmButton: true }); load(); }
    catch (err) { Swal.fire({ icon: "error", title: "Error", text: getBackendErrorMessage(err, "Failed to delete bank account"), showConfirmButton: true }); }
  };

  const useForPayroll = async (a: BankAccount) => {
    try { await SchoolApi.setBankAccountUseForPayroll(a.uuid); Swal.fire({ title: "Success", text: `${a.bank.name} set as the payroll debit account`, icon: "success", showConfirmButton: true }); load(); }
    catch (err) { Swal.fire({ icon: "error", title: "Error", text: getBackendErrorMessage(err, "Failed to update payroll debit account"), showConfirmButton: true }); }
  };

  const totalAccountPages = Math.ceil(accounts.length / accountsPerPage);
  const pagedAccounts = accounts.slice((accountsPage - 1) * accountsPerPage, accountsPage * accountsPerPage);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg flex items-center gap-2"><Landmark className="w-5 h-5" /> Bank Accounts</CardTitle>
          <CardDescription>
            The school's own accounts. Mark the one used to pay salaries as the payroll debit account —
            it's written to the "Debit Account" column of the bank submission file.
          </CardDescription>
        </div>
        {canManage && <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> Add Account</Button>}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bank</TableHead>
              <TableHead>Account Number</TableHead>
              <TableHead>Account Name</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead className="text-center">Payroll Debit Account</TableHead>
              <TableHead className="w-28 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedAccounts.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No bank accounts configured yet</TableCell></TableRow>
            ) : pagedAccounts.map((a) => (
              <TableRow key={a.uuid}>
                <TableCell className="font-medium">{a.bank?.name ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{a.accountNumber}</TableCell>
                <TableCell>{a.accountName || "—"}</TableCell>
                <TableCell>{a.branch || "—"}</TableCell>
                <TableCell className="text-center">
                  {a.useForPayroll ? (
                    <Badge className="text-[10px] gap-1"><CheckCircle2 className="w-3 h-3" /> In use</Badge>
                  ) : canManage ? (
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => useForPayroll(a)}>Use for payroll</Button>
                  ) : null}
                </TableCell>
                <TableCell className="text-right">
                  {canManage && (
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(a)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(a)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination currentPage={accountsPage} totalPages={totalAccountPages} onPageChange={setAccountsPage}
          itemsPerPage={accountsPerPage} onItemsPerPageChange={v => { setAccountsPerPage(v); setAccountsPage(1); }} />
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Bank Account" : "Add Bank Account"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Bank</Label>
              <Select value={form.bankUuid} onValueChange={(v) => setForm((f) => ({ ...f, bankUuid: v }))}>
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
                <Input value={form.accountNumber} onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Branch</Label>
                <Input value={form.branch} onChange={(e) => setForm((f) => ({ ...f, branch: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Account Name</Label>
              <Input value={form.accountName} onChange={(e) => setForm((f) => ({ ...f, accountName: e.target.value }))} placeholder="e.g. Bloom Academy Trust" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default SchoolBankAccountsPage;
