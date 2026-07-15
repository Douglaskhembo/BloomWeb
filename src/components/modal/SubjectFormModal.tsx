import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import SubjectForm, { SubjectFormValues } from "@/components/forms/SubjectForm";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  isEditing: boolean;
  value: SubjectFormValues;
  onChange: (v: SubjectFormValues) => void;
  onSubmit: () => void;
}

const SubjectFormModal = ({ open, onOpenChange, isEditing, value, onChange, onSubmit }: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{isEditing ? "Edit Subject" : "Add Subject"}</DialogTitle>
      </DialogHeader>
      <SubjectForm value={value} onChange={onChange} />
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={onSubmit} disabled={!value.name || !value.code}>{isEditing ? "Update" : "Add"} Subject</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default SubjectFormModal;