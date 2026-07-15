import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, Pencil, Trash2, Save, Upload, X, Building2, Network, Power } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";
import { useState, useRef } from "react";
import AssignItemsModal from "@/components/modals/AssignItemsModal";
import AddGradeModal, { GradeFormValue } from "@/components/modals/AddGradeModal";
import AddDepartmentModal, { DepartmentFormValue } from "@/components/modals/AddDepartmentModal";
import AddBranchModal, { BranchFormValue } from "@/components/modals/AddBranchModal";

const initialGradeLevels = [
  { id: 1, name: "PP1", order: 1, streams: 1, status: "active" },
  { id: 2, name: "PP2", order: 2, streams: 1, status: "active" },
  { id: 3, name: "Grade 1", order: 3, streams: 1, status: "active" },
  { id: 4, name: "Grade 2", order: 4, streams: 1, status: "active" },
  { id: 5, name: "Grade 3", order: 5, streams: 1, status: "active" },
  { id: 6, name: "Grade 4", order: 6, streams: 1, status: "active" },
  { id: 7, name: "Grade 5", order: 7, streams: 1, status: "active" },
  { id: 8, name: "Grade 6", order: 8, streams: 1, status: "active" },
  { id: 9, name: "Grade 7", order: 9, streams: 1, status: "active" },
  { id: 10, name: "Grade 8", order: 10, streams: 1, status: "active" },
  { id: 11, name: "Grade 9", order: 11, streams: 1, status: "active" },
];

