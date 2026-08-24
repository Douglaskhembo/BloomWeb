import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export interface ChecklistRow {
  studentUuid: string;
  admissionNumber: string;
  name: string;
  status: string | null;
  remarks?: string;
}

export interface StatusOption {
  value: string;
  label: string;
  activeClassName: string;
}

interface AttendanceChecklistProps {
  rows: ChecklistRow[];
  statusOptions: StatusOption[];
  onStatusChange: (studentUuid: string, status: string) => void;
  onRemarksChange?: (studentUuid: string, remarks: string) => void;
  showRemarks?: boolean;
  extraColumnLabel?: string;
  extraColumn?: (row: ChecklistRow) => React.ReactNode;
}

/** Shared "take attendance" checklist — used for class registers and bus boarding registers alike. */
const AttendanceChecklist = ({
  rows, statusOptions, onStatusChange, onRemarksChange, showRemarks, extraColumnLabel, extraColumn,
}: AttendanceChecklistProps) => {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No students to mark.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Adm No</TableHead>
          <TableHead>Student</TableHead>
          {extraColumnLabel && <TableHead>{extraColumnLabel}</TableHead>}
          <TableHead>Status</TableHead>
          {showRemarks && <TableHead>Remarks</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => (
          <TableRow key={row.studentUuid} className={cn(!row.status && "bg-amber-50 dark:bg-amber-950/20")}>
            <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
            <TableCell className="font-mono text-xs">{row.admissionNumber}</TableCell>
            <TableCell className="font-medium">{row.name}</TableCell>
            {extraColumn && <TableCell className="text-sm text-muted-foreground">{extraColumn(row)}</TableCell>}
            <TableCell>
              <ToggleGroup
                type="single"
                size="sm"
                value={row.status ?? undefined}
                onValueChange={(v) => { if (v) onStatusChange(row.studentUuid, v); }}
              >
                {statusOptions.map((opt) => (
                  <ToggleGroupItem
                    key={opt.value}
                    value={opt.value}
                    className={cn("text-xs px-2", row.status === opt.value && opt.activeClassName)}
                  >
                    {opt.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </TableCell>
            {showRemarks && (
              <TableCell>
                <Input
                  className="h-8 text-xs w-40"
                  placeholder="Optional"
                  value={row.remarks ?? ""}
                  onChange={(e) => onRemarksChange?.(row.studentUuid, e.target.value)}
                />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default AttendanceChecklist;
