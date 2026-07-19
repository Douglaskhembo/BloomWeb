import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface SupplierFormValues {
  name: string;
  category: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  kraPin: string;
  status: "Active" | "Inactive";
}

interface Props {
  value: SupplierFormValues;
  onChange: (v: SupplierFormValues) => void;
}

const SupplierForm = ({ value, onChange }: Props) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="space-y-2 md:col-span-2">
      <Label>Supplier Name</Label>
      <Input value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} />
    </div>
    <div className="space-y-2">
      <Label>Category</Label>
      <Input value={value.category} onChange={(e) => onChange({ ...value, category: e.target.value })} placeholder="e.g. Textbooks" />
    </div>
    <div className="space-y-2">
      <Label>Status</Label>
      <Select value={value.status} onValueChange={(v) => onChange({ ...value, status: v as "Active" | "Inactive" })}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="Active">Active</SelectItem>
          <SelectItem value="Inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div className="space-y-2">
      <Label>Contact Person</Label>
      <Input value={value.contactPerson} onChange={(e) => onChange({ ...value, contactPerson: e.target.value })} />
    </div>
    <div className="space-y-2">
      <Label>Phone</Label>
      <Input value={value.phone} onChange={(e) => onChange({ ...value, phone: e.target.value })} placeholder="+254 ..." />
    </div>
    <div className="space-y-2">
      <Label>Email</Label>
      <Input type="email" value={value.email} onChange={(e) => onChange({ ...value, email: e.target.value })} />
    </div>
    <div className="space-y-2">
      <Label>KRA PIN</Label>
      <Input value={value.kraPin} onChange={(e) => onChange({ ...value, kraPin: e.target.value })} placeholder="e.g. P051234567X" />
    </div>
    <div className="space-y-2 md:col-span-2">
      <Label>Address</Label>
      <Input value={value.address} onChange={(e) => onChange({ ...value, address: e.target.value })} />
    </div>
  </div>
);

export default SupplierForm;
