import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import SchoolEventForm, { SchoolEventFormValues } from "@/components/forms/SchoolEventForm";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  isEditing: boolean;
  value: SchoolEventFormValues;
  onChange: (v: SchoolEventFormValues) => void;
  onSubmit: () => void;
}

const SchoolEventFormModal = ({ open, onOpenChange, isEditing, value, onChange, onSubmit }: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{isEditing ? "Edit School Event" : "Add School Event"}</DialogTitle>
      </DialogHeader>
      <SchoolEventForm value={value} onChange={onChange} />
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={onSubmit} disabled={!value.name || !value.startDate || !value.endDate}>{isEditing ? "Update" : "Add"} Event</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default SchoolEventFormModal;
