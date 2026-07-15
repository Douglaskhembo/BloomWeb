import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Search } from "lucide-react";

export type AssignItem = {
  id: number;
  label: string;
  description?: string;
};

interface AssignItemsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  items: AssignItem[];
  selectedIds: number[];
  onSave: (ids: number[]) => void;
  multiple?: boolean;
  searchPlaceholder?: string;
}

const AssignItemsModal = ({
  open,
  onOpenChange,
  title,
  description,
  items,
  selectedIds,
  onSave,
  multiple = true,
  searchPlaceholder = "Search...",
}: AssignItemsModalProps) => {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<number[]>(selectedIds);

  useEffect(() => {
    if (open) {
      setPicked(selectedIds);
      setQuery("");
    }
  }, [open, selectedIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        (i.description ?? "").toLowerCase().includes(q),
    );
  }, [items, query]);

  const toggle = (id: number) => {
    if (multiple) {
      setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    } else {
      setPicked([id]);
    }
  };

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((i) => picked.includes(i.id));

  const toggleAll = () => {
    if (!multiple) return;
    if (allFilteredSelected) {
      setPicked((prev) => prev.filter((id) => !filtered.some((i) => i.id === id)));
    } else {
      setPicked((prev) => Array.from(new Set([...prev, ...filtered.map((i) => i.id)])));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {multiple && filtered.length > 0 && (
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={toggleAll}
                className="text-primary hover:underline"
              >
                {allFilteredSelected ? "Clear filtered" : "Select all filtered"}
              </button>
              <span className="text-muted-foreground">{picked.length} selected</span>
            </div>
          )}

          <div className="max-h-72 overflow-y-auto rounded-md border divide-y">
            {filtered.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                No results found
              </div>
            ) : (
              filtered.map((item) => {
                const checked = picked.includes(item.id);
                return (
                  <label
                    key={item.id}
                    className="flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggle(item.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{item.label}</div>
                      {item.description && (
                        <div className="text-xs text-muted-foreground truncate">
                          {item.description}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSave(picked);
              onOpenChange(false);
            }}
          >
            Save {multiple ? `(${picked.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignItemsModal;