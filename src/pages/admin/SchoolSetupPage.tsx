import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, Upload, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SchoolApi } from "@/services/api";
import GradeLevelsPage from "./GradeLevelsPage";
import DepartmentsPage from "./DepartmentsPage";
import BranchesPage from "./BranchesPage";

const SchoolSetupPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [info, setInfo] = useState<any>({});

  useEffect(() => {
    SchoolApi.getInfo().then((data) => {
      if (data) setInfo(data);
    });
  }, []);

  const set = (field: string, value: any) => setInfo((prev: any) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    await SchoolApi.saveInfo(info);
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
              {/* Logo */}
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
                    <button onClick={() => setLogoPreview(null)} className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
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

              {/* Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>School Name</Label>
                  <Input value={info.name ?? ""} onChange={(e) => set("name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Registration Number</Label>
                  <Input value={info.registrationNumber ?? ""} onChange={(e) => set("registrationNumber", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input type="email" value={info.email ?? ""} onChange={(e) => set("email", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input value={info.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>County</Label>
                  <Input value={info.county ?? ""} onChange={(e) => set("county", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Sub-County</Label>
                  <Input value={info.subCounty ?? ""} onChange={(e) => set("subCounty", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Postal Address</Label>
                  <Input value={info.postalAddress ?? ""} onChange={(e) => set("postalAddress", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input value={info.website ?? ""} onChange={(e) => set("website", e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Physical Address</Label>
                  <Input value={info.physicalAddress ?? ""} onChange={(e) => set("physicalAddress", e.target.value)} />
                </div>

                {/* Toggles */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium text-sm">Has Branches</p>
                    <p className="text-xs text-muted-foreground">School operates across multiple branches</p>
                  </div>
                  <Switch
                    checked={!!info.hasBranch}
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
                    onCheckedChange={(v) => set("hasDepartment", v)}
                    className="data-[state=checked]:bg-green-500"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <Button onClick={handleSave}><Save className="w-4 h-4 mr-1" /> Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grade-levels" className="mt-4"><GradeLevelsPage /></TabsContent>
        <TabsContent value="departments" className="mt-4"><DepartmentsPage /></TabsContent>
        <TabsContent value="branches" className="mt-4"><BranchesPage /></TabsContent>
      </Tabs>
    </div>
  );
};

export default SchoolSetupPage;
