import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import HolidayForm, { HolidayFormValues } from "@/components/forms/HolidayForm";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  isEditing: boolean;
  value: HolidayFormValues;
  onChange: (v: HolidayFormValues) => void;
  onSubmit: () => void;
}

const HolidayFormModal = ({ open, onOpenChange, isEditing, value, onChange, onSubmit }: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{isEditing ? "Edit Holiday" : "Add Holiday"}</DialogTitle>
      </DialogHeader>
      <HolidayForm value={value} onChange={onChange} />
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={onSubmit} disabled={!value.name || !value.date}>{isEditing ? "Update" : "Add"} Holiday</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default HolidayFormModal;
