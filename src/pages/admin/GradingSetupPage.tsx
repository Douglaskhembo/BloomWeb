import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Pencil, Trash2, Copy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import Pagination from "@/utils/Pagination";

interface GradeEntry {
  label: string;
  minScore: number;
  maxScore: number;
  points: number;
  remark: string;
}

interface GradingStructure {
  grade: string;
  entries: GradeEntry[];
}

const kcseEntries: GradeEntry[] = [
  { label: "A", minScore: 80, maxScore: 100, points: 12, remark: "Excellent" },
  { label: "A-", minScore: 75, maxScore: 79, points: 11, remark: "Very Good" },
  { label: "B+", minScore: 70, maxScore: 74, points: 10, remark: "Good" },
  { label: "B", minScore: 65, maxScore: 69, points: 9, remark: "Fairly Good" },
  { label: "B-", minScore: 60, maxScore: 64, points: 8, remark: "Good Average" },
  { label: "C+", minScore: 55, maxScore: 59, points: 7, remark: "Average" },
  { label: "C", minScore: 50, maxScore: 54, points: 6, remark: "Fair" },
  { label: "C-", minScore: 45, maxScore: 49, points: 5, remark: "Below Average" },
  { label: "D+", minScore: 40, maxScore: 44, points: 4, remark: "Below Average" },
  { label: "D", minScore: 35, maxScore: 39, points: 3, remark: "Weak" },
  { label: "D-", minScore: 30, maxScore: 34, points: 2, remark: "Very Weak" },
  { label: "E", minScore: 0, maxScore: 29, points: 1, remark: "Very Poor" },
];

const cbcEntries: GradeEntry[] = [
  { label: "EE", minScore: 76, maxScore: 100, points: 4, remark: "Exceeding Expectation" },
  { label: "ME", minScore: 51, maxScore: 75, points: 3, remark: "Meeting Expectation" },
  { label: "AE", minScore: 26, maxScore: 50, points: 2, remark: "Approaching Expectation" },
  { label: "BE", minScore: 0, maxScore: 25, points: 1, remark: "Below Expectation" },
];

const igcseEntries: GradeEntry[] = [
  { label: "A*", minScore: 90, maxScore: 100, points: 9, remark: "Outstanding" },
  { label: "A", minScore: 80, maxScore: 89, points: 8, remark: "Excellent" },
  { label: "B", minScore: 70, maxScore: 79, points: 7, remark: "Very Good" },
  { label: "C", minScore: 60, maxScore: 69, points: 6, remark: "Good" },
  { label: "D", minScore: 50, maxScore: 59, points: 5, remark: "Satisfactory" },
  { label: "E", minScore: 40, maxScore: 49, points: 4, remark: "Pass" },
  { label: "F", minScore: 30, maxScore: 39, points: 3, remark: "Weak" },
  { label: "G", minScore: 20, maxScore: 29, points: 2, remark: "Very Weak" },
  { label: "U", minScore: 0, maxScore: 19, points: 1, remark: "Ungraded" },
];

const ibEntries: GradeEntry[] = [
  { label: "7", minScore: 85, maxScore: 100, points: 7, remark: "Excellent" },
  { label: "6", minScore: 75, maxScore: 84, points: 6, remark: "Very Good" },
  { label: "5", minScore: 65, maxScore: 74, points: 5, remark: "Good" },
  { label: "4", minScore: 55, maxScore: 64, points: 4, remark: "Satisfactory" },
  { label: "3", minScore: 45, maxScore: 54, points: 3, remark: "Mediocre" },
  { label: "2", minScore: 35, maxScore: 44, points: 2, remark: "Poor" },
  { label: "1", minScore: 0, maxScore: 34, points: 1, remark: "Very Poor" },
];

const americanEntries: GradeEntry[] = [
  { label: "A", minScore: 90, maxScore: 100, points: 4, remark: "Excellent" },
  { label: "B", minScore: 80, maxScore: 89, points: 3, remark: "Good" },
  { label: "C", minScore: 70, maxScore: 79, points: 2, remark: "Average" },
  { label: "D", minScore: 60, maxScore: 69, points: 1, remark: "Below Average" },
  { label: "F", minScore: 0, maxScore: 59, points: 0, remark: "Fail" },
];

const curriculumPresets: Record<string, { name: string; entries: GradeEntry[] }> = {
  cbc: { name: "CBC (Kenya)", entries: cbcEntries },
  kcse: { name: "KCSE (Kenya)", entries: kcseEntries },
  igcse: { name: "Cambridge IGCSE", entries: igcseEntries },
  ib: { name: "IB (1–7)", entries: ibEntries },
  american: { name: "American (GPA)", entries: americanEntries },
};

const defaultEntries = kcseEntries;

const gradesList = [
  "PP1", "PP2", "Grade 1", "Grade 2", "Grade 3", "Grade 4",
  "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9",
];

const GradingSetupPage = () => {
  const navigate = useNavigate();
  const [structures, setStructures] = useState<GradingStructure[]>([
    { grade: "Grade 7", entries: [...defaultEntries] },
    { grade: "Grade 8", entries: [...defaultEntries] },
  ]);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [newGrade, setNewGrade] = useState("");
  const [newPreset, setNewPreset] = useState<string>("kcse");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [copyTargetGrade, setCopyTargetGrade] = useState("");
  const [entryForm, setEntryForm] = useState<GradeEntry>({
    label: "", minScore: 0, maxScore: 100, points: 0, remark: "",
  });
  const [entriesPage, setEntriesPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);

  const currentStructure = structures.find((s) => s.grade === selectedGrade);
  const gradesWithStructure = structures.map((s) => s.grade);
  const gradesWithoutStructure = gradesList.filter((g) => !gradesWithStructure.includes(g));

  const currentEntries = currentStructure?.entries ?? [];
  const totalEntryPages = Math.ceil(currentEntries.length / entriesPerPage);
  const pagedEntries = currentEntries.slice((entriesPage - 1) * entriesPerPage, entriesPage * entriesPerPage);

  const handleAddGrade = () => {
    if (!newGrade) return;
    const preset = curriculumPresets[newPreset] ?? curriculumPresets.kcse;
    setStructures((prev) => [...prev, { grade: newGrade, entries: preset.entries.map((e) => ({ ...e })) }]);
    Swal.fire({ title: "Grading added", text: `${preset.name} grading structure created for ${newGrade}.`, icon: "success", showConfirmButton: true });
    setNewGrade("");
    setDialogOpen(false);
  };

  const handleApplyPreset = (presetKey: string) => {
    if (!selectedGrade) return;
    const preset = curriculumPresets[presetKey];
    if (!preset) return;
    setStructures((prev) =>
      prev.map((s) =>
        s.grade === selectedGrade ? { ...s, entries: preset.entries.map((e) => ({ ...e })) } : s
      )
    );
    Swal.fire({ title: "Preset applied", text: `${preset.name} applied to ${selectedGrade}.`, icon: "success", showConfirmButton: true });
  };

  const handleDeleteGrade = (grade: string) => {
    setStructures((prev) => prev.filter((s) => s.grade !== grade));
    if (selectedGrade === grade) setSelectedGrade(null);
    Swal.fire({ title: "Removed", text: `Grading structure for ${grade} has been removed.`, icon: "success", showConfirmButton: true });
  };

  const handleOpenAddEntry = () => {
    setEntryForm({ label: "", minScore: 0, maxScore: 100, points: 0, remark: "" });
    setEditingIndex(null);
    setEntryDialogOpen(true);
  };

  const handleEditEntry = (index: number, entry: GradeEntry) => {
    setEntryForm({ ...entry });
    setEditingIndex(index);
    setEntryDialogOpen(true);
  };

  const handleSaveEntry = () => {
    if (!entryForm.label || !selectedGrade) return;
    setStructures((prev) =>
      prev.map((s) => {
        if (s.grade !== selectedGrade) return s;
        const entries = [...s.entries];
        if (editingIndex !== null) {
          entries[editingIndex] = { ...entryForm };
        } else {
          entries.push({ ...entryForm });
        }
        entries.sort((a, b) => b.minScore - a.minScore);
        return { ...s, entries };
      })
    );
    Swal.fire({ title: editingIndex !== null ? "Entry updated" : "Entry added", icon: "success", showConfirmButton: true });
    setEntryDialogOpen(false);
  };

  const handleDeleteEntry = (index: number) => {
    if (!selectedGrade) return;
    setStructures((prev) =>
      prev.map((s) =>
        s.grade === selectedGrade ? { ...s, entries: s.entries.filter((_, i) => i !== index) } : s
      )
    );
  };

  const handleCopyStructure = () => {
    if (!selectedGrade || !copyTargetGrade) return;
    const source = structures.find((s) => s.grade === selectedGrade);
    if (!source) return;
    setStructures((prev) => [...prev, { grade: copyTargetGrade, entries: source.entries.map((e) => ({ ...e })) }]);
    Swal.fire({ title: "Copied", text: `Grading structure copied from ${selectedGrade} to ${copyTargetGrade}.`, icon: "success", showConfirmButton: true });
    setCopyTargetGrade("");
    setCopyDialogOpen(false);
  };

  // Grade detail view
  if (selectedGrade && currentStructure) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => { setSelectedGrade(null); setEntriesPage(1); }}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Grading — {selectedGrade}</h1>
              <p className="text-muted-foreground">{currentStructure.entries.length} grade boundaries defined</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Select onValueChange={handleApplyPreset}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Apply preset" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(curriculumPresets).map(([key, p]) => (
                  <SelectItem key={key} value={key}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setCopyDialogOpen(true)}>
              <Copy className="w-3.5 h-3.5 mr-1" /> Copy to Grade
            </Button>
            <Button size="sm" onClick={handleOpenAddEntry}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Entry
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grade Label</TableHead>
                  <TableHead>Min Score</TableHead>
                  <TableHead>Max Score</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Remark</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedEntries.map((entry, i) => {
                  const actualIndex = (entriesPage - 1) * entriesPerPage + i;
                  return (
                  <TableRow key={actualIndex}>
                    <TableCell><Badge variant="outline" className="font-semibold">{entry.label}</Badge></TableCell>
                    <TableCell>{entry.minScore}%</TableCell>
                    <TableCell>{entry.maxScore}%</TableCell>
                    <TableCell>{entry.points}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{entry.remark}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditEntry(actualIndex, entry)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteEntry(actualIndex)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Pagination currentPage={entriesPage} totalPages={totalEntryPages} onPageChange={setEntriesPage}
              itemsPerPage={entriesPerPage} onItemsPerPageChange={v => { setEntriesPerPage(v); setEntriesPage(1); }} />
          </CardContent>
        </Card>

        {/* Add/Edit Entry Dialog */}
        <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingIndex !== null ? "Edit Grade Entry" : "Add Grade Entry"}</DialogTitle>
              <DialogDescription>Define score range and grade label</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Grade Label <span className="text-destructive">*</span></Label>
                  <Input value={entryForm.label} onChange={(e) => setEntryForm((p) => ({ ...p, label: e.target.value }))} placeholder="e.g. A, B+, C" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Points</Label>
                  <Input type="number" value={entryForm.points} onChange={(e) => setEntryForm((p) => ({ ...p, points: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Min Score (%)</Label>
                  <Input type="number" min={0} max={100} value={entryForm.minScore} onChange={(e) => setEntryForm((p) => ({ ...p, minScore: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Max Score (%)</Label>
                  <Input type="number" min={0} max={100} value={entryForm.maxScore} onChange={(e) => setEntryForm((p) => ({ ...p, maxScore: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Remark</Label>
                <Input value={entryForm.remark} onChange={(e) => setEntryForm((p) => ({ ...p, remark: e.target.value }))} placeholder="e.g. Excellent, Good, Fair" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setEntryDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveEntry}>{editingIndex !== null ? "Update" : "Add"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Copy to Grade Dialog */}
        <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Copy Grading Structure</DialogTitle>
              <DialogDescription>Copy {selectedGrade}'s grading to another grade</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Target Grade</Label>
                <Select value={copyTargetGrade} onValueChange={setCopyTargetGrade}>
                  <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                  <SelectContent>
                    {gradesWithoutStructure.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCopyStructure}>Copy</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/management")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Grading Structure</h1>
            <p className="text-muted-foreground">Configure grade boundaries per grade level</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Grade
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {structures.map((s) => (
          <Card key={s.grade} className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all" onClick={() => setSelectedGrade(s.grade)}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{s.grade}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{s.entries.length} grade boundaries</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {s.entries.slice(0, 6).map((e) => (
                      <Badge key={e.label} variant="outline" className="text-[10px]">{e.label}</Badge>
                    ))}
                    {s.entries.length > 6 && <Badge variant="secondary" className="text-[10px]">+{s.entries.length - 6}</Badge>}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteGrade(s.grade); }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Grade Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Grading Structure</DialogTitle>
            <DialogDescription>Select a grade and a curriculum preset to start from</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Grade Level</Label>
              <Select value={newGrade} onValueChange={setNewGrade}>
                <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                <SelectContent>
                  {gradesWithoutStructure.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Curriculum Preset</Label>
              <Select value={newPreset} onValueChange={setNewPreset}>
                <SelectTrigger><SelectValue placeholder="Select preset" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(curriculumPresets).map(([key, p]) => (
                    <SelectItem key={key} value={key}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddGrade}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GradingSetupPage;