const initialBranches = [
  { id: 1, name: "Main Campus", code: "MAIN", location: "Westlands, Nairobi", phone: "+254 700 123 456", status: "active", departmentIds: [1, 2, 3], gradeLevelIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  { id: 2, name: "Karen Branch", code: "KRN", location: "Karen, Nairobi", phone: "+254 711 222 333", status: "active", departmentIds: [1, 3], gradeLevelIds: [1, 2, 3, 4, 5, 6] },
  { id: 3, name: "Mombasa Branch", code: "MSA", location: "Nyali, Mombasa", phone: "+254 722 444 555", status: "active", departmentIds: [2, 4], gradeLevelIds: [3, 4, 5, 6, 7, 8] },
];

const initialDepartments = [
  { id: 1, name: "Academics", code: "ACAD", head: "Jane Mwangi", status: "active" },
  { id: 2, name: "Finance", code: "FIN", head: "Peter Otieno", status: "active" },
  { id: 3, name: "Human Resources", code: "HR", head: "Mary Wanjiku", status: "active" },
  { id: 4, name: "Administration", code: "ADM", head: "Alice Achieng", status: "active" },
];

const SchoolSetupPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [branches, setBranches] = useState(initialBranches);
  const [departments, setDepartments] = useState(initialDepartments);
  const [gradeLevels, setGradeLevels] = useState(initialGradeLevels);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [assignDeptOpen, setAssignDeptOpen] = useState(false);
  const [assignGradeOpen, setAssignGradeOpen] = useState(false);
  const [addGradeOpen, setAddGradeOpen] = useState(false);
  const [addDeptOpen, setAddDeptOpen] = useState(false);
  const [addBranchOpen, setAddBranchOpen] = useState(false);

  const [activeAssignments, setActiveAssignments] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    initialBranches.forEach((b) => {
      b.departmentIds.forEach((id) => { init[`${b.id}-dept-${id}`] = true; });
      b.gradeLevelIds.forEach((id) => { init[`${b.id}-grade-${id}`] = true; });
    });
    return init;
  });

  const isAssignmentActive = (branchId: number, type: "dept" | "grade", itemId: number) =>
    activeAssignments[`${branchId}-${type}-${itemId}`] !== false;

  const toggleAssignment = (branchId: number, type: "dept" | "grade", itemId: number) => {
    const key = `${branchId}-${type}-${itemId}`;
    setActiveAssignments((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectedBranch = branches.find((b) => b.id === selectedBranchId) ?? null;
  const deptName = (id: number) => departments.find((d) => d.id === id)?.name ?? "—";
  const gradeName = (id: number) => gradeLevels.find((g) => g.id === id)?.name ?? "—";

  const updateBranch = (id: number, patch: Partial<typeof initialBranches[number]>) => {
    setBranches((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const handleAddGrade = (v: GradeFormValue) => {
    setGradeLevels((prev) => [...prev, { id: Date.now(), ...v }]);
  };
  const handleAddDepartment = (v: DepartmentFormValue) => {
    setDepartments((prev) => [...prev, { id: Date.now(), ...v }]);
  };
  const handleAddBranch = (v: BranchFormValue) => {
    setBranches((prev) => [...prev, { id: Date.now(), ...v, departmentIds: [], gradeLevelIds: [] }]);
  };

  const toggleGradeStatus = (id: number) => {
    setGradeLevels((prev) => prev.map((g) => g.id === id ? { ...g, status: g.status === "active" ? "inactive" : "active" } : g));
  };
  const toggleDepartmentStatus = (id: number) => {
    setDepartments((prev) => prev.map((d) => d.id === id ? { ...d, status: d.status === "active" ? "inactive" : "active" } : d));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/system-setups")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">School Setup</h1>
          <p className="text-muted-foreground">Manage school information and grade structure</p>
        </div>
      </div>

      <Tabs defaultValue="bio-data">
        <TabsList>
          <TabsTrigger value="bio-data">Bio Data</TabsTrigger>
          <TabsTrigger value="grade-levels">Grade Levels</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="branches">Branches</TabsTrigger>
        </TabsList>

        <TabsContent value="bio-data" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">School Information</CardTitle>
              <CardDescription>Basic details about your school</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Logo Upload */}
              <div className="flex items-center gap-6 mb-8 pb-6 border-b">
                <div className="relative">
                  <div
                    className="w-24 h-24 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center overflow-hidden bg-muted/50 cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {logoPreview ? (
                      <img src={logoPreview} alt="School logo" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <Upload className="w-8 h-8 text-muted-foreground/50" />
                    )}
                  </div>
                  {logoPreview && (
                    <button
                      onClick={() => setLogoPreview(null)}
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium">School Logo</Label>
                  <p className="text-xs text-muted-foreground mt-1">Upload a logo (PNG, JPG). Recommended 200×200px.</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-3 h-3 mr-1" /> Choose File
                  </Button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>School Name</Label>
                  <Input defaultValue="Greenfield Academy" />
                </div>
                <div className="space-y-2">
                  <Label>Registration Number</Label>
                  <Input defaultValue="SCH-2024-001" />
                </div>
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input type="email" defaultValue="info@greenfield.ac.ke" />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input defaultValue="+254 700 123 456" />
                </div>
                <div className="space-y-2">
                  <Label>County</Label>
                  <Input defaultValue="Nairobi" />
                </div>
                <div className="space-y-2">
                  <Label>Sub-County</Label>
                  <Input defaultValue="Westlands" />
                </div>
                <div className="space-y-2">
                  <Label>Postal Address</Label>
                  <Input defaultValue="P.O. Box 12345-00100, Nairobi" />
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input defaultValue="www.greenfield.ac.ke" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Physical Address</Label>
                  <Input defaultValue="Westlands Road, Off Waiyaki Way" />
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <Button><Save className="w-4 h-4 mr-1" /> Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grade-levels" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Grade Levels</CardTitle>
                <CardDescription>Define all class levels — the system adapts to your school's structure</CardDescription>
              </div>
              <Button size="sm" onClick={() => setAddGradeOpen(true)}><Plus className="w-4 h-4 mr-1" /> Add Grade</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Grade Name</TableHead>
                    <TableHead className="text-center">Streams</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gradeLevels.map((level) => (
                    <TableRow key={level.id}>
                      <TableCell className="text-muted-foreground">{level.order}</TableCell>
                      <TableCell className="font-medium">{level.name}</TableCell>
                      <TableCell className="text-center">{level.streams}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={level.status === "active" ? "default" : "secondary"}>
                          {level.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-8" onClick={() => toggleGradeStatus(level.id)}>
                            <Power className="w-3.5 h-3.5 mr-1" />
                            {level.status === "active" ? "Deactivate" : "Activate"}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Network className="w-5 h-5" /> Departments
                </CardTitle>
                <CardDescription>Define departments at school level. Assign them to branches from the Branches tab.</CardDescription>
              </div>
              <Button size="sm" onClick={() => setAddDeptOpen(true)}><Plus className="w-4 h-4 mr-1" /> Add Department</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Department Head</TableHead>
                    <TableHead className="text-center">Branches</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="text-muted-foreground">{d.code}</TableCell>
                      <TableCell>{d.head}</TableCell>
                      <TableCell className="text-center">
                        {branches.filter((b) => b.departmentIds.includes(d.id)).length}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={d.status === "active" ? "default" : "secondary"}>{d.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-8" onClick={() => toggleDepartmentStatus(d.id)}>
                            <Power className="w-3.5 h-3.5 mr-1" />
                            {d.status === "active" ? "Deactivate" : "Activate"}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branches" className="mt-4">
          {selectedBranch ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={() => setSelectedBranchId(null)}>
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="w-5 h-5" /> {selectedBranch.name}
                      <Badge variant="outline">{selectedBranch.code}</Badge>
                    </CardTitle>
                    <CardDescription>{selectedBranch.location} · {selectedBranch.phone}</CardDescription>
                  </div>
                </div>
                <Button size="sm" variant="outline"><Pencil className="w-4 h-4 mr-1" /> Edit Branch</Button>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="branch-departments">
                  <TabsList>
                    <TabsTrigger value="branch-departments">Departments ({selectedBranch.departmentIds.length})</TabsTrigger>
                    <TabsTrigger value="branch-grades">Grade Levels ({selectedBranch.gradeLevelIds.length})</TabsTrigger>
                  </TabsList>

                  <TabsContent value="branch-departments" className="mt-4">
                    <div className="flex justify-end mb-3">
                      <Button size="sm" variant="outline" onClick={() => setAssignDeptOpen(true)}>
                        <Plus className="w-4 h-4 mr-1" /> Assign Departments
                      </Button>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Department</TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead>Head</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedBranch.departmentIds.map((id) => {
                          const d = departments.find((x) => x.id === id);
                          if (!d) return null;
                          const active = isAssignmentActive(selectedBranch.id, "dept", id);
                          return (
                            <TableRow key={id}>
                              <TableCell className="font-medium">{d.name}</TableCell>
                              <TableCell className="text-muted-foreground">{d.code}</TableCell>
                              <TableCell>{d.head}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant={active ? "default" : "secondary"}>{active ? "Active" : "Inactive"}</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="sm" onClick={() => toggleAssignment(selectedBranch.id, "dept", id)}>
                                  {active ? "Deactivate" : "Activate"}
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                                  onClick={() => {
                                    updateBranch(selectedBranch.id, { departmentIds: selectedBranch.departmentIds.filter((x) => x !== id) });
                                    setActiveAssignments((prev) => {
                                      const next = { ...prev };
                                      delete next[`${selectedBranch.id}-dept-${id}`];
                                      return next;
                                    });
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {selectedBranch.departmentIds.length === 0 && (
                          <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No departments assigned yet.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TabsContent>

                  <TabsContent value="branch-grades" className="mt-4">
                    <div className="flex justify-end mb-3">
                      <Button size="sm" variant="outline" onClick={() => setAssignGradeOpen(true)}>
                        <Plus className="w-4 h-4 mr-1" /> Assign Grade Levels
                      </Button>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order</TableHead>
                          <TableHead>Grade Name</TableHead>
                          <TableHead className="text-center">Streams</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedBranch.gradeLevelIds.map((id) => {
                          const g = gradeLevels.find((x) => x.id === id);
                          if (!g) return null;
                          const active = isAssignmentActive(selectedBranch.id, "grade", id);
                          return (
                            <TableRow key={id}>
                              <TableCell className="text-muted-foreground">{g.order}</TableCell>
                              <TableCell className="font-medium">{g.name}</TableCell>
                              <TableCell className="text-center">{g.streams}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant={active ? "default" : "secondary"}>{active ? "Active" : "Inactive"}</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="sm" onClick={() => toggleAssignment(selectedBranch.id, "grade", id)}>
                                  {active ? "Deactivate" : "Activate"}
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                                  onClick={() => {
                                    updateBranch(selectedBranch.id, { gradeLevelIds: selectedBranch.gradeLevelIds.filter((x) => x !== id) });
                                    setActiveAssignments((prev) => {
                                      const next = { ...prev };
                                      delete next[`${selectedBranch.id}-grade-${id}`];
                                      return next;
                                    });
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {selectedBranch.gradeLevelIds.length === 0 && (
                          <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No grade levels assigned yet.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5" /> Branches
                </CardTitle>
                <CardDescription>
                  Manage school branches. Click a branch to assign departments and grade levels.
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => setAddBranchOpen(true)}><Plus className="w-4 h-4 mr-1" /> Add Branch</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Branch Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-center">Departments</TableHead>
                    <TableHead className="text-center">Grades</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branches.map((b) => (
                    <TableRow key={b.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelectedBranchId(b.id)}>
                      <TableCell className="font-medium text-primary">{b.name}</TableCell>
                      <TableCell className="text-muted-foreground">{b.code}</TableCell>
                      <TableCell>{b.location}</TableCell>
                      <TableCell>{b.phone}</TableCell>
                      <TableCell className="text-center">{b.departmentIds.length}</TableCell>
                      <TableCell className="text-center">{b.gradeLevelIds.length}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={b.status === "active" ? "default" : "secondary"}>{b.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          )}
        </TabsContent>
      </Tabs>

      <AddGradeModal
        open={addGradeOpen}
        onOpenChange={setAddGradeOpen}
        defaultOrder={gradeLevels.length + 1}
        onSave={handleAddGrade}
      />
      <AddDepartmentModal
        open={addDeptOpen}
        onOpenChange={setAddDeptOpen}
        onSave={handleAddDepartment}
      />
      <AddBranchModal
        open={addBranchOpen}
        onOpenChange={setAddBranchOpen}
        onSave={handleAddBranch}
      />

      {selectedBranch && (
        <>
          <AssignItemsModal
            open={assignDeptOpen}
            onOpenChange={setAssignDeptOpen}
            title={`Assign Departments — ${selectedBranch.name}`}
            description="Select one or more departments to assign to this branch."
            searchPlaceholder="Search departments..."
            items={departments.map((d) => ({
              id: d.id,
              label: d.name,
              description: `${d.code} · Head: ${d.head}`,
            }))}
            selectedIds={selectedBranch.departmentIds}
            onSave={(ids) => {
              updateBranch(selectedBranch.id, { departmentIds: ids });
              setActiveAssignments((prev) => {
                const next = { ...prev };
                ids.forEach((id) => {
                  const key = `${selectedBranch.id}-dept-${id}`;
                  if (!(key in next)) next[key] = true;
                });
                return next;
              });
            }}
          />
          <AssignItemsModal
            open={assignGradeOpen}
            onOpenChange={setAssignGradeOpen}
            title={`Assign Grade Levels — ${selectedBranch.name}`}
            description="Select one or more grade levels offered at this branch."
            searchPlaceholder="Search grade levels..."
            items={gradeLevels.map((g) => ({
              id: g.id,
              label: g.name,
              description: `Order ${g.order} · ${g.streams} stream${g.streams === 1 ? "" : "s"}`,
            }))}
            selectedIds={selectedBranch.gradeLevelIds}
            onSave={(ids) => {
              updateBranch(selectedBranch.id, { gradeLevelIds: ids });
              setActiveAssignments((prev) => {
                const next = { ...prev };
                ids.forEach((id) => {
                  const key = `${selectedBranch.id}-grade-${id}`;
                  if (!(key in next)) next[key] = true;
                });
                return next;
              });
            }}
          />
        </>
      )}
    </div>
  );
};

export default SchoolSetupPage;
