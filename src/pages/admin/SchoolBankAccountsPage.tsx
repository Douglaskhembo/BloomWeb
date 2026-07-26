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
import { toast } from "sonner";
import { SchoolApi, PayrollApi } from "@/services/api";
import { getBackendErrorMessage } from "@/utils/errorHandler";

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
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    try {
      const [accountRows, bankRows] = await Promise.all([SchoolApi.getBankAccounts(), PayrollApi.getBanks()]);
      setAccounts(accountRows);
      setBanks(bankRows.filter((b: any) => b.active));
    } catch (err) {
      toast.error(getBackendErrorMessage(err, "Failed to load school bank accounts"));
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
    if (!form.bankUuid || !form.accountNumber.trim()) { toast.error("Select a bank and enter an account number"); return; }
    try {
      if (editing) {
        await SchoolApi.updateBankAccount(editing.uuid, form);
        toast.success("Bank account updated");
      } else {
        await SchoolApi.createBankAccount(form);
        toast.success("Bank account added");
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(getBackendErrorMessage(err, "Failed to save bank account"));
    }
  };

  const remove = async (a: BankAccount) => {
    try { await SchoolApi.deleteBankAccount(a.uuid); toast.success("Bank account removed"); load(); }
    catch (err) { toast.error(getBackendErrorMessage(err, "Failed to delete bank account")); }
  };

  const useForPayroll = async (a: BankAccount) => {
    try { await SchoolApi.setBankAccountUseForPayroll(a.uuid); toast.success(`${a.bank.name} set as the payroll debit account`); load(); }
    catch (err) { toast.error(getBackendErrorMessage(err, "Failed to update payroll debit account")); }
  };

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
        <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> Add Account</Button>
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
            {accounts.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No bank accounts configured yet</TableCell></TableRow>
            ) : accounts.map((a) => (
              <TableRow key={a.uuid}>
                <TableCell className="font-medium">{a.bank?.name ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{a.accountNumber}</TableCell>
                <TableCell>{a.accountName || "—"}</TableCell>
                <TableCell>{a.branch || "—"}</TableCell>
                <TableCell className="text-center">
                  {a.useForPayroll ? (
                    <Badge className="text-[10px] gap-1"><CheckCircle2 className="w-3 h-3" /> In use</Badge>
                  ) : (
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => useForPayroll(a)}>Use for payroll</Button>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(a)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(a)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
