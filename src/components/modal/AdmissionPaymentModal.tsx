import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import Swal from "sweetalert2";
import { FeeApi } from "@/services/api";
import { getBackendErrorMessage } from "@/utils/errorHandler";
import { METHOD_TO_BACKEND } from "@/utils/feePayment";
import type { PaymentMethod } from "@/data/feesMock";
import { Application } from "@/context/StudentContext";

const METHODS: PaymentMethod[] = ["Cash", "Cheque", "Bank", "Card", "M-Pesa"];

interface AdmissionPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: Application | null;
  onRecorded: (payment: any) => void;
}

const AdmissionPaymentModal = ({ open, onOpenChange, application: app, onRecorded }: AdmissionPaymentModalProps) => {
  const [method, setMethod] = useState<PaymentMethod>("Cash");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [bankName, setBankName] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isBankLike = method === "Cheque" || method === "Bank";

  const reset = () => { setMethod("Cash"); setAmount(""); setReference(""); setBankName(""); setNotes(""); };

  const submit = async () => {
    if (!app) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) { Swal.fire({ icon: "error", title: "Error", text: "Enter a valid amount", showConfirmButton: true }); return; }
    if (method !== "Cash" && !reference.trim()) { Swal.fire({ icon: "error", title: "Error", text: "Receipt / reference number is required", showConfirmButton: true }); return; }
    setSubmitting(true);
    try {
      const saved = await FeeApi.recordPayment({
        admissionUuid: app.uuid,
        studentName: `${app.firstName} ${app.lastName}`,
        grade: app.grade,
        stream: app.stream,
        amount: amt,
        method: METHOD_TO_BACKEND[method],
        reference: method === "Cash" ? undefined : reference.trim(),
        bankName: isBankLike ? bankName.trim() || undefined : undefined,
        slipOrChequeNumber: isBankLike ? reference.trim() : undefined,
        notes: notes.trim() || undefined,
      });
      const pending = saved.verificationStatus === "PENDING_VERIFICATION";
      Swal.fire({
        title: "Success",
        text: pending
          ? `Payment recorded — pending verification — won't count toward enrolment until confirmed`
          : `Payment recorded for ${app.firstName} ${app.lastName}`,
        icon: "success",
        showConfirmButton: true,
      });
      onRecorded(saved);
      onOpenChange(false);
      reset();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: getBackendErrorMessage(err, "Failed to record payment"), showConfirmButton: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>{app ? `${app.firstName} ${app.lastName} · ${app.grade}` : ""}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Amount (KES) <span className="text-destructive">*</span></Label>
            <Input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 5000" />
          </div>
          {method !== "Cash" && (
            <div className="space-y-2">
              <Label>{isBankLike ? "Cheque / Deposit Slip No." : "Reference"} <span className="text-destructive">*</span></Label>
              <Input value={reference} onChange={e => setReference(e.target.value)} placeholder="e.g. QGH7XJ2K" />
            </div>
          )}
          {isBankLike && (
            <div className="space-y-2">
              <Label>Bank Name</Label>
              <Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. Equity Bank" />
            </div>
          )}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Optional" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>{submitting ? "Saving..." : "Record Payment"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdmissionPaymentModal;
