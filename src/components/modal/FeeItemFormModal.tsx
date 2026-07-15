import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import FeeItemForm, { FeeItemFormValues } from "@/components/forms/FeeItemForm";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  isEditing: boolean;
  value: FeeItemFormValues;
  onChange: (v: FeeItemFormValues) => void;
  onSubmit: () => void;
}

const FeeItemFormModal = ({ open, onOpenChange, isEditing, value, onChange, onSubmit }: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{isEditing ? "Edit Fee Item" : "Add Fee Item"}</DialogTitle>
      </DialogHeader>
      <FeeItemForm value={value} onChange={onChange} />
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={onSubmit} disabled={!value.name || !value.amount}>{isEditing ? "Update" : "Add"} Fee Item</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default FeeItemFormModal;