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
import { ArrowLeft, Fingerprint, ScanFace, Trash2, KeyRound, RefreshCw, UserCheck, Upload, X, Usb } from "lucide-react";
import Swal from "sweetalert2";
import { StaffApi, StudentApi, BiometricsApi, DeviceApi, ClassTeacherApi, SchoolApi } from "@/services/api";
import { getBackendErrorMessage } from "@/utils/errorHandler";
import { fingerprintScanner, isFingerprintScannerSupported } from "@/lib/fingerprintScanner";
import { Combobox } from "@/components/ui/combobox";
import Pagination from "@/utils/Pagination";
import { useAuth } from "@/context/AuthContext";

const FINGER_NAMES = ["THUMB", "INDEX", "MIDDLE", "RING", "LITTLE"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Strips the data-URL prefix, leaving just the base64 payload the backend expects. */
const readFileAsBase64 = (file: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// ── Staff / Student enrollment panel ────────────────────────────────────────

interface OwnerConfig {
  label: string;
  getAll: () => Promise<any[]>;
  labelFor: (p: any) => string;
  refFor: (p: any) => string;
  api: typeof BiometricsApi.staff;
}

/** Capture slot for a single fingerprint scan — scans live off a connected Web Serial device
 *  when one is available, otherwise falls back to uploading a scan image (for testing without
 *  hardware, or a scan image produced by other means). Used for left/right enrollment scans
 *  and the probe image in the Identify card. */
const FingerprintCaptureSlot = ({
  label, file, onCapture, onClear, scannerConnected,
}: { label: string; file: File | null; onCapture: (file: File) => void; onClear: () => void; scannerConnected: boolean }) => {
  const [scanning, setScanning] = useState(false);

  const scanNow = async () => {
    setScanning(true);
    try {
      const blob = await fingerprintScanner.captureImage();
      onCapture(new File([blob], `scan-${Date.now()}.png`, { type: "image/png" }));
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Scan failed", text: err?.message ?? String(err), showConfirmButton: true });
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {file ? (
        <div className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-background">
          <Fingerprint className="w-4 h-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onClear}><X className="w-3.5 h-3.5" /></Button>
        </div>
      ) : scannerConnected ? (
        <Button type="button" variant="outline" className="w-full" onClick={scanNow} disabled={scanning}>
          <ScanFace className="w-4 h-4 mr-1" /> {scanning ? "Touch the sensor..." : "Scan Now"}
        </Button>
      ) : (
        <label className="flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 border-dashed border-muted-foreground/30 cursor-pointer hover:border-primary/50 transition-colors">
          <Upload className="w-5 h-5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">No scanner connected — upload a scan image instead (max 5MB)</span>
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > MAX_IMAGE_BYTES) {
                Swal.fire({ icon: "error", title: "File must be under 5MB", showConfirmButton: true });
                return;
              }
              onCapture(f);
            }}
          />
        </label>
      )}
    </div>
  );
};

const EnrollmentPanel = ({ config, scannerConnected }: { config: OwnerConfig; scannerConnected: boolean }) => {
  const [people, setPeople] = useState<any[]>([]);
  const [selectedUuid, setSelectedUuid] = useState("");
  const [bioData, setBioData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [reEnrolling, setReEnrolling] = useState(false);
  const [form, setForm] = useState({
    leftFingerName: "THUMB", rightFingerName: "THUMB",
    faceTemplateRef: "", enrolledDeviceId: "WEB-ENROLL",
  });
  const [leftFile, setLeftFile] = useState<File | null>(null);
  const [rightFile, setRightFile] = useState<File | null>(null);
  const [probeFile, setProbeFile] = useState<File | null>(null);
  const [identifying, setIdentifying] = useState(false);

  useEffect(() => { config.getAll().then(setPeople); }, [config]);

  const selectedPerson = people.find((p) => p.uuid === selectedUuid);
  const showForm = !bioData || reEnrolling;

  const resetFormState = () => {
    setLeftFile(null);
    setRightFile(null);
    setForm({ leftFingerName: "THUMB", rightFingerName: "THUMB", faceTemplateRef: "", enrolledDeviceId: "WEB-ENROLL" });
  };

  const loadBioData = async (uuid: string) => {
    setLoading(true);
    const data = await config.api.getBioData(uuid);
    setBioData(data);
    setReEnrolling(false);
    resetFormState();
    setLoading(false);
  };

  const handleSelect = (uuid: string) => {
    setSelectedUuid(uuid);
    setProbeFile(null);
    loadBioData(uuid);
  };

  const handleEnroll = async () => {
    if (!leftFile || !rightFile) {
      Swal.fire({ icon: "error", title: "Both left and right fingerprint scans are required", showConfirmButton: true });
      return;
    }
    if (bioData) {
      const confirmed = await Swal.fire({
        icon: "warning",
        title: "Replace existing fingerprint?",
        text: `This overwrites the previously enrolled left/right templates for this ${config.label.toLowerCase()}.`,
        showCancelButton: true,
        confirmButtonText: "Replace",
        cancelButtonText: "Cancel",
      });
      if (!confirmed.isConfirmed) return;
    }
    try {
      const [leftFingerprintImage, rightFingerprintImage] = await Promise.all([
        readFileAsBase64(leftFile), readFileAsBase64(rightFile),
      ]);
      await config.api.enroll(selectedUuid, {
        leftFingerprintImage, leftFingerName: form.leftFingerName,
        rightFingerprintImage, rightFingerName: form.rightFingerName,
        faceTemplateRef: form.faceTemplateRef || undefined,
        enrolledDeviceId: form.enrolledDeviceId,
      });
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

  const runIdentify = async () => {
    if (!probeFile) {
      Swal.fire({ icon: "error", title: "Upload a fingerprint scan to identify", showConfirmButton: true });
      return;
    }
    setIdentifying(true);
    try {
      const image = await readFileAsBase64(probeFile);
      const result = await BiometricsApi.identify({ image, deviceId: "WEB-TEST", remarks: "Test scan via browser" });
      Swal.fire({
        title: `${result.eventType === "CLOCK_IN" || result.eventType === "ENTRY" ? "Clocked in" : "Clocked out"}`,
        text: `${result.ownerName} (${result.ownerType}) — ${result.status} at ${new Date(result.clockInOrEntry ?? result.clockOutOrExit).toLocaleTimeString()} · match score ${Number(result.matchScore).toFixed(1)}`,
        icon: "success",
        showConfirmButton: true,
      });
      setProbeFile(null);
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "No match found", text: err?.message ?? getBackendErrorMessage(err), showConfirmButton: true });
    } finally {
      setIdentifying(false);
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

          {selectedUuid && !loading && showForm && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload a left and right fingerprint scan image from a scanner (or a sample ridge-pattern
                image for testing). The server extracts and encrypts a template from each — the image
                itself is never stored.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FingerprintCaptureSlot label="Left Fingerprint Scan" file={leftFile} onCapture={setLeftFile} onClear={() => setLeftFile(null)} scannerConnected={scannerConnected} />
                <div className="space-y-2">
                  <Label>Left Finger</Label>
                  <Select value={form.leftFingerName} onValueChange={(v) => setForm({ ...form, leftFingerName: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{FINGER_NAMES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <FingerprintCaptureSlot label="Right Fingerprint Scan" file={rightFile} onCapture={setRightFile} onClear={() => setRightFile(null)} scannerConnected={scannerConnected} />
                <div className="space-y-2">
                  <Label>Right Finger</Label>
                  <Select value={form.rightFingerName} onValueChange={(v) => setForm({ ...form, rightFingerName: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{FINGER_NAMES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Enrolling Device ID</Label>
                  <Input value={form.enrolledDeviceId} onChange={(e) => setForm({ ...form, enrolledDeviceId: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleEnroll}><Fingerprint className="w-4 h-4 mr-1" /> {bioData ? "Replace" : "Enroll"}</Button>
                {bioData && <Button variant="outline" onClick={() => { setReEnrolling(false); resetFormState(); }}>Cancel</Button>}
              </div>
            </div>
          )}

          {selectedUuid && !loading && !showForm && bioData && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={bioData.status === "ACTIVE" ? "default" : "secondary"}>{bioData.status}</Badge>
                <span className="text-xs text-muted-foreground">Enrolled {new Date(bioData.enrolledAt).toLocaleDateString()} on {bioData.enrolledDeviceId}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Left finger:</span> {bioData.leftFingerName}</div>
                <div><span className="text-muted-foreground">Right finger:</span> {bioData.rightFingerName}</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setReEnrolling(true)}>
                <Fingerprint className="w-4 h-4 mr-1" /> Re-enroll
              </Button>

              <div className="border-t pt-4 space-y-2">
                <p className="text-sm font-medium">Identify</p>
                <p className="text-xs text-muted-foreground">
                  Upload a probe fingerprint scan — the server matches it against every ACTIVE enrolled
                  student/staff (not just this person) and records the resulting attendance event.
                </p>
                <FingerprintCaptureSlot label="Probe Scan" file={probeFile} onCapture={setProbeFile} onClear={() => setProbeFile(null)} scannerConnected={scannerConnected} />
                <Button size="sm" onClick={runIdentify} disabled={identifying || !probeFile}>
                  <ScanFace className="w-4 h-4 mr-1" /> {identifying ? "Identifying..." : "Identify & Record Attendance"}
                </Button>
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
            <DialogDescription>Copy this now — it will not be shown again. Configure it on the device (or its bridge software) as the X-Device-Key header, alongside X-Device-Code: {newKey?.deviceCode}. The bridge should POST each captured fingerprint scan image to /attendance/device-capture — the server identifies who it is, not the device.</DialogDescription>
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
  const { hasPermission } = useAuth();
  const canManageAttendance = hasPermission("ATTENDANCE_MANAGE");
  const [scannerConnected, setScannerConnected] = useState(fingerprintScanner.connected);
  const [connecting, setConnecting] = useState(false);

  const connectScanner = async () => {
    setConnecting(true);
    try {
      await fingerprintScanner.connect();
      setScannerConnected(true);
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Couldn't connect to scanner", text: err?.message ?? String(err), showConfirmButton: true });
    } finally {
      setConnecting(false);
    }
  };

  const disconnectScanner = async () => {
    await fingerprintScanner.disconnect();
    setScannerConnected(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/management")}><ArrowLeft className="w-5 h-5" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Biometrics & Devices</h1>
          <p className="text-muted-foreground">Enroll staff/student fingerprints, manage devices, and assign class teachers</p>
        </div>
        {isFingerprintScannerSupported() ? (
          scannerConnected ? (
            <Button variant="outline" onClick={disconnectScanner}>
              <Usb className="w-4 h-4 mr-1 text-green-600" /> Scanner connected — Disconnect
            </Button>
          ) : (
            <Button variant="outline" onClick={connectScanner} disabled={connecting}>
              <Usb className="w-4 h-4 mr-1" /> {connecting ? "Connecting..." : "Connect Scanner"}
            </Button>
          )
        ) : (
          <span className="text-xs text-muted-foreground max-w-[220px] text-right">
            Live scanning needs Chrome or Edge (desktop/Android) — this browser will fall back to file upload.
          </span>
        )}
      </div>

      <Tabs defaultValue="staff">
        <TabsList>
          <TabsTrigger value="staff">Staff Enrollment</TabsTrigger>
          <TabsTrigger value="students">Student Enrollment</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="classteachers">Class Teachers</TabsTrigger>
        </TabsList>
        <TabsContent value="staff" className="mt-4"><EnrollmentPanel config={staffConfig} scannerConnected={scannerConnected} /></TabsContent>
        <TabsContent value="students" className="mt-4"><EnrollmentPanel config={studentConfig} scannerConnected={scannerConnected} /></TabsContent>
        <TabsContent value="devices" className="mt-4">
          {canManageAttendance ? <DevicesPanel /> : (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                You don't have permission to view or manage biometric devices.
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="classteachers" className="mt-4">
          {canManageAttendance ? <ClassTeachersPanel /> : (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                You don't have permission to view or manage class teacher assignments.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BiometricsSetupPage;
