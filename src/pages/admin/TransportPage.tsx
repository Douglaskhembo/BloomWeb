import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Bus, MapPin, Users, AlertTriangle, Plus, UserPlus, Trash2, Search, Edit, X } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import { toast } from "sonner";

interface Route {
  id: number;
  name: string;
  driver: string;
  driverPhone: string;
  vehicle: string;
  capacity: number;
  status: string;
  pickupPoints: string[];
  fare: number;
}

const initialRoutesData: Route[] = [
  { id: 1, name: "Route A - Westlands", driver: "John Mutiso", driverPhone: "+254712345678", vehicle: "KBZ 123A", capacity: 45, status: "Active", pickupPoints: ["Westlands Mall", "Sarit Centre", "The Mall"], fare: 15000 },
  { id: 2, name: "Route B - Langata", driver: "Peter Ouma", driverPhone: "+254723456789", vehicle: "KCA 456B", capacity: 40, status: "Active", pickupPoints: ["Langata Road", "T-Mall", "Galleria"], fare: 12000 },
  { id: 3, name: "Route C - Karen", driver: "James Wafula", driverPhone: "+254734567890", vehicle: "KDA 789C", capacity: 50, status: "Active", pickupPoints: ["Karen Hub", "Hardy", "Ngong Road"], fare: 18000 },
  { id: 4, name: "Route D - Kileleshwa", driver: "Samuel Njogu", driverPhone: "+254745678901", vehicle: "KBB 012D", capacity: 35, status: "Maintenance", pickupPoints: ["Valley Arcade", "Lavington Mall", "Ring Road"], fare: 14000 },
  { id: 5, name: "Route E - South B", driver: "Michael Kamau", driverPhone: "+254756789012", vehicle: "KCE 345E", capacity: 42, status: "Active", pickupPoints: ["Capital Centre", "Mombasa Road", "Bellevue"], fare: 10000 },
];

const allStudents = [
  { id: 1, name: "Brian Njoroge", grade: "Grade 4", admNo: "ADM001" },
  { id: 2, name: "Faith Wanjiru", grade: "Grade 3", admNo: "ADM002" },
  { id: 3, name: "Kevin Otieno", grade: "Grade 6", admNo: "ADM003" },
  { id: 4, name: "Grace Muthoni", grade: "Grade 5", admNo: "ADM004" },
  { id: 5, name: "David Kimani", grade: "Grade 2", admNo: "ADM005" },
  { id: 6, name: "Mercy Akinyi", grade: "Grade 7", admNo: "ADM006" },
  { id: 7, name: "Samuel Odhiambo", grade: "Grade 1", admNo: "ADM007" },
  { id: 8, name: "Lucy Chebet", grade: "PP2", admNo: "ADM008" },
  { id: 9, name: "James Mwangi", grade: "Grade 8", admNo: "ADM009" },
  { id: 10, name: "Agnes Nyambura", grade: "Grade 3", admNo: "ADM010" },
];

interface EnrolledStudent {
  studentId: number;
  routeId: number;
  pickupPoint: string;
}

const initialEnrollments: EnrolledStudent[] = [
  { studentId: 1, routeId: 1, pickupPoint: "Westlands Mall" },
  { studentId: 2, routeId: 1, pickupPoint: "Sarit Centre" },
  { studentId: 3, routeId: 2, pickupPoint: "T-Mall" },
  { studentId: 4, routeId: 3, pickupPoint: "Karen Hub" },
  { studentId: 5, routeId: 2, pickupPoint: "Langata Road" },
];

const TransportPage = () => {
  const [routes, setRoutes] = useState<Route[]>(initialRoutesData);
  const [enrollments, setEnrollments] = useState<EnrolledStudent[]>(initialEnrollments);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [routeDialogOpen, setRouteDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [selectedRoute, setSelectedRoute] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedPickup, setSelectedPickup] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRoute, setFilterRoute] = useState("all");
  const [newPickup, setNewPickup] = useState("");

  // Route form state
  const [routeForm, setRouteForm] = useState({
    name: "", driver: "", driverPhone: "", vehicle: "", capacity: "", status: "Active", fare: "", pickupPoints: [] as string[],
  });

  const resetRouteForm = () => {
    setRouteForm({ name: "", driver: "", driverPhone: "", vehicle: "", capacity: "", status: "Active", fare: "", pickupPoints: [] });
    setEditingRoute(null);
    setNewPickup("");
  };

  const openAddRoute = () => {
    resetRouteForm();
    setRouteDialogOpen(true);
  };

  const openEditRoute = (route: Route) => {
    setEditingRoute(route);
    setRouteForm({
      name: route.name,
      driver: route.driver,
      driverPhone: route.driverPhone,
      vehicle: route.vehicle,
      capacity: String(route.capacity),
      status: route.status,
      fare: String(route.fare),
      pickupPoints: [...route.pickupPoints],
    });
    setRouteDialogOpen(true);
  };

  const addPickupPoint = () => {
    if (!newPickup.trim()) return;
    if (routeForm.pickupPoints.includes(newPickup.trim())) {
      toast.error("Pickup point already exists");
      return;
    }
    setRouteForm({ ...routeForm, pickupPoints: [...routeForm.pickupPoints, newPickup.trim()] });
    setNewPickup("");
  };

  const removePickupPoint = (point: string) => {
    setRouteForm({ ...routeForm, pickupPoints: routeForm.pickupPoints.filter(p => p !== point) });
  };

  const handleSaveRoute = () => {
    if (!routeForm.name || !routeForm.driver || !routeForm.vehicle) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (routeForm.pickupPoints.length === 0) {
      toast.error("Please add at least one pickup point");
      return;
    }

    if (editingRoute) {
      setRoutes(routes.map(r => r.id === editingRoute.id ? {
        ...r,
        name: routeForm.name,
        driver: routeForm.driver,
        driverPhone: routeForm.driverPhone,
        vehicle: routeForm.vehicle,
        capacity: Number(routeForm.capacity) || 0,
        status: routeForm.status,
        fare: Number(routeForm.fare) || 0,
        pickupPoints: routeForm.pickupPoints,
      } : r));
      toast.success("Route updated successfully");
    } else {
      const newRoute: Route = {
        id: Math.max(...routes.map(r => r.id), 0) + 1,
        name: routeForm.name,
        driver: routeForm.driver,
        driverPhone: routeForm.driverPhone,
        vehicle: routeForm.vehicle,
        capacity: Number(routeForm.capacity) || 0,
        status: routeForm.status,
        fare: Number(routeForm.fare) || 0,
        pickupPoints: routeForm.pickupPoints,
      };
      setRoutes([...routes, newRoute]);
      toast.success("Route registered successfully");
    }
    setRouteDialogOpen(false);
    resetRouteForm();
  };

  const handleDeleteRoute = (routeId: number) => {
    const hasStudents = enrollments.some(e => e.routeId === routeId);
    if (hasStudents) {
      toast.error("Cannot delete route with enrolled students");
      return;
    }
    setRoutes(routes.filter(r => r.id !== routeId));
    toast.success("Route deleted");
  };

  const enrolledStudentIds = enrollments.map((e) => e.studentId);
  const unenrolledStudents = allStudents.filter((s) => !enrolledStudentIds.includes(s.id));

  const handleEnroll = () => {
    if (!selectedRoute || !selectedStudent || !selectedPickup) {
      toast.error("Please fill all fields");
      return;
    }
    setEnrollments([
      ...enrollments,
      { studentId: Number(selectedStudent), routeId: Number(selectedRoute), pickupPoint: selectedPickup },
    ]);
    toast.success("Student enrolled to transport successfully");
    setSelectedRoute("");
    setSelectedStudent("");
    setSelectedPickup("");
    setEnrollDialogOpen(false);
  };

  const handleRemove = (studentId: number) => {
    setEnrollments(enrollments.filter((e) => e.studentId !== studentId));
    toast.success("Student removed from transport");
  };

  const currentRoutePickups = selectedRoute
    ? routes.find((r) => r.id === Number(selectedRoute))?.pickupPoints || []
    : [];

  const filteredEnrollments = enrollments.filter((e) => {
    const student = allStudents.find((s) => s.id === e.studentId);
    const matchRoute = filterRoute === "all" || e.routeId === Number(filterRoute);
    const matchSearch =
      !searchQuery ||
      student?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student?.admNo.toLowerCase().includes(searchQuery.toLowerCase());
    return matchRoute && matchSearch;
  });

  const activeRoutes = routes.filter((r) => r.status === "Active").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transport</h1>
        <p className="text-muted-foreground">Route management, student enrollment, and pickup alerts</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Active Routes" value={activeRoutes} icon={MapPin} iconColor="bg-primary/10 text-primary" />
        <StatCard title="Enrolled Students" value={enrollments.length} icon={Users} iconColor="bg-info/10 text-info" />
        <StatCard title="Fleet Size" value={routes.length} icon={Bus} iconColor="bg-success/10 text-success" />
        <StatCard title="Maintenance" value={routes.filter((r) => r.status === "Maintenance").length} icon={AlertTriangle} iconColor="bg-warning/10 text-warning" />
      </div>

      <Tabs defaultValue="routes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="routes">Routes</TabsTrigger>
          <TabsTrigger value="enrollment">Student Enrollment</TabsTrigger>
        </TabsList>

        {/* Routes Tab */}
        <TabsContent value="routes">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Transport Routes</CardTitle>
                  <CardDescription>Register and manage bus routes, drivers, and pickup points</CardDescription>
                </div>
                <Button size="sm" onClick={openAddRoute}>
                  <Plus className="w-4 h-4 mr-1" /> Add Route
                </Button>
              </div>
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
                  {routes.map((route) => (
                    <TableRow key={route.id}>
                      <TableCell className="font-medium">{route.name}</TableCell>
                      <TableCell className="font-mono text-xs">{route.vehicle}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{route.driver}</p>
                          <p className="text-xs text-muted-foreground">{route.driverPhone}</p>
                        </div>
                      </TableCell>
                      <TableCell>{route.capacity}</TableCell>
                      <TableCell>{route.fare.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {route.pickupPoints.map((p) => (
                            <Badge key={p} variant="outline" className="text-[10px]">
                              <MapPin className="w-2.5 h-2.5 mr-0.5" /> {p}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{enrollments.filter((e) => e.routeId === route.id).length}</TableCell>
                      <TableCell>
                        <Badge variant={route.status === "Active" ? "default" : "destructive"} className="text-[10px]">
                          {route.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditRoute(route)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteRoute(route.id)}>
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

        {/* Student Enrollment Tab */}
        <TabsContent value="enrollment">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Enrolled Students</CardTitle>
                  <CardDescription>Assign students to transport routes and pickup points</CardDescription>
                </div>
                <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
                  <Button size="sm" onClick={() => setEnrollDialogOpen(true)}>
                    <UserPlus className="w-4 h-4 mr-1" /> Enroll Student
                  </Button>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Enroll Student to Transport</DialogTitle>
                      <DialogDescription>Select a student, route, and pickup point</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="space-y-2">
                        <Label>Student</Label>
                        <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                          <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                          <SelectContent>
                            {unenrolledStudents.map((s) => (
                              <SelectItem key={s.id} value={String(s.id)}>
                                {s.name} ({s.admNo}) – {s.grade}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Route</Label>
                        <Select value={selectedRoute} onValueChange={(v) => { setSelectedRoute(v); setSelectedPickup(""); }}>
                          <SelectTrigger><SelectValue placeholder="Select route" /></SelectTrigger>
                          <SelectContent>
                            {routes.filter((r) => r.status === "Active").map((r) => (
                              <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Pickup Point</Label>
                        <Select value={selectedPickup} onValueChange={setSelectedPickup} disabled={!selectedRoute}>
                          <SelectTrigger><SelectValue placeholder={selectedRoute ? "Select pickup point" : "Select a route first"} /></SelectTrigger>
                          <SelectContent>
                            {currentRoutePickups.map((p) => (
                              <SelectItem key={p} value={p}>{p}</SelectItem>
                            ))}
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
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search by name or admission no..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <Select value={filterRoute} onValueChange={setFilterRoute}>
                  <SelectTrigger className="w-full sm:w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Routes</SelectItem>
                    {routes.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                    ))}
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
                  {filteredEnrollments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No enrolled students found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEnrollments.map((enrollment) => {
                      const student = allStudents.find((s) => s.id === enrollment.studentId);
                      const route = routes.find((r) => r.id === enrollment.routeId);
                      return (
                        <TableRow key={enrollment.studentId}>
                          <TableCell className="font-medium">{student?.name}</TableCell>
                          <TableCell className="text-muted-foreground">{student?.admNo}</TableCell>
                          <TableCell>{student?.grade}</TableCell>
                          <TableCell>{route?.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              <MapPin className="w-3 h-3 mr-1" /> {enrollment.pickupPoint}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemove(enrollment.studentId)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Route Dialog */}
      <Dialog open={routeDialogOpen} onOpenChange={(open) => { setRouteDialogOpen(open); if (!open) resetRouteForm(); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRoute ? "Edit Route" : "Register New Route"}</DialogTitle>
            <DialogDescription>
              {editingRoute ? "Update route details and pickup points" : "Add a new transport route with driver and pickup points"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Route Name <span className="text-destructive">*</span></Label>
                <Input value={routeForm.name} onChange={e => setRouteForm({ ...routeForm, name: e.target.value })} placeholder="e.g. Route A - Westlands" />
              </div>
              <div className="space-y-2">
                <Label>Driver Name <span className="text-destructive">*</span></Label>
                <Input value={routeForm.driver} onChange={e => setRouteForm({ ...routeForm, driver: e.target.value })} placeholder="e.g. John Mutiso" />
              </div>
              <div className="space-y-2">
                <Label>Driver Phone</Label>
                <Input value={routeForm.driverPhone} onChange={e => setRouteForm({ ...routeForm, driverPhone: e.target.value })} placeholder="+254..." />
              </div>
              <div className="space-y-2">
                <Label>Vehicle Reg <span className="text-destructive">*</span></Label>
                <Input value={routeForm.vehicle} onChange={e => setRouteForm({ ...routeForm, vehicle: e.target.value })} placeholder="e.g. KBZ 123A" />
              </div>
              <div className="space-y-2">
                <Label>Capacity</Label>
                <Input type="number" value={routeForm.capacity} onChange={e => setRouteForm({ ...routeForm, capacity: e.target.value })} placeholder="e.g. 45" />
              </div>
              <div className="space-y-2">
                <Label>Term Fare (KES)</Label>
                <Input type="number" value={routeForm.fare} onChange={e => setRouteForm({ ...routeForm, fare: e.target.value })} placeholder="e.g. 15000" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={routeForm.status} onValueChange={v => setRouteForm({ ...routeForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Pickup Points */}
            <div className="space-y-2">
              <Label>Pickup Points <span className="text-destructive">*</span></Label>
              <div className="flex gap-2">
                <Input value={newPickup} onChange={e => setNewPickup(e.target.value)} placeholder="Add a pickup point" onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addPickupPoint(); } }} />
                <Button type="button" variant="outline" size="sm" onClick={addPickupPoint}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {routeForm.pickupPoints.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {routeForm.pickupPoints.map(p => (
                    <Badge key={p} variant="secondary" className="text-xs gap-1 pr-1">
                      <MapPin className="w-3 h-3" /> {p}
                      <button onClick={() => removePickupPoint(p)} className="ml-0.5 hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRouteDialogOpen(false); resetRouteForm(); }}>Cancel</Button>
            <Button onClick={handleSaveRoute}>{editingRoute ? "Update Route" : "Register Route"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TransportPage;
