import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import TermPeriodForm, { TermPeriodFormValues } from "@/components/forms/TermPeriodForm";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  isEditing: boolean;
  value: TermPeriodFormValues;
  onChange: (v: TermPeriodFormValues) => void;
  onSubmit: () => void;
  academicYears: number[];
}

const TermPeriodFormModal = ({ open, onOpenChange, isEditing, value, onChange, onSubmit, academicYears }: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{isEditing ? "Edit Term Period" : "Add Term Period"}</DialogTitle>
      </DialogHeader>
      <TermPeriodForm value={value} onChange={onChange} academicYears={academicYears} />
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={onSubmit} disabled={!value.startDate || !value.endDate}>{isEditing ? "Update" : "Add"} Term Period</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default TermPeriodFormModal;
