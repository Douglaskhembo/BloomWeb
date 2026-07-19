import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface BillFormValues {
  supplierId: string;
  supplierName: string;
  description: string;
  amount: string;
  dueDate: string;
}

interface Props {
  value: BillFormValues;
  onChange: (v: BillFormValues) => void;
  suppliers: { id: number; name: string }[];
}

const MANUAL = "__manual__";

const BillForm = ({ value, onChange, suppliers }: Props) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="space-y-2 md:col-span-2">
      <Label>Supplier</Label>
      <Select
        value={value.supplierId || MANUAL}
        onValueChange={(v) => {
          if (v === MANUAL) { onChange({ ...value, supplierId: "", supplierName: "" }); return; }
          const s = suppliers.find((sup) => String(sup.id) === v);
          onChange({ ...value, supplierId: v, supplierName: s?.name ?? "" });
        }}
      >
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={MANUAL}>Other / type manually</SelectItem>
          {suppliers.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
    {!value.supplierId && (
      <div className="space-y-2 md:col-span-2">
        <Label>Supplier Name</Label>
        <Input value={value.supplierName} onChange={(e) => onChange({ ...value, supplierName: e.target.value })} placeholder="Type the supplier's name" />
      </div>
    )}
    <div className="space-y-2 md:col-span-2">
      <Label>Description</Label>
      <Textarea value={value.description} onChange={(e) => onChange({ ...value, description: e.target.value })} placeholder="e.g. Term 1 Textbooks - Grade 1-5" />
    </div>
    <div className="space-y-2">
      <Label>Amount (KES)</Label>
      <Input type="number" value={value.amount} onChange={(e) => onChange({ ...value, amount: e.target.value })} placeholder="e.g. 185000" />
    </div>
    <div className="space-y-2">
      <Label>Due Date</Label>
      <Input type="date" value={value.dueDate} onChange={(e) => onChange({ ...value, dueDate: e.target.value })} />
    </div>
  </div>
);

export default BillForm;
