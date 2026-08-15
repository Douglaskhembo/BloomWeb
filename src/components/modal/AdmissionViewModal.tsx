import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Application, STAGE_LABELS } from "@/context/StudentContext";
import { FeeApi } from "@/services/api";
import { METHOD_FROM_BACKEND } from "@/utils/feePayment";

const STAGE_BADGE: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  APPLICATION_REVIEW: "secondary",
  INTERVIEW_SCHEDULED: "outline",
  OFFER_SENT: "default",
  FEE_PAYMENT: "outline",
  ENROLLED: "default",
};

const PAYMENT_STATUS_BADGE: Record<string, "default" | "secondary" | "destructive"> = {
  CONFIRMED: "default",
  PENDING_VERIFICATION: "secondary",
  REJECTED: "destructive",
};

interface AdmissionViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: Application | null;
}

const AdmissionViewModal = ({ open, onOpenChange, application: app }: AdmissionViewModalProps) => {
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    if (!open || !app) { setPayments([]); return; }
    FeeApi.getPayments({ admissionUuid: app.uuid }).then(setPayments);
  }, [open, app]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Application Details — {app?.firstName} {app?.lastName}</DialogTitle>
          <DialogDescription>Application ID: {app?.applicationId}</DialogDescription>
        </DialogHeader>
        {app && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 justify-end">
              <Badge variant={STAGE_BADGE[app.stage] ?? "outline"} className="text-[10px]">{STAGE_LABELS[app.stage] ?? app.stage}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div><span className="text-muted-foreground">Full Name:</span> <span className="font-medium ml-1">{app.firstName} {app.lastName}</span></div>
              <div><span className="text-muted-foreground">Gender:</span> <span className="font-medium ml-1">{app.gender || "—"}</span></div>
              <div><span className="text-muted-foreground">Date of Birth:</span> <span className="font-medium ml-1">{app.dateOfBirth || "—"}</span></div>
              <div><span className="text-muted-foreground">Birth Certificate No.:</span> <span className="font-medium ml-1">{app.birthCertificateNumber || "—"}</span></div>
              <div><span className="text-muted-foreground">Grade:</span> <span className="font-medium ml-1">{app.grade || "—"}</span></div>
              <div><span className="text-muted-foreground">Stream:</span> <span className="font-medium ml-1">{app.stream || "—"}</span></div>
              <div><span className="text-muted-foreground">Day Scholar / Boarder:</span> <span className="font-medium ml-1">{app.boarderStatus === "BOARDER" ? "Boarder" : app.boarderStatus === "DAY_SCHOLAR" ? "Day Scholar" : "—"}</span></div>
              <div><span className="text-muted-foreground">Applied On:</span> <span className="font-medium ml-1">{app.createdAt?.split("T")[0] ?? "—"}</span></div>
              <div className="col-span-full"><span className="text-muted-foreground">Home Address:</span> <span className="font-medium ml-1">{app.address || "—"}</span></div>
              <div className="col-span-full"><span className="text-muted-foreground">Medical Notes:</span> <span className="font-medium ml-1">{app.medicalNotes || "—"}</span></div>
            </div>

            <div className="border-t pt-3">
              <h4 className="text-sm font-semibold mb-2">Parent / Guardian</h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div><span className="text-muted-foreground">Name:</span> <span className="font-medium ml-1">{app.parentName || "—"}</span></div>
                <div><span className="text-muted-foreground">Relationship:</span> <span className="font-medium ml-1">{app.parentRelationship || "—"}</span></div>
                <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium ml-1">{app.parentPhone || "—"}</span></div>
                <div><span className="text-muted-foreground">Email:</span> <span className="font-medium ml-1">{app.parentEmail || "—"}</span></div>
              </div>
            </div>

            {payments.length > 0 && (
              <div className="border-t pt-3">
                <h4 className="text-sm font-semibold mb-2">Fee Payments ({payments.length})</h4>
                <div className="space-y-1">
                  {payments.map((p) => (
                    <div key={p.id ?? p.uuid} className="flex items-center justify-between text-sm py-1">
                      <span>{METHOD_FROM_BACKEND[p.method] ?? p.method} · KES {Number(p.amount).toLocaleString()}</span>
                      <Badge variant={PAYMENT_STATUS_BADGE[p.verificationStatus] ?? "outline"} className="text-[10px]">
                        {p.verificationStatus === "CONFIRMED" ? "Confirmed" : p.verificationStatus === "PENDING_VERIFICATION" ? "Pending Verification" : "Rejected"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {app.documents?.length > 0 && (
              <div className="border-t pt-3">
                <h4 className="text-sm font-semibold mb-2">Documents ({app.documents.length})</h4>
                <div className="space-y-1">
                  {app.documents.map((doc, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-1">
                      <span>{doc.name}</span>
                      <Badge variant="outline" className="text-[10px]">{doc.type}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AdmissionViewModal;
