import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Pencil, Save, Upload, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { SchoolApi } from "@/services/api";
import { getBackendErrorMessage } from "@/utils/errorHandler";
import GradeLevelsPage from "./GradeLevelsPage";
import DepartmentsPage from "./DepartmentsPage";
import BranchesPage from "./BranchesPage";
import SchoolBankAccountsPage from "./SchoolBankAccountsPage";

const SchoolSetupPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [info, setInfo] = useState<any>({});
  const [originalInfo, setOriginalInfo] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("bio-data");

  const isNew = !info.uuid;
  const locked = !isNew && !editing;

  useEffect(() => {
    SchoolApi.getInfo().then((data) => {
      if (data) {
        setInfo(data);
        setOriginalInfo(data);
      }
    });
  }, []);

  const set = (field: string, value: any) => setInfo((prev: any) => ({ ...prev, [field]: value }));

  const handleEdit = () => setEditing(true);

  const handleCancel = () => {
    setInfo(originalInfo);
    setEditing(false);
  };

  useEffect(() => {
    if (activeTab === "departments" && !info.hasDepartment) setActiveTab("bio-data");
    if (activeTab === "branches" && !info.hasBranch) setActiveTab("bio-data");
  }, [info.hasDepartment, info.hasBranch, activeTab]);

  const handleSave = async () => {
    if (!info.name?.trim()) {
      Swal.fire({ icon: "error", title: "Error", text: "School Name is required", showConfirmButton: true });
      return;
    }
    setSaving(true);
    try {
      const saved = await SchoolApi.saveInfo(info);
      if (saved) {
        setInfo(saved);
        setOriginalInfo(saved);
      }
      setEditing(false);
      Swal.fire({ title: "Success", text: isNew ? "School created" : "School information updated", icon: "success", showConfirmButton: true });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: getBackendErrorMessage(err, "Failed to save school information"), showConfirmButton: true });
    } finally {
      setSaving(false);
    }
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
        <div>
          <h1 className="text-2xl font-bold tracking-tight">School Setup</h1>
          <p className="text-muted-foreground">Manage school information and structure</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="bio-data">Bio Data</TabsTrigger>
          <TabsTrigger value="grade-levels">Grade Levels</TabsTrigger>
          {info.hasDepartment && <TabsTrigger value="departments">Departments</TabsTrigger>}
          {info.hasBranch && <TabsTrigger value="branches">Branches</TabsTrigger>}
          <TabsTrigger value="bank-accounts">Bank Accounts</TabsTrigger>
        </TabsList>

        <TabsContent value="bio-data" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-lg">School Information</CardTitle>
                <CardDescription>Basic details about your school</CardDescription>
              </div>
              {locked && (
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {/* Logo */}
              <div className="flex items-center gap-6 mb-8 pb-6 border-b">
                <div className="relative">
                  <div
                    className={`w-24 h-24 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center overflow-hidden bg-muted/50 transition-colors ${locked ? "cursor-not-allowed" : "cursor-pointer hover:border-primary/50"}`}
                    onClick={() => !locked && fileInputRef.current?.click()}
                  >
                    {logoPreview ? (
                      <img src={logoPreview} alt="School logo" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <Upload className="w-8 h-8 text-muted-foreground/50" />
                    )}
                  </div>
                  {logoPreview && (
                    <button onClick={() => setLogoPreview(null)} className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium">School Logo</Label>
                  <p className="text-xs text-muted-foreground mt-1">Upload a logo (PNG, JPG). Recommended 200×200px.</p>
                  <Button variant="outline" size="sm" className="mt-2" disabled={locked} onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-3 h-3 mr-1" /> Choose File
                  </Button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" disabled={locked} onChange={handleLogoChange} />
                </div>
              </div>

              {/* Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>School Name</Label>
                  <Input value={info.name ?? ""} disabled={locked} onChange={(e) => set("name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Registration Number</Label>
                  <Input value={info.registrationNumber ?? ""} disabled={locked} onChange={(e) => set("registrationNumber", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input type="email" value={info.email ?? ""} disabled={locked} onChange={(e) => set("email", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input value={info.phone ?? ""} disabled={locked} onChange={(e) => set("phone", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>County</Label>
                  <Input value={info.county ?? ""} disabled={locked} onChange={(e) => set("county", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Sub-County</Label>
                  <Input value={info.subCounty ?? ""} disabled={locked} onChange={(e) => set("subCounty", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Postal Address</Label>
                  <Input value={info.postalAddress ?? ""} disabled={locked} onChange={(e) => set("postalAddress", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input value={info.website ?? ""} disabled={locked} onChange={(e) => set("website", e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Physical Address</Label>
                  <Input value={info.physicalAddress ?? ""} disabled={locked} onChange={(e) => set("physicalAddress", e.target.value)} />
                </div>

                {/* Toggles */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium text-sm">Has Branches</p>
                    <p className="text-xs text-muted-foreground">School operates across multiple branches</p>
                  </div>
                  <Switch
                    checked={!!info.hasBranch}
                    disabled={locked}
                    onCheckedChange={(v) => set("hasBranch", v)}
                    className="data-[state=checked]:bg-green-500"
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium text-sm">Has Departments</p>
                    <p className="text-xs text-muted-foreground">School is organised into departments</p>
                  </div>
                  <Switch
                    checked={!!info.hasDepartment}
                    disabled={locked}
                    onCheckedChange={(v) => set("hasDepartment", v)}
                    className="data-[state=checked]:bg-green-500"
                  />
                </div>
              </div>

              {!locked && (
                <div className="flex justify-end gap-2 mt-6">
                  {editing && (
                    <Button variant="outline" onClick={handleCancel} disabled={saving}>Cancel</Button>
                  )}
                  <Button onClick={handleSave} disabled={saving}>
                    <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : isNew ? "Create School" : "Edit School"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grade-levels" className="mt-4"><GradeLevelsPage /></TabsContent>
        {info.hasDepartment && <TabsContent value="departments" className="mt-4"><DepartmentsPage /></TabsContent>}
        {info.hasBranch && <TabsContent value="branches" className="mt-4"><BranchesPage /></TabsContent>}
        <TabsContent value="bank-accounts" className="mt-4"><SchoolBankAccountsPage /></TabsContent>
      </Tabs>
    </div>
  );
};

export default SchoolSetupPage;
