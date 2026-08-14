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
  gradeOptions: string[];
}

const FeeItemFormModal = ({ open, onOpenChange, isEditing, value, onChange, onSubmit, gradeOptions }: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{isEditing ? "Edit Fee Item" : "Add Fee Item"}</DialogTitle>
      </DialogHeader>
      <FeeItemForm value={value} onChange={onChange} gradeOptions={gradeOptions} />
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button
          onClick={onSubmit}
          disabled={
            !value.name ||
            (value.term === "Per Term"
              ? !value.term1Amount || !value.term2Amount || !value.term3Amount
              : !value.amount)
          }
        >
          {isEditing ? "Update" : "Add"} Fee Item
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default FeeItemFormModal;