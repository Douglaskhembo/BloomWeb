import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, ShieldCheck, KeyRound } from "lucide-react";
import Swal from "sweetalert2";
import { StaffApi, authAPI } from "@/services/api";
import { getBackendErrorMessage } from "@/utils/errorHandler";

const STATUS_LABELS: Record<string, string> = { ACTIVE: "Active", ON_LEAVE: "On Leave", RESIGNED: "Resigned", SUSPENDED: "Suspended" };
const STATUS_BADGE: Record<string, "default" | "secondary" | "destructive"> = { ACTIVE: "default", ON_LEAVE: "secondary", RESIGNED: "destructive", SUSPENDED: "destructive" };

const TeacherProfile = () => {
  const [staff, setStaff] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ phone: "", email: "", address: "", emergencyContactName: "", emergencyContactPhone: "", emergencyContactRelationship: "" });

  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [changingPassword, setChangingPassword] = useState(false);

  const load = () => {
    setLoading(true);
    StaffApi.getMyProfile()
      .then((s) => {
        setStaff(s);
        setForm({
          phone: s.phone ?? "", email: s.email ?? "", address: s.address ?? "",
          emergencyContactName: s.emergencyContactName ?? "", emergencyContactPhone: s.emergencyContactPhone ?? "",
          emergencyContactRelationship: s.emergencyContactRelationship ?? "",
        });
      })
      .catch((err) => Swal.fire({ icon: "error", title: "Couldn't load your profile", text: getBackendErrorMessage(err), showConfirmButton: true }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.phone || !form.email) {
      Swal.fire({ icon: "error", title: "Phone and email are required", showConfirmButton: true });
      return;
    }
    setSaving(true);
    try {
      await StaffApi.updateMyProfile(form);
      Swal.fire({ title: "Saved", text: "Your profile has been updated", icon: "success", showConfirmButton: true });
      load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Couldn't save changes", text: getBackendErrorMessage(err), showConfirmButton: true });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword) {
      Swal.fire({ icon: "error", title: "Fill in all password fields", showConfirmButton: true });
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      Swal.fire({ icon: "error", title: "New password and confirmation don't match", showConfirmButton: true });
      return;
    }
    setChangingPassword(true);
    try {
      await authAPI.changePassword(pwForm);
      Swal.fire({ title: "Password changed", icon: "success", showConfirmButton: true });
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Couldn't change password", text: getBackendErrorMessage(err), showConfirmButton: true });
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground text-center py-16">Loading your profile...</p>;
  if (!staff) return <p className="text-sm text-muted-foreground text-center py-16">No staff profile is linked to this account.</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground">Your staff record, contact details, and account security</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-primary">{staff.firstName?.charAt(0)}{staff.lastName?.charAt(0)}</span>
            </div>
            <div>
              <CardTitle className="text-lg">{staff.firstName} {staff.lastName}</CardTitle>
              <CardDescription>{staff.staffId} · {staff.staffRole?.name ?? staff.staffType}</CardDescription>
            </div>
            <Badge variant={STATUS_BADGE[staff.status] ?? "outline"} className="ml-auto">{STATUS_LABELS[staff.status] ?? staff.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div><span className="text-muted-foreground">Employment Type</span><p className="font-medium">{staff.employmentType ?? "—"}</p></div>
          <div><span className="text-muted-foreground">Joined</span><p className="font-medium">{staff.joined ?? "—"}</p></div>
          <div><span className="text-muted-foreground">Qualification</span><p className="font-medium">{staff.qualification || "—"}</p></div>
          <div><span className="text-muted-foreground">Experience</span><p className="font-medium">{staff.experience || "—"}</p></div>
          {staff.staffType === "TEACHING" && (
            <div className="md:col-span-2">
              <span className="text-muted-foreground">Subjects</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {(staff.subjects ?? []).length === 0
                  ? <span className="text-xs text-muted-foreground">None assigned</span>
                  : staff.subjects.map((s: any) => <Badge key={s.uuid} variant="outline" className="text-[10px]">{s.name}</Badge>)}
              </div>
            </div>
          )}
          <p className="md:col-span-2 text-xs text-muted-foreground pt-2 border-t">
            Role, employment type, and subjects are managed by HR — contact the school office to update these.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4" /> Contact Details</CardTitle>
          <CardDescription>Keep these up to date so the school can reach you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><Mail className="w-3 h-3" /> Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
          </div>
          <div className="pt-2 border-t space-y-4">
            <p className="text-sm font-medium">Emergency Contact</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1"><Label className="text-xs">Name</Label><Input value={form.emergencyContactName} onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Phone</Label><Input value={form.emergencyContactPhone} onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Relationship</Label><Input value={form.emergencyContactRelationship} onChange={(e) => setForm({ ...form, emergencyContactRelationship: e.target.value })} /></div>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><KeyRound className="w-4 h-4" /> Change Password</CardTitle>
          <CardDescription>Use a strong password you don't use elsewhere</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Current Password</Label>
              <Input type="password" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">New Password</Label>
              <Input type="password" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Confirm New Password</Label>
              <Input type="password" value={pwForm.confirmPassword} onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })} />
            </div>
          </div>
          <Button variant="outline" onClick={handleChangePassword} disabled={changingPassword}>
            <ShieldCheck className="w-4 h-4 mr-1" /> {changingPassword ? "Changing..." : "Change Password"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherProfile;
