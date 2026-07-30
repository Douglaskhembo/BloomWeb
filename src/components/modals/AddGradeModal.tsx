import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Swal from "sweetalert2";
import {GradeFormValue} from "@/types/types";

interface AddGradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (value: GradeFormValue) => void;
  defaultOrder?: number;
  initialValues?: GradeFormValue;
}

const AddGradeModal = ({ open, onOpenChange, onSave, defaultOrder = 1, initialValues }: AddGradeModalProps) => {
  const [name, setName] = useState("");
  const [displayOrder, setOrder] = useState<number>(defaultOrder);
  const [streams, setStreams] = useState<number>(1);
  // Raw text buffer for the Streams input — kept separate from `streams` so the field can sit
  // empty mid-edit instead of a min-1 clamp snapping it back to "1" after every keystroke
  // (which made it impossible to clear the field to type a new number).
  const [streamsInput, setStreamsInput] = useState<string>("1");
  const [streamNames, setStreamNames] = useState<string[]>([]);
  const [capacity, setCapacity] = useState<string>("");
  const [streamCapacities, setStreamCapacities] = useState<string[]>([]);
  const [status, setStatus] = useState<"active" | "inactive">("active");

  useEffect(() => {
    if (open) {
      setName(initialValues?.name ?? "");
      setOrder(initialValues?.displayOrder ?? defaultOrder);
      setStreams(initialValues?.streams ?? 1);
      setStreamsInput(String(initialValues?.streams ?? 1));
      setStreamNames(initialValues?.streamNames ?? []);
      setCapacity(initialValues?.capacity ? String(initialValues.capacity) : "");
      setStreamCapacities((initialValues?.streamCapacities ?? []).map((c) => (c ? String(c) : "")));
      setStatus(initialValues?.status ?? "active");
    }
  }, [open, defaultOrder, initialValues]);

  // Keep the name/capacity-input lists in lockstep with the stream count — resize (not replace)
  // so values already typed survive bumping the count up or down.
  const setStreamCount = (count: number) => {
    setStreams(count);
    setStreamNames((prev) => {
      const next = prev.slice(0, count);
      while (next.length < count) next.push("");
      return next;
    });
    setStreamCapacities((prev) => {
      const next = prev.slice(0, count);
      while (next.length < count) next.push("");
      return next;
    });
  };

  const setStreamName = (index: number, value: string) => {
    setStreamNames((prev) => prev.map((n, i) => (i === index ? value : n)));
  };

  const setStreamCapacity = (index: number, value: string) => {
    setStreamCapacities((prev) => prev.map((c, i) => (i === index ? value : c)));
  };

  const submit = () => {
    if (!name.trim()) return;
    if (streams > 1) {
      const trimmed = streamNames.map((n) => n.trim());
      if (trimmed.length !== streams || trimmed.some((n) => !n)) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: `Name all ${streams} streams — one name per stream, none left blank`,
          showConfirmButton: true,
        });
        return;
      }
      const unique = new Set(trimmed.map((n) => n.toLowerCase()));
      if (unique.size !== trimmed.length) {
        Swal.fire({ icon: "error", title: "Error", text: "Stream names must be unique within this grade", showConfirmButton: true });
        return;
      }
      const caps = Array.from({ length: streams }, (_, i) => Number(streamCapacities[i]) || undefined);
      onSave({ name: name.trim(), displayOrder, streams, streamNames: trimmed, streamCapacities: caps as number[], status });
    } else {
      onSave({ name: name.trim(), displayOrder, streams, streamNames: [], capacity: Number(capacity) || undefined, status });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initialValues ? "Edit Grade Level" : "Add Grade Level"}</DialogTitle>
          <DialogDescription>Define a new class level for your school.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2 col-span-2">
            <Label>Grade Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Grade 1, PP1" />
          </div>
          <div className="space-y-2">
            <Label>Order</Label>
            <Input type="number" min={1} value={displayOrder} onChange={(e) => setOrder(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Streams</Label>
            <Input
              type="number"
              min={1}
              value={streamsInput}
              onChange={(e) => {
                const raw = e.target.value;
                setStreamsInput(raw);
                const n = Number(raw);
                if (raw !== "" && Number.isInteger(n) && n >= 1) setStreamCount(n);
              }}
              onBlur={() => {
                const n = Math.max(1, Math.floor(Number(streamsInput)) || 1);
                setStreamsInput(String(n));
                setStreamCount(n);
              }}
            />
          </div>

          {streams > 1 ? (
            <div className="space-y-2 col-span-2">
              <Label>Stream Names & Capacity</Label>
              <div className="space-y-2">
                {Array.from({ length: streams }).map((_, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      className="flex-1"
                      value={streamNames[i] ?? ""}
                      onChange={(e) => setStreamName(i, e.target.value)}
                      placeholder={`Stream ${i + 1} name, e.g. East`}
                    />
                    <Input
                      type="number"
                      min={0}
                      className="w-28"
                      value={streamCapacities[i] ?? ""}
                      onChange={(e) => setStreamCapacity(i, e.target.value)}
                      placeholder="Capacity"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Exactly {streams} name{streams === 1 ? "" : "s"} required — one per stream. Leave capacity blank for unlimited.
              </p>
            </div>
          ) : (
            <div className="space-y-2 col-span-2">
              <Label>Capacity</Label>
              <Input
                type="number"
                min={0}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="Leave blank for unlimited"
              />
            </div>
          )}

          <div className="space-y-2 col-span-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as "active" | "inactive")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Save Grade</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddGradeModal;
