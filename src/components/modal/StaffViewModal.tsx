import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Pencil, Trash2 } from "lucide-react";

export interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  idNumber: string;
  phone: string;
  email: string;
  address: string;
  practiceNumber: string;
  staffType: string;
  subject: string;
  grade: string;
  qualification: string;
  experience: string;
  joined: string;
  status: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  documents: { name: string; file: string }[];
}

interface StaffViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: StaffMember | null;
  onEdit: (staff: StaffMember) => void;
  onDelete: (staff: StaffMember) => void;
  onStatusChange: (staff: StaffMember, status: string) => void;
}

const StaffViewModal = ({ open, onOpenChange, staff, onEdit, onDelete, onStatusChange }: StaffViewModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Staff Details — {staff?.firstName} {staff?.lastName}</DialogTitle>
          <DialogDescription>Staff ID: {staff?.id}</DialogDescription>
        </DialogHeader>
        {staff && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => { onOpenChange(false); onEdit(staff); }}>
                <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
              </Button>
              <Select value={staff.status} onValueChange={(v) => onStatusChange(staff, v)}>
                <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Active", "On Leave", "Suspended", "Resigned", "Terminated"].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="destructive" onClick={() => { onDelete(staff); onOpenChange(false); }}>
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div><span className="text-muted-foreground">Full Name:</span> <span className="font-medium ml-1">{staff.firstName} {staff.lastName}</span></div>
              <div><span className="text-muted-foreground">Gender:</span> <span className="font-medium ml-1">{staff.gender}</span></div>
              <div><span className="text-muted-foreground">Date of Birth:</span> <span className="font-medium ml-1">{staff.dateOfBirth}</span></div>
              <div><span className="text-muted-foreground">ID Number:</span> <span className="font-medium ml-1">{staff.idNumber}</span></div>
              <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium ml-1">{staff.phone}</span></div>
              <div><span className="text-muted-foreground">Email:</span> <span className="font-medium ml-1">{staff.email}</span></div>
              <div><span className="text-muted-foreground">Address:</span> <span className="font-medium ml-1">{staff.address}</span></div>
              <div><span className="text-muted-foreground">Practice Number:</span> <span className="font-medium ml-1">{staff.practiceNumber}</span></div>
              <div><span className="text-muted-foreground">Staff Type:</span> <span className="font-medium ml-1">{staff.staffType}</span></div>
              <div><span className="text-muted-foreground">Subject:</span> <span className="font-medium ml-1">{staff.subject}</span></div>
              <div><span className="text-muted-foreground">Class:</span> <span className="font-medium ml-1">{staff.grade}</span></div>
              <div><span className="text-muted-foreground">Qualification:</span> <span className="font-medium ml-1">{staff.qualification}</span></div>
              <div><span className="text-muted-foreground">Experience:</span> <span className="font-medium ml-1">{staff.experience}</span></div>
              <div><span className="text-muted-foreground">Date Joined:</span> <span className="font-medium ml-1">{staff.joined}</span></div>
              <div><span className="text-muted-foreground">Status:</span> <Badge variant={staff.status === "Active" ? "default" : staff.status === "On Leave" ? "secondary" : "destructive"} className="text-[10px] ml-1">{staff.status}</Badge></div>
            </div>

            <div className="border-t pt-3">
              <h4 className="text-sm font-semibold mb-2">Emergency Contact</h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div><span className="text-muted-foreground">Name:</span> <span className="font-medium ml-1">{staff.emergencyContactName}</span></div>
                <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium ml-1">{staff.emergencyContactPhone}</span></div>
                <div><span className="text-muted-foreground">Relationship:</span> <span className="font-medium ml-1">{staff.emergencyContactRelationship}</span></div>
              </div>
            </div>

            {staff.documents.length > 0 && (
              <div className="border-t pt-3">
                <h4 className="text-sm font-semibold mb-2">Documents</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document Name</TableHead>
                      <TableHead>File</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staff.documents.map((doc, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm">{doc.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{doc.file}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="text-xs h-7">Preview</Button>
                          <Button variant="ghost" size="sm" className="text-xs h-7">Download</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StaffViewModal;