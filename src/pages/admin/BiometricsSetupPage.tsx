import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Fingerprint, ScanFace, Trash2, KeyRound, RefreshCw, UserCheck, Dices } from "lucide-react";
import Swal from "sweetalert2";
import { StaffApi, StudentApi, BiometricsApi, DeviceApi, ClassTeacherApi, SchoolApi } from "@/services/api";
import { triggerFingerprintGesture, isPlatformAuthenticatorAvailable } from "@/lib/webauthnGesture";
import { getBackendErrorMessage } from "@/utils/errorHandler";
import { Combobox } from "@/components/ui/combobox";
import Pagination from "@/utils/Pagination";

const FINGER_NAMES = ["THUMB", "INDEX", "MIDDLE", "RING", "LITTLE"];

/** Real fingerprint template refs come from the enrolling device's SDK — there's nothing meaningful
 * for a human to type here until real hardware is wired up, so we generate a placeholder and let
 * the admin regenerate/override it rather than asking them to invent a value from nothing. */
const genRef = () => `TEST-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

// ── Staff / Student enrollment panel ────────────────────────────────────────

interface OwnerConfig {
  label: string;
  getAll: () => Promise<any[]>;
  labelFor: (p: any) => string;
  refFor: (p: any) => string;
  api: typeof BiometricsApi.staff;
}

const EnrollmentPanel = ({ config }: { config: OwnerConfig }) => {
  const [people, setPeople] = useState<any[]>([]);
  const [selectedUuid, setSelectedUuid] = useState("");
  const [bioData, setBioData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [platformAuthAvailable, setPlatformAuthAvailable] = useState(false);
  const [form, setForm] = useState({
    leftFingerprintTemplateRef: genRef(), leftFingerName: "THUMB",
    rightFingerprintTemplateRef: genRef(), rightFingerName: "THUMB",
    faceTemplateRef: "", enrolledDeviceId: "WEB-ENROLL",
  });

  useEffect(() => { config.getAll().then(setPeople); }, [config]);
  useEffect(() => { isPlatformAuthenticatorAvailable().then(setPlatformAuthAvailable); }, []);

  const selectedPerson = people.find((p) => p.uuid === selectedUuid);

  const loadBioData = async (uuid: string) => {
    setLoading(true);
    const data = await config.api.getBioData(uuid);
    setBioData(data);
    if (!data) {
      setForm((f) => ({ ...f, leftFingerprintTemplateRef: genRef(), rightFingerprintTemplateRef: genRef() }));
    }
    setLoading(false);
  };

  const handleSelect = (uuid: string) => {
    setSelectedUuid(uuid);
    loadBioData(uuid);
  };

  const handleEnroll = async () => {
    if (!form.leftFingerprintTemplateRef || !form.rightFingerprintTemplateRef) {
      Swal.fire({ icon: "error", title: "Both left and right fingerprint refs are required", showConfirmButton: true });
      return;
    }
    try {
      await config.api.enroll(selectedUuid, form);
      Swal.fire({ title: "Success", text: `${config.label} enrolled for biometrics`, icon: "success", showConfirmButton: true });
      loadBioData(selectedUuid);
    } catch (err) {
      Swal.fire({ icon: "error", title: "Enrollment failed", text: getBackendErrorMessage(err), showConfirmButton: true });
    }
  };

  const handleStatusToggle = async (status: string) => {
    try {
      await config.api.updateStatus(bioData.uuid, status);
      Swal.fire({ title: "Success", text: `Status set to ${status}`, icon: "success", showConfirmButton: true });
      loadBioData(selectedUuid);
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to update status", text: getBackendErrorMessage(err), showConfirmButton: true });
    }
  };

  const runCapture = async (withFingerprintPrompt: boolean) => {
    try {
      if (withFingerprintPrompt) await triggerFingerprintGesture(config.label);
      const result = await config.api.capture(bioData.uuid, "WEB-TEST", "Test scan via browser");
      Swal.fire({
        title: `${result.eventType === "CLOCK_IN" || result.eventType === "ENTRY" ? "Clocked in" : "Clocked out"}`,
        text: `${result.ownerName} — ${result.status} at ${new Date(result.clockInOrEntry ?? result.clockOutOrExit).toLocaleTimeString()}`,
        icon: "success",
        showConfirmButton: true,
      });
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Test scan failed", text: err?.message ?? getBackendErrorMessage(err), showConfirmButton: true });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-base">Select {config.label}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[520px] overflow-y-auto">
          {people.map((p) => (
            <button
              key={p.uuid}
              onClick={() => handleSelect(p.uuid)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ${
                selectedUuid === p.uuid ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted"
              }`}
            >
              <div className="font-medium">{config.labelFor(p)}</div>
              <div className="text-xs text-muted-foreground">{config.refFor(p)}</div>
            </button>
          ))}
          {people.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No {config.label.toLowerCase()}s found</p>}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">
            {selectedPerson ? config.labelFor(selectedPerson) : `Choose a ${config.label.toLowerCase()} to enroll or test`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedUuid && <p className="text-sm text-muted-foreground py-8 text-center">Select someone from the list.</p>}
          {selectedUuid && loading && <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>}

          {selectedUuid && !loading && !bioData && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Not yet enrolled. Enter fingerprint template refs from the enrolling device (or a placeholder for testing).</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Left Fingerprint Ref</Label>
                  <div className="flex gap-1">
                    <Input value={form.leftFingerprintTemplateRef} onChange={(e) => setForm({ ...form, leftFingerprintTemplateRef: e.target.value })} placeholder="from device SDK" />
                    <Button type="button" variant="outline" size="icon" onClick={() => setForm({ ...form, leftFingerprintTemplateRef: genRef() })} title="Generate new placeholder ref">
                      <Dices className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Left Finger</Label>
                  <Select value={form.leftFingerName} onValueChange={(v) => setForm({ ...form, leftFingerName: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{FINGER_NAMES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Right Fingerprint Ref</Label>
                  <div className="flex gap-1">
                    <Input value={form.rightFingerprintTemplateRef} onChange={(e) => setForm({ ...form, rightFingerprintTemplateRef: e.target.value })} placeholder="from device SDK" />
                    <Button type="button" variant="outline" size="icon" onClick={() => setForm({ ...form, rightFingerprintTemplateRef: genRef() })} title="Generate new placeholder ref">
                      <Dices className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Right Finger</Label>
                  <Select value={form.rightFingerName} onValueChange={(v) => setForm({ ...form, rightFingerName: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{FINGER_NAMES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Face Ref (optional)</Label>
                  <Input value={form.faceTemplateRef} onChange={(e) => setForm({ ...form, faceTemplateRef: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Enrolling Device ID</Label>
                  <Input value={form.enrolledDeviceId} onChange={(e) => setForm({ ...form, enrolledDeviceId: e.target.value })} />
                </div>
              </div>
              <Button onClick={handleEnroll}><Fingerprint className="w-4 h-4 mr-1" /> Enroll</Button>
            </div>
          )}

          {selectedUuid && !loading && bioData && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={bioData.status === "ACTIVE" ? "default" : "secondary"}>{bioData.status}</Badge>
                <span className="text-xs text-muted-foreground">Enrolled {new Date(bioData.enrolledAt).toLocaleDateString()} on {bioData.enrolledDeviceId}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Left finger:</span> {bioData.leftFingerName}</div>
                <div><span className="text-muted-foreground">Right finger:</span> {bioData.rightFingerName}</div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <p className="text-sm font-medium">Test Scan</p>
                <p className="text-xs text-muted-foreground">
                  {platformAuthAvailable
                    ? "Uses your device's fingerprint/Windows Hello prompt as a local test gesture, then fires the same clock-in/out event a real device would."
                    : "No fingerprint/Windows Hello reader detected for this browser session — either it isn't set up at the OS level yet, or you're not on localhost/https. Use \"Simulate scan\" instead, or see the setup note below."}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => runCapture(true)} disabled={!platformAuthAvailable}>
                    <ScanFace className="w-4 h-4 mr-1" /> Scan with fingerprint
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => runCapture(false)}>Simulate scan (no prompt)</Button>
                </div>
                {!platformAuthAvailable && (
                  <p className="text-xs text-muted-foreground">
                    To enable: Windows → Settings → Accounts → Sign-in options → Fingerprint (enroll a print there first);
                    Mac → System Settings → Touch ID. The browser can only use a reader the OS already has enrolled.
                  </p>
                )}
              </div>

              <div className="border-t pt-4 flex gap-2">
                {bioData.status !== "ACTIVE" && <Button size="sm" variant="outline" onClick={() => handleStatusToggle("ACTIVE")}>Reactivate</Button>}
                {bioData.status === "ACTIVE" && <Button size="sm" variant="outline" onClick={() => handleStatusToggle("SUSPENDED")}>Suspend</Button>}
                <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleStatusToggle("REVOKED")}>Revoke</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ── Devices panel ────────────────────────────────────────────────────────────

const DevicesPanel = () => {
  const [devices, setDevices] = useState<any[]>([]);
  const [form, setForm] = useState({ deviceCode: "", name: "", location: "", deviceType: "FINGERPRINT" });
  const [newKey, setNewKey] = useState<{ deviceCode: string; apiKey: string } | null>(null);
  const [devicesPage, setDevicesPage] = useState(1);
  const [devicesPerPage, setDevicesPerPage] = useState(10);

  const load = () => DeviceApi.getAll().then(setDevices);
  useEffect(() => { load(); }, []);

  const handleRegister = async () => {
    if (!form.deviceCode || !form.name) {
      Swal.fire({ icon: "error", title: "Device code and name are required", showConfirmButton: true });
      return;
    }
    try {
      const created = await DeviceApi.register(form);
      setNewKey({ deviceCode: created.deviceCode, apiKey: created.apiKey });
      setForm({ deviceCode: "", name: "", location: "", deviceType: "FINGERPRINT" });
      load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to register device", text: getBackendErrorMessage(err), showConfirmButton: true });
    }
  };

  const handleRegenerate = async (uuid: string, deviceCode: string) => {
    try {
      const updated = await DeviceApi.regenerateKey(uuid);
      setNewKey({ deviceCode, apiKey: updated.apiKey });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to regenerate key", text: getBackendErrorMessage(err), showConfirmButton: true });
    }
  };

  const handleToggleStatus = async (uuid: string, current: string) => {
    try {
      await DeviceApi.updateStatus(uuid, current === "ACTIVE" ? "INACTIVE" : "ACTIVE");
      load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to update device", text: getBackendErrorMessage(err), showConfirmButton: true });
    }
  };

  const handleDelete = async (uuid: string) => {
    try { await DeviceApi.delete(uuid); Swal.fire({ title: "Success", text: "Device removed", icon: "success", showConfirmButton: true }); load(); }
    catch (err) { Swal.fire({ icon: "error", title: "Failed to delete device", text: getBackendErrorMessage(err), showConfirmButton: true }); }
  };

  const totalDevicesPages = Math.ceil(devices.length / devicesPerPage);
  const pagedDevices = devices.slice((devicesPage - 1) * devicesPerPage, devicesPage * devicesPerPage);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Register Device</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2"><Label>Device Code</Label><Input value={form.deviceCode} onChange={(e) => setForm({ ...form, deviceCode: e.target.value })} placeholder="e.g. MAIN-GATE-01" /></div>
          <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Main Gate Reader" /></div>
          <div className="space-y-2"><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Main Gate" /></div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={form.deviceType} onValueChange={(v) => setForm({ ...form, deviceType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="FINGERPRINT">Fingerprint</SelectItem>
                <SelectItem value="FACE">Face</SelectItem>
                <SelectItem value="CARD">Card</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleRegister} className="w-full"><KeyRound className="w-4 h-4 mr-1" /> Register & Generate Key</Button>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="text-base">Registered Devices</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Location</TableHead>
                <TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedDevices.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No devices registered.</TableCell></TableRow>
              ) : pagedDevices.map((d) => (
                <TableRow key={d.uuid}>
                  <TableCell className="font-mono text-xs">{d.deviceCode}</TableCell>
                  <TableCell>{d.name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{d.location}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{d.deviceType}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={d.status === "ACTIVE" ? "default" : "secondary"} className="cursor-pointer" onClick={() => handleToggleStatus(d.uuid, d.status)}>
                      {d.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRegenerate(d.uuid, d.deviceCode)}><RefreshCw className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(d.uuid)}><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination currentPage={devicesPage} totalPages={totalDevicesPages} onPageChange={setDevicesPage}
            itemsPerPage={devicesPerPage} onItemsPerPageChange={v => { setDevicesPerPage(v); setDevicesPage(1); }} />
        </CardContent>
      </Card>

      <Dialog open={!!newKey} onOpenChange={() => setNewKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Device API Key</DialogTitle>
            <DialogDescription>Copy this now — it will not be shown again. Configure it on the device (or its bridge software) as the X-Device-Key header, alongside X-Device-Code: {newKey?.deviceCode}.</DialogDescription>
          </DialogHeader>
          <div className="p-3 bg-muted rounded-lg font-mono text-sm break-all">{newKey?.apiKey}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ── Class teachers panel ─────────────────────────────────────────────────────

const ClassTeachersPanel = () => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [grades, setGrades] = useState<{ uuid: string; name: string; displayOrder: number; streamNames: string[] }[]>([]);
  const [form, setForm] = useState({ teacherUuid: "", gradeLevelUuid: "", stream: "" });
  const [assignmentsPage, setAssignmentsPage] = useState(1);
  const [assignmentsPerPage, setAssignmentsPerPage] = useState(10);

  const load = () => ClassTeacherApi.getAll().then(setAssignments);
  useEffect(() => {
    load();
    StaffApi.getAll().then((data) => setStaff(data.filter((s: any) => s.staffType === "TEACHING")));
    SchoolApi.getGradeLevels().then((data) => {
      const list = Array.isArray(data) ? data : [];
      setGrades(
        list
          .map((g: any) => ({ uuid: g.uuid, name: g.name, displayOrder: g.displayOrder, streamNames: Array.isArray(g.streamNames) ? g.streamNames : [] }))
          .sort((a, b) => a.displayOrder - b.displayOrder)
      );
    });
  }, []);

  const teacherOptions = staff.map((s) => ({ value: s.uuid, label: `${s.firstName} ${s.lastName} (${s.staffId})` }));

  // A grade/stream that already has a class teacher must not be offered again — each stream (or each
  // grade with no streams) can only ever have one class teacher.
  const assignedKeys = new Set(assignments.map((a) => `${a.gradeLevelUuid}::${a.stream ?? ""}`));
  const availableStreamsFor = (grade: { uuid: string; streamNames: string[] }) =>
    grade.streamNames.filter((s) => !assignedKeys.has(`${grade.uuid}::${s}`));

  const gradeOptions = grades
    .filter((g) => (g.streamNames.length === 0 ? !assignedKeys.has(`${g.uuid}::`) : availableStreamsFor(g).length > 0))
    .map((g) => ({ value: g.uuid, label: g.name }));

  const selectedGrade = grades.find((g) => g.uuid === form.gradeLevelUuid);
  const gradeHasStreams = (selectedGrade?.streamNames.length ?? 0) > 0;
  const streamOptions = selectedGrade ? availableStreamsFor(selectedGrade).map((s) => ({ value: s, label: s })) : [];

  const handleAssign = async () => {
    if (!form.teacherUuid || !form.gradeLevelUuid || (gradeHasStreams && !form.stream)) {
      Swal.fire({ icon: "error", title: gradeHasStreams ? "Teacher, grade and stream are all required" : "Teacher and grade are required", showConfirmButton: true });
      return;
    }
    try {
      await ClassTeacherApi.assign(form);
      Swal.fire({ title: "Success", text: "Class teacher assigned", icon: "success", showConfirmButton: true });
      setForm({ teacherUuid: "", gradeLevelUuid: "", stream: "" });
      load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Failed to assign", text: getBackendErrorMessage(err), showConfirmButton: true });
    }
  };

  const handleUnassign = async (uuid: string) => {
    try { await ClassTeacherApi.unassign(uuid); Swal.fire({ title: "Success", text: "Assignment removed", icon: "success", showConfirmButton: true }); load(); }
    catch (err) { Swal.fire({ icon: "error", title: "Failed to remove", text: getBackendErrorMessage(err), showConfirmButton: true }); }
  };

  const totalAssignmentsPages = Math.ceil(assignments.length / assignmentsPerPage);
  const pagedAssignments = assignments.slice((assignmentsPage - 1) * assignmentsPerPage, assignmentsPage * assignmentsPerPage);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Assign Class Teacher</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Teacher</Label>
            <Combobox
              options={teacherOptions}
              value={form.teacherUuid}
              onChange={(v) => setForm({ ...form, teacherUuid: v })}
              placeholder="Select teacher"
              searchPlaceholder="Search teachers..."
              emptyText="No teaching staff found."
            />
          </div>
          <div className="space-y-2">
            <Label>Grade</Label>
            <Combobox
              options={gradeOptions}
              value={form.gradeLevelUuid}
              onChange={(v) => setForm({ ...form, gradeLevelUuid: v, stream: "" })}
              placeholder="Select grade"
              searchPlaceholder="Search grades..."
              emptyText="No grades found."
            />
          </div>
          {gradeHasStreams && (
            <div className="space-y-2">
              <Label>Stream</Label>
              <Combobox
                options={streamOptions}
                value={form.stream}
                onChange={(v) => setForm({ ...form, stream: v })}
                placeholder="Select stream"
                searchPlaceholder="Search streams..."
                emptyText="No streams found."
              />
            </div>
          )}
          <Button onClick={handleAssign} className="w-full"><UserCheck className="w-4 h-4 mr-1" /> Assign</Button>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="text-base">Current Assignments</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Teacher</TableHead><TableHead>Staff ID</TableHead><TableHead>Class</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {pagedAssignments.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">No class teachers assigned yet.</TableCell></TableRow>
              ) : pagedAssignments.map((a) => (
                <TableRow key={a.uuid}>
                  <TableCell className="font-medium">{a.teacherName}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{a.staffId}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{a.grade} {a.stream}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleUnassign(a.uuid)}><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination currentPage={assignmentsPage} totalPages={totalAssignmentsPages} onPageChange={setAssignmentsPage}
            itemsPerPage={assignmentsPerPage} onItemsPerPageChange={v => { setAssignmentsPerPage(v); setAssignmentsPage(1); }} />
        </CardContent>
      </Card>
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────

const staffConfig: OwnerConfig = {
  label: "Staff",
  getAll: () => StaffApi.getAll(),
  labelFor: (p) => `${p.firstName} ${p.lastName}`,
  refFor: (p) => p.staffId,
  api: BiometricsApi.staff,
};

const studentConfig: OwnerConfig = {
  label: "Student",
  getAll: () => StudentApi.getAll(),
  labelFor: (p) => `${p.firstName} ${p.lastName}`,
  refFor: (p) => p.admissionNumber,
  api: BiometricsApi.student,
};

const BiometricsSetupPage = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/management")}><ArrowLeft className="w-5 h-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Biometrics & Devices</h1>
          <p className="text-muted-foreground">Enroll staff/student fingerprints, manage devices, and assign class teachers</p>
        </div>
      </div>

      <Tabs defaultValue="staff">
        <TabsList>
          <TabsTrigger value="staff">Staff Enrollment</TabsTrigger>
          <TabsTrigger value="students">Student Enrollment</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="classteachers">Class Teachers</TabsTrigger>
        </TabsList>
        <TabsContent value="staff" className="mt-4"><EnrollmentPanel config={staffConfig} /></TabsContent>
        <TabsContent value="students" className="mt-4"><EnrollmentPanel config={studentConfig} /></TabsContent>
        <TabsContent value="devices" className="mt-4"><DevicesPanel /></TabsContent>
        <TabsContent value="classteachers" className="mt-4"><ClassTeachersPanel /></TabsContent>
      </Tabs>
    </div>
  );
};

export default BiometricsSetupPage;
