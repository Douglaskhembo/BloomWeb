import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import SupplierForm, { SupplierFormValues } from "@/components/forms/SupplierForm";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  isEditing: boolean;
  value: SupplierFormValues;
  onChange: (v: SupplierFormValues) => void;
  onSubmit: () => void;
}

const SupplierFormModal = ({ open, onOpenChange, isEditing, value, onChange, onSubmit }: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{isEditing ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
      </DialogHeader>
      <SupplierForm value={value} onChange={onChange} />
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={onSubmit} disabled={!value.name || !value.category}>{isEditing ? "Update" : "Add"} Supplier</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default SupplierFormModal;