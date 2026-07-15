import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import StaffSalaryForm from "@/components/forms/StaffSalaryForm";
import type { StaffSalary } from "@/context/PayrollContext";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  staffName: string;
  value: StaffSalary;
  onChange: (v: StaffSalary) => void;
  onSubmit: () => void;
}

const StaffSalaryModal = ({ open, onOpenChange, staffName, value, onChange, onSubmit }: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Salary Configuration — {staffName}</DialogTitle>
        <DialogDescription>Set basic pay, allowances and deductions. Statutory items compute automatically.</DialogDescription>
      </DialogHeader>
      <StaffSalaryForm value={value} onChange={onChange} />
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={onSubmit} disabled={!value.basic}>Save Salary</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default StaffSalaryModal;