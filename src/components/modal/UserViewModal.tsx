import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Pencil, Trash2 } from "lucide-react";

export interface SystemUser {
  id: number;
  staffId: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLogin: string;
}

interface UserViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: SystemUser | null;
  onEdit: (u: SystemUser) => void;
  onDelete: (u: SystemUser) => void;
  onStatusChange: (u: SystemUser, status: string) => void;
}

const UserViewModal = ({ open, onOpenChange, user, onEdit, onDelete, onStatusChange }: UserViewModalProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>User Details</DialogTitle>
        <DialogDescription>Staff ID: {user?.staffId}</DialogDescription>
      </DialogHeader>
      {user && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => { onOpenChange(false); onEdit(user); }}>
              <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
            </Button>
            <Select value={user.status} onValueChange={(v) => onStatusChange(user, v)}>
              <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Active", "Inactive", "Suspended"].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="destructive" onClick={() => { onDelete(user); onOpenChange(false); }}>
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div><span className="text-muted-foreground">Name:</span> <span className="font-medium ml-1">{user.name}</span></div>
            <div><span className="text-muted-foreground">Email:</span> <span className="font-medium ml-1">{user.email}</span></div>
            <div><span className="text-muted-foreground">Staff ID:</span> <span className="font-medium ml-1">{user.staffId}</span></div>
            <div><span className="text-muted-foreground">Role:</span> <span className="font-medium ml-1">{user.role || "Not assigned"}</span></div>
            <div><span className="text-muted-foreground">Status:</span> <Badge variant={user.status === "Active" ? "default" : "secondary"} className="text-[10px] ml-1">{user.status}</Badge></div>
            <div><span className="text-muted-foreground">Last Login:</span> <span className="font-medium ml-1">{user.lastLogin}</span></div>
          </div>
        </div>
      )}
    </DialogContent>
  </Dialog>
);

export default UserViewModal;