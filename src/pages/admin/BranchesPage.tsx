import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building2, ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import AddBranchModal, { BranchFormValue } from "@/components/modals/AddBranchModal";
import AssignItemsModal from "@/components/modals/AssignItemsModal";
import { SchoolApi } from "@/services/api";
import Pagination from "@/utils/Pagination";

interface Branch {
  uuid: string; name: string; code: string; location: string; phone: string; active: boolean;
  departmentUuids: string[]; gradeLevelUuids: string[];
}
interface Department { uuid: string; name: string; code: string; head: string; }
interface GradeLevel { uuid: string; name: string; order: number; streams: number; }

const BranchesPage = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [grades, setGrades] = useState<GradeLevel[]>([]);
  const [selected, setSelected] = useState<Branch | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [assignDeptOpen, setAssignDeptOpen] = useState(false);
  const [assignGradeOpen, setAssignGradeOpen] = useState(false);
  const [branchesPage, setBranchesPage] = useState(1);
  const [branchesPerPage, setBranchesPerPage] = useState(10);
  const [deptsPage, setDeptsPage] = useState(1);
  const [deptsPerPage, setDeptsPerPage] = useState(10);
  const [gradesPage, setGradesPage] = useState(1);
  const [gradesPerPage, setGradesPerPage] = useState(10);

  const loadBranches = () => SchoolApi.getBranches().then(d => setBranches(Array.isArray(d) ? d : []));

  useEffect(() => {
    loadBranches();
    SchoolApi.getDepartments().then(d => setDepartments(Array.isArray(d) ? d : []));
    SchoolApi.getGradeLevels().then(d => setGrades(Array.isArray(d) ? d : []));
  }, []);

  // keep selected in sync after reload
  useEffect(() => {
    if (selected) setSelected(branches.find((b) => b.uuid === selected.uuid) ?? null);
  }, [branches]);

  const handleSave = async (v: BranchFormValue) => {
    if (editing) {
      await SchoolApi.updateBranch(editing.uuid, { ...v, departmentUuids: editing.departmentUuids, gradeLevelUuids: editing.gradeLevelUuids });
    } else {
      await SchoolApi.createBranch({ ...v, departmentUuids: [], gradeLevelUuids: [] });
    }
    setEditing(null);
    loadBranches();
  };

  const handleToggle = async (uuid: string) => { await SchoolApi.toggleBranchStatus(uuid); loadBranches(); };
  const handleDelete = async (uuid: string) => { await SchoolApi.deleteBranch(uuid); loadBranches(); };

  const handleAssignDepts = async (ids: string[]) => {
    if (!selected) return;
    await SchoolApi.updateBranch(selected.uuid, { ...selected, departmentUuids: ids, gradeLevelUuids: selected.gradeLevelUuids });
    loadBranches();
  };

  const handleAssignGrades = async (ids: string[]) => {
    if (!selected) return;
    await SchoolApi.updateBranch(selected.uuid, { ...selected, departmentUuids: selected.departmentUuids, gradeLevelUuids: ids });
    loadBranches();
  };

  if (selected) {
    const assignedDepts = departments.filter((d) => selected.departmentUuids?.includes(d.uuid));
    const assignedGrades = grades.filter((g) => selected.gradeLevelUuids?.includes(g.uuid));
    const totalDeptPages = Math.ceil(assignedDepts.length / deptsPerPage);
    const pagedDepts = assignedDepts.slice((deptsPage - 1) * deptsPerPage, deptsPage * deptsPerPage);
    const totalGradePages = Math.ceil(assignedGrades.length / gradesPerPage);
    const pagedGrades = assignedGrades.slice((gradesPage - 1) * gradesPerPage, gradesPage * gradesPerPage);

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => { setSelected(null); setDeptsPage(1); setGradesPage(1); }}><ArrowLeft className="w-5 h-5" /></Button>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5" /> {selected.name}
                <Badge variant="outline">{selected.code}</Badge>
              </CardTitle>
              <CardDescription>{selected.location} · {selected.phone}</CardDescription>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => { setEditing(selected); setAddOpen(true); }}>
            <Pencil className="w-4 h-4 mr-1" /> Edit Branch
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Departments */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-sm">Departments ({assignedDepts.length})</h3>
              <Button size="sm" variant="outline" onClick={() => setAssignDeptOpen(true)}>
                <Plus className="w-4 h-4 mr-1" /> Assign
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Head</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedDepts.map((d) => (
                  <TableRow key={d.uuid}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell className="text-muted-foreground">{d.code}</TableCell>
                    <TableCell>{d.head}</TableCell>
                  </TableRow>
                ))}
                {assignedDepts.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">No departments assigned.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
            <Pagination currentPage={deptsPage} totalPages={totalDeptPages} onPageChange={setDeptsPage}
              itemsPerPage={deptsPerPage} onItemsPerPageChange={v => { setDeptsPerPage(v); setDeptsPage(1); }} />
          </div>

          {/* Grade Levels */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-sm">Grade Levels ({assignedGrades.length})</h3>
              <Button size="sm" variant="outline" onClick={() => setAssignGradeOpen(true)}>
                <Plus className="w-4 h-4 mr-1" /> Assign
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Grade Name</TableHead>
                  <TableHead className="text-center">Streams</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedGrades.map((g) => (
                  <TableRow key={g.uuid}>
                    <TableCell className="text-muted-foreground">{g.order}</TableCell>
                    <TableCell className="font-medium">{g.name}</TableCell>
                    <TableCell className="text-center">{g.streams}</TableCell>
                  </TableRow>
                ))}
                {assignedGrades.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">No grade levels assigned.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
            <Pagination currentPage={gradesPage} totalPages={totalGradePages} onPageChange={setGradesPage}
              itemsPerPage={gradesPerPage} onItemsPerPageChange={v => { setGradesPerPage(v); setGradesPage(1); }} />
          </div>
        </CardContent>

        <AssignItemsModal
          open={assignDeptOpen}
          onOpenChange={setAssignDeptOpen}
          title={`Assign Departments — ${selected.name}`}
          searchPlaceholder="Search departments..."
          items={departments.map((d) => ({ id: d.uuid, label: d.name, description: `${d.code} · Head: ${d.head}` }))}
          selectedIds={selected.departmentUuids ?? []}
          onSave={handleAssignDepts}
        />
        <AssignItemsModal
          open={assignGradeOpen}
          onOpenChange={setAssignGradeOpen}
          title={`Assign Grade Levels — ${selected.name}`}
          searchPlaceholder="Search grade levels..."
          items={grades.map((g) => ({ id: g.uuid, label: g.name, description: `Order ${g.order} · ${g.streams} stream(s)` }))}
          selectedIds={selected.gradeLevelUuids ?? []}
          onSave={handleAssignGrades}
        />
        <AddBranchModal
          open={addOpen}
          onOpenChange={(o) => { setAddOpen(o); if (!o) setEditing(null); }}
          initialValues={editing ? { name: editing.name, code: editing.code, location: editing.location, phone: editing.phone, status: editing.active ? "active" : "inactive" } : undefined}
          onSave={handleSave}
        />
      </Card>
    );
  }

  const totalBranchPages = Math.ceil(branches.length / branchesPerPage);
  const pagedBranches = branches.slice((branchesPage - 1) * branchesPerPage, branchesPage * branchesPerPage);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg flex items-center gap-2"><Building2 className="w-5 h-5" /> Branches</CardTitle>
          <CardDescription>Click a branch to assign departments and grade levels.</CardDescription>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setAddOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Add Branch
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Branch Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-center">Depts</TableHead>
              <TableHead className="text-center">Grades</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedBranches.map((b) => (
              <TableRow key={b.uuid} className="cursor-pointer hover:bg-muted/40" onClick={() => { setSelected(b); setDeptsPage(1); setGradesPage(1); }}>
                <TableCell className="font-medium text-primary">{b.name}</TableCell>
                <TableCell className="text-muted-foreground">{b.code}</TableCell>
                <TableCell>{b.location}</TableCell>
                <TableCell>{b.phone}</TableCell>
                <TableCell className="text-center">{b.departmentUuids?.length ?? 0}</TableCell>
                <TableCell className="text-center">{b.gradeLevelUuids?.length ?? 0}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={b.active ? "default" : "secondary"}>{b.active ? "Active" : "Inactive"}</Badge>
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" className="h-8" onClick={() => handleToggle(b.uuid)}>
                      {b.active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(b); setAddOpen(true); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(b.uuid)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {branches.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No branches yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        <Pagination currentPage={branchesPage} totalPages={totalBranchPages} onPageChange={setBranchesPage}
          itemsPerPage={branchesPerPage} onItemsPerPageChange={v => { setBranchesPerPage(v); setBranchesPage(1); }} />
      </CardContent>

      <AddBranchModal
        open={addOpen}
        onOpenChange={(o) => { setAddOpen(o); if (!o) setEditing(null); }}
        initialValues={editing ? { name: editing.name, code: editing.code, location: editing.location, phone: editing.phone, status: editing.active ? "active" : "inactive" } : undefined}
        onSave={handleSave}
      />
    </Card>
  );
};

export default BranchesPage;
