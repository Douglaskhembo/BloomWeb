import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Combobox } from "@/components/ui/combobox";
import { Bus, MapPin, Users, AlertTriangle, Plus, UserPlus, Trash2, Search, Edit, X, ClipboardCheck } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import { TransportApi, TransportAttendanceApi, StudentApi, StaffApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import Swal from "sweetalert2";
import Pagination from "@/utils/Pagination";
import { getBackendErrorMessage } from "@/utils/errorHandler";
import AttendanceChecklist, { ChecklistRow, StatusOption } from "@/components/attendance/AttendanceChecklist";

const EMPTY_FORM = { name: "", driverUuid: "", vehicle: "", capacity: "", fare: "", status: "ACTIVE", pickupPoints: [] as string[] };
const todayISO = () => new Date().toISOString().slice(0, 10);
const BOARDING_STATUS_OPTIONS: StatusOption[] = [
  { value: "BOARDED", label: "Boarded", activeClassName: "bg-green-600 text-white hover:bg-green-600" },
  { value: "ABSENT", label: "Absent", activeClassName: "bg-red-600 text-white hover:bg-red-600" },
];

const TransportPage = () => {
  const { hasPermission } = useAuth();
  // Route/enrollment reads are open, but writes (create/edit/delete route, enroll/unenroll)
  // require TRANSPORT_MANAGE on the backend. Attendance marking has no permission check by
  // design, so that tab is left ungated.
  const canManageTransport = hasPermission("TRANSPORT_MANAGE");
  const [routes, setRoutes] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);

  const [routeDialogOpen, setRouteDialogOpen] = useState(false);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<any | null>(null);
  const [routeForm, setRouteForm] = useState({ ...EMPTY_FORM });
  const [newPickup, setNewPickup] = useState("");

  const [selectedStudentUuid, setSelectedStudentUuid] = useState("");
  const [selectedRouteUuid, setSelectedRouteUuid] = useState("");
  const [selectedPickup, setSelectedPickup] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRouteUuid, setFilterRouteUuid] = useState("all");

  const [routesPage, setRoutesPage] = useState(1);
  const [routesPerPage, setRoutesPerPage] = useState(10);
  const [enrollmentsPage, setEnrollmentsPage] = useState(1);
  const [enrollmentsPerPage, setEnrollmentsPerPage] = useState(10);

  const [attRouteUuid, setAttRouteUuid] = useState("");
  const [attDate, setAttDate] = useState(todayISO());
  const [attDirection, setAttDirection] = useState<"PICKUP" | "DROP_OFF">("PICKUP");
  const [attRegister, setAttRegister] = useState<ChecklistRow[]>([]);
  const [attLoading, setAttLoading] = useState(false);
  const [attSaving, setAttSaving] = useState(false);

  const loadAttRegister = async () => {
    if (!attRouteUuid) { setAttRegister([]); return; }
    setAttLoading(true);
    try {
      const data = await TransportAttendanceApi.getRegister({ routeUuid: attRouteUuid, date: attDate, direction: attDirection });
      setAttRegister(data);
    } finally {
      setAttLoading(false);
    }
  };

  useEffect(() => { loadAttRegister(); }, [attRouteUuid, attDate, attDirection]);

  const setAttRowStatus = (studentUuid: string, status: string) => {
    setAttRegister((rs) => rs.map((r) => (r.studentUuid === studentUuid ? { ...r, status } : r)));
  };
  const attMarkedCount = attRegister.filter((r) => r.status).length;

  const handleSaveAttendance = async () => {
    if (attSaving) return;
    const entries = attRegister.filter((r) => r.status).map((r) => ({ studentUuid: r.studentUuid, status: r.status as "BOARDED" | "ABSENT" }));
    if (entries.length === 0) {
      Swal.fire({ icon: "warning", title: "Nothing to save", text: "Mark at least one student before saving.", showConfirmButton: true });
      return;
    }
    setAttSaving(true);
    try {
      await TransportAttendanceApi.markBulk({ routeUuid: attRouteUuid, date: attDate, direction: attDirection, entries });
      Swal.fire({ icon: "success", title: "Attendance saved", timer: 1500, showConfirmButton: false });
      await loadAttRegister();
    } catch (e) {
      Swal.fire({ icon: "error", title: "Error", text: getBackendErrorMessage(e, "Failed to save attendance"), showConfirmButton: true });
    } finally {
      setAttSaving(false);
    }
  };

  const loadAll = () => {
    TransportApi.getRoutes().then(d => setRoutes(Array.isArray(d) ? d : []));
    TransportApi.getEnrollments().then(d => setEnrollments(Array.isArray(d) ? d : []));
  };

  useEffect(() => {
    loadAll();
    StudentApi.getAll().then(d => setStudents(Array.isArray(d) ? d : []));
    StaffApi.getAll().then(d => setStaff(Array.isArray(d) ? d : []));
  }, []);

  // ── Route form ────────────────────────────────────────────────────────────

  const drivers = useMemo(() => staff.filter(s => (s.staffRole?.name ?? "").toLowerCase() === "driver"), [staff]);
  const driverOptions = useMemo(() => drivers.map(s => ({
    value: s.uuid,
    label: `${s.firstName} ${s.lastName}${s.staffId ? ` (${s.staffId})` : ""}`,
    keywords: `${s.firstName} ${s.lastName} ${s.staffId ?? ""} ${s.phone ?? ""}`,
  })), [drivers]);

  const selectDriver = (uuid: string) => setRouteForm(f => ({ ...f, driverUuid: uuid }));

  const openAdd = () => { setEditingRoute(null); setRouteForm({ ...EMPTY_FORM }); setNewPickup(""); setRouteDialogOpen(true); };
  const openEdit = (r: any) => {
    setEditingRoute(r);
    setRouteForm({ name: r.name, driverUuid: r.driver?.uuid ?? "", vehicle: r.vehicle ?? "", capacity: String(r.capacity), fare: String(r.fare), status: r.status, pickupPoints: [...(r.pickupPoints ?? [])] });
    setNewPickup("");
    setRouteDialogOpen(true);
  };

  const addPickup = () => {
    const p = newPickup.trim();
    if (!p) return;
    if (routeForm.pickupPoints.includes(p)) { Swal.fire({ icon: "error", title: "Error", text: "Pickup point already exists", showConfirmButton: true }); return; }
    setRouteForm(f => ({ ...f, pickupPoints: [...f.pickupPoints, p] }));
    setNewPickup("");
  };

  const handleSaveRoute = async () => {
    if (!routeForm.name || !routeForm.driverUuid || !routeForm.vehicle) { Swal.fire({ icon: "error", title: "Error", text: "Please fill in all required fields", showConfirmButton: true }); return; }
    if (routeForm.pickupPoints.length === 0) { Swal.fire({ icon: "error", title: "Error", text: "Add at least one pickup point", showConfirmButton: true }); return; }
    const payload = { ...routeForm, capacity: Number(routeForm.capacity) || 0, fare: Number(routeForm.fare) || 0 };
    try {
      if (editingRoute) {
        await TransportApi.updateRoute(editingRoute.uuid, payload);
        Swal.fire({ title: "Success", text: "Route updated", icon: "success", showConfirmButton: true });
      } else {
        await TransportApi.createRoute(payload);
        Swal.fire({ title: "Success", text: "Route created", icon: "success", showConfirmButton: true });
      }
      setRouteDialogOpen(false);
      loadAll();
    } catch (e: any) {
      Swal.fire({ icon: "error", title: "Error", text: getBackendErrorMessage(e, "Failed to save route"), showConfirmButton: true });
    }
  };

  const handleDeleteRoute = async (uuid: string) => {
    try {
      await TransportApi.deleteRoute(uuid);
      Swal.fire({ title: "Success", text: "Route deleted", icon: "success", showConfirmButton: true });
      loadAll();
    } catch (e: any) {
      Swal.fire({ icon: "error", title: "Error", text: getBackendErrorMessage(e, "Cannot delete route with enrolled students"), showConfirmButton: true });
    }
  };

  // ── Enrollment ────────────────────────────────────────────────────────────

  const enrolledStudentUuids = useMemo(() => enrollments.map(e => e.student?.uuid), [enrollments]);
  const unenrolledStudents = useMemo(
    () => students.filter(s => !enrolledStudentUuids.includes(s.uuid) && s.boarderStatus !== "BOARDER"),
    [students, enrolledStudentUuids]
  );
  const currentPickups = useMemo(() => routes.find(r => r.uuid === selectedRouteUuid)?.pickupPoints ?? [], [routes, selectedRouteUuid]);

  const handleEnroll = async () => {
    if (!selectedStudentUuid || !selectedRouteUuid || !selectedPickup) { Swal.fire({ icon: "error", title: "Error", text: "Please fill all fields", showConfirmButton: true }); return; }
    try {
      await TransportApi.enrollStudent({ studentUuid: selectedStudentUuid, routeUuid: selectedRouteUuid, pickupPoint: selectedPickup });
      Swal.fire({ title: "Success", text: "Student enrolled to transport", icon: "success", showConfirmButton: true });
      setEnrollDialogOpen(false);
      setSelectedStudentUuid(""); setSelectedRouteUuid(""); setSelectedPickup("");
      loadAll();
    } catch (e: any) {
      Swal.fire({ icon: "error", title: "Error", text: getBackendErrorMessage(e, "Failed to enroll student"), showConfirmButton: true });
    }
  };

  const handleUnenroll = async (uuid: string) => {
    await TransportApi.unenrollStudent(uuid);
    Swal.fire({ title: "Success", text: "Student removed from route", icon: "success", showConfirmButton: true });
    loadAll();
  };

  const filteredEnrollments = useMemo(() => enrollments.filter(e => {
    const matchRoute = filterRouteUuid === "all" || e.route?.uuid === filterRouteUuid;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || `${e.student?.firstName} ${e.student?.lastName} ${e.student?.admissionNumber}`.toLowerCase().includes(q);
    return matchRoute && matchSearch;
  }), [enrollments, filterRouteUuid, searchQuery]);

  const totalRoutesPages = Math.ceil(routes.length / routesPerPage);
  const pagedRoutes = routes.slice((routesPage - 1) * routesPerPage, routesPage * routesPerPage);

  const totalEnrollmentsPages = Math.ceil(filteredEnrollments.length / enrollmentsPerPage);
  const pagedEnrollments = filteredEnrollments.slice((enrollmentsPage - 1) * enrollmentsPerPage, enrollmentsPage * enrollmentsPerPage);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transport</h1>
        <p className="text-muted-foreground">Route management and student enrollment</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Active Routes" value={routes.filter(r => r.status === "ACTIVE").length} icon={MapPin} iconColor="bg-primary/10 text-primary" />
        <StatCard title="Enrolled Students" value={enrollments.length} icon={Users} iconColor="bg-info/10 text-info" />
        <StatCard title="Fleet Size" value={routes.length} icon={Bus} iconColor="bg-success/10 text-success" />
        <StatCard title="Maintenance" value={routes.filter(r => r.status === "MAINTENANCE").length} icon={AlertTriangle} iconColor="bg-warning/10 text-warning" />
      </div>

      <Tabs defaultValue="routes">
        <TabsList>
          <TabsTrigger value="routes">Routes</TabsTrigger>
          <TabsTrigger value="enrollment">Student Enrollment</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
        </TabsList>

        {/* Routes Tab */}
        <TabsContent value="routes">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Transport Routes</CardTitle>
                <CardDescription>Manage bus routes, drivers, and pickup points</CardDescription>
              </div>
              {canManageTransport && <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> Add Route</Button>}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Route Name</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Fare (KES)</TableHead>
                    <TableHead>Pickup Points</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedRoutes.map(r => (
                    <TableRow key={r.uuid}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="font-mono text-xs">{r.vehicle}</TableCell>
                      <TableCell>
                        <p className="text-sm">{r.driver ? `${r.driver.firstName} ${r.driver.lastName}` : "—"}</p>
                        <p className="text-xs text-muted-foreground">{r.driver?.phone}</p>
                      </TableCell>
                      <TableCell>{r.capacity}</TableCell>
                      <TableCell>{Number(r.fare).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {(r.pickupPoints ?? []).map((p: string) => (
                            <Badge key={p} variant="outline" className="text-[10px]"><MapPin className="w-2.5 h-2.5 mr-0.5" />{p}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{enrollments.filter(e => e.route?.uuid === r.uuid).length}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "ACTIVE" ? "default" : "destructive"} className="text-[10px]">{r.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {canManageTransport && (
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}><Edit className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteRoute(r.uuid)}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {routes.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No routes yet.</TableCell></TableRow>}
                </TableBody>
              </Table>
              <Pagination currentPage={routesPage} totalPages={totalRoutesPages} onPageChange={setRoutesPage}
                itemsPerPage={routesPerPage} onItemsPerPageChange={v => { setRoutesPerPage(v); setRoutesPage(1); }} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Enrollment Tab */}
        <TabsContent value="enrollment">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Enrolled Students</CardTitle>
                <CardDescription>Assign students to transport routes and pickup points</CardDescription>
              </div>
              {canManageTransport && <Button size="sm" onClick={() => setEnrollDialogOpen(true)}><UserPlus className="w-4 h-4 mr-1" /> Enroll Student</Button>}
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search by name or admission no..." className="pl-9" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setEnrollmentsPage(1); }} />
                </div>
                <Select value={filterRouteUuid} onValueChange={v => { setFilterRouteUuid(v); setEnrollmentsPage(1); }}>
                  <SelectTrigger className="w-full sm:w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Routes</SelectItem>
                    {routes.map(r => <SelectItem key={r.uuid} value={r.uuid}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Adm No</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Pickup Point</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedEnrollments.map(e => (
                    <TableRow key={e.uuid}>
                      <TableCell className="font-medium">{e.student?.firstName} {e.student?.lastName}</TableCell>
                      <TableCell className="text-muted-foreground">{e.student?.admissionNumber}</TableCell>
                      <TableCell>{e.student?.grade}</TableCell>
                      <TableCell>{e.route?.name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs"><MapPin className="w-3 h-3 mr-1" />{e.pickupPoint}</Badge></TableCell>
                      <TableCell className="text-right">
                        {canManageTransport && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleUnenroll(e.uuid)}><Trash2 className="w-4 h-4" /></Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredEnrollments.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No enrolled students found.</TableCell></TableRow>}
                </TableBody>
              </Table>
              <Pagination currentPage={enrollmentsPage} totalPages={totalEnrollmentsPages} onPageChange={setEnrollmentsPage}
                itemsPerPage={enrollmentsPerPage} onItemsPerPageChange={v => { setEnrollmentsPerPage(v); setEnrollmentsPage(1); }} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><ClipboardCheck className="w-4 h-4" /> Bus Attendance</CardTitle>
              <CardDescription>Record student boarding at pickup and drop-off — no driver app needed, mark the whole route at once</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Route</Label>
                  <Select value={attRouteUuid} onValueChange={setAttRouteUuid}>
                    <SelectTrigger><SelectValue placeholder="Select route" /></SelectTrigger>
                    <SelectContent>
                      {routes.map(r => <SelectItem key={r.uuid} value={r.uuid}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Date</Label>
                  <Input type="date" value={attDate} onChange={(e) => setAttDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Direction</Label>
                  <Select value={attDirection} onValueChange={(v) => setAttDirection(v as "PICKUP" | "DROP_OFF")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PICKUP">Morning Pickup</SelectItem>
                      <SelectItem value="DROP_OFF">Afternoon Drop-off</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {!attRouteUuid ? (
                <p className="text-sm text-muted-foreground text-center py-6">Select a route to load its boarding register.</p>
              ) : attLoading ? (
                <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">{attMarkedCount} of {attRegister.length} marked</p>
                  <AttendanceChecklist
                    rows={attRegister}
                    statusOptions={BOARDING_STATUS_OPTIONS}
                    onStatusChange={setAttRowStatus}
                    extraColumnLabel="Pickup Point"
                    extraColumn={(row) => (row as any).pickupPoint ?? "—"}
                  />
                  <div className="flex justify-end">
                    <Button onClick={handleSaveAttendance} disabled={attSaving || attLoading}>
                      {attSaving ? "Saving…" : "Save Attendance"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Route Dialog */}
      <Dialog open={routeDialogOpen} onOpenChange={o => { setRouteDialogOpen(o); if (!o) setEditingRoute(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRoute ? "Edit Route" : "Register New Route"}</DialogTitle>
            <DialogDescription>{editingRoute ? "Update route details" : "Add a new transport route"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Route Name <span className="text-destructive">*</span></Label>
                <Input value={routeForm.name} onChange={e => setRouteForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Route A - Westlands" />
              </div>
              <div className="space-y-2">
                <Label>Driver <span className="text-destructive">*</span></Label>
                <Combobox
                  options={driverOptions}
                  value={routeForm.driverUuid}
                  onChange={selectDriver}
                  placeholder="Select driver"
                  searchPlaceholder="Search drivers..."
                  emptyText="No staff with role 'Driver' found."
                />
              </div>
              <div className="space-y-2">
                <Label>Driver Phone</Label>
                <Input value={drivers.find(s => s.uuid === routeForm.driverUuid)?.phone ?? ""} disabled placeholder="Auto-filled from driver" />
              </div>
              <div className="space-y-2">
                <Label>Vehicle Reg <span className="text-destructive">*</span></Label>
                <Input value={routeForm.vehicle} onChange={e => setRouteForm(f => ({ ...f, vehicle: e.target.value }))} placeholder="e.g. KBZ 123A" />
              </div>
              <div className="space-y-2">
                <Label>Capacity</Label>
                <Input type="number" value={routeForm.capacity} onChange={e => setRouteForm(f => ({ ...f, capacity: e.target.value }))} placeholder="e.g. 45" />
              </div>
              <div className="space-y-2">
                <Label>Term Fare (KES)</Label>
                <Input type="number" value={routeForm.fare} onChange={e => setRouteForm(f => ({ ...f, fare: e.target.value }))} placeholder="e.g. 15000" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={routeForm.status} onValueChange={v => setRouteForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Pickup Points <span className="text-destructive">*</span></Label>
              <div className="flex gap-2">
                <Input value={newPickup} onChange={e => setNewPickup(e.target.value)} placeholder="Add a pickup point" onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addPickup(); } }} />
                <Button type="button" variant="outline" size="sm" onClick={addPickup}><Plus className="w-4 h-4" /></Button>
              </div>
              {routeForm.pickupPoints.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {routeForm.pickupPoints.map(p => (
                    <Badge key={p} variant="secondary" className="text-xs gap-1 pr-1">
                      <MapPin className="w-3 h-3" /> {p}
                      <button onClick={() => setRouteForm(f => ({ ...f, pickupPoints: f.pickupPoints.filter(x => x !== p) }))} className="ml-0.5 hover:text-destructive"><X className="w-3 h-3" /></button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRouteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveRoute}>{editingRoute ? "Update Route" : "Register Route"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enroll Student Dialog */}
      <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enroll Student to Transport</DialogTitle>
            <DialogDescription>Select a student, route, and pickup point</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Student</Label>
              <Select value={selectedStudentUuid} onValueChange={setSelectedStudentUuid}>
                <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>
                  {unenrolledStudents.map(s => (
                    <SelectItem key={s.uuid} value={s.uuid}>{s.firstName} {s.lastName} ({s.admissionNumber}) – {s.grade}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Route</Label>
              <Select value={selectedRouteUuid} onValueChange={v => { setSelectedRouteUuid(v); setSelectedPickup(""); }}>
                <SelectTrigger><SelectValue placeholder="Select route" /></SelectTrigger>
                <SelectContent>
                  {routes.filter(r => r.status === "ACTIVE").map(r => (
                    <SelectItem key={r.uuid} value={r.uuid}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Pickup Point</Label>
              <Select value={selectedPickup} onValueChange={setSelectedPickup} disabled={!selectedRouteUuid}>
                <SelectTrigger><SelectValue placeholder={selectedRouteUuid ? "Select pickup point" : "Select a route first"} /></SelectTrigger>
                <SelectContent>
                  {currentPickups.map((p: string) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEnroll}>Enroll</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TransportPage;
