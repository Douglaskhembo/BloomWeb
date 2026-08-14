import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import LeaveTypeForm, { LeaveTypeFormValues } from "@/components/forms/LeaveTypeForm";

interface LeaveTypeFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  value: LeaveTypeFormValues;
  onChange: (v: LeaveTypeFormValues) => void;
  allDocumentTypes: string[];
  onSubmit: () => void;
}

const LeaveTypeFormModal = ({ open, onOpenChange, isEditing, value, onChange, allDocumentTypes, onSubmit }: LeaveTypeFormModalProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{isEditing ? "Edit Leave Type" : "Add Leave Type"}</DialogTitle>
      </DialogHeader>
      <LeaveTypeForm value={value} onChange={onChange} allDocumentTypes={allDocumentTypes} />
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button
          onClick={onSubmit}
          disabled={
            (value.requiresDocument && value.documentTypes.length === 0) ||
            (value.carryForwardAllowed && Number(value.maxCarryForwardDays || 0) > Number(value.days || 0))
          }
        >
          {isEditing ? "Update" : "Add"} Leave Type
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default LeaveTypeFormModal;