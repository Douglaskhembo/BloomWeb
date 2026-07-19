import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import BillForm, { BillFormValues } from "@/components/forms/BillForm";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  isEditing: boolean;
  value: BillFormValues;
  onChange: (v: BillFormValues) => void;
  onSubmit: () => void;
  suppliers: { id: number; name: string }[];
}

const BillFormModal = ({ open, onOpenChange, isEditing, value, onChange, onSubmit, suppliers }: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{isEditing ? "Edit Bill" : "Add Bill"}</DialogTitle>
      </DialogHeader>
      <BillForm value={value} onChange={onChange} suppliers={suppliers} />
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={onSubmit} disabled={!value.description || !value.amount || !value.dueDate || (!value.supplierId && !value.supplierName)}>
          {isEditing ? "Update" : "Add"} Bill
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default BillFormModal;
