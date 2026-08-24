import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, Shield } from "lucide-react";
import { NotificationApi } from "@/services/api";
import { getBackendErrorMessage } from "@/utils/errorHandler";
import NotificationPreferencesCard from "@/components/notifications/NotificationPreferencesCard";
import Swal from "sweetalert2";

type ChannelSettings = { smsEnabled: boolean; whatsappEnabled: boolean; emailEnabled: boolean; inAppEnabled: boolean };

const SettingsPage = () => {
  const [channels, setChannels] = useState<ChannelSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingChannel, setSavingChannel] = useState<keyof ChannelSettings | null>(null);

  useEffect(() => {
    NotificationApi.getChannelSettings()
      .then((res) => setChannels({ smsEnabled: !!res.smsEnabled, whatsappEnabled: !!res.whatsappEnabled, emailEnabled: !!res.emailEnabled, inAppEnabled: res.inAppEnabled !== false }))
      .catch((err) => Swal.fire({ icon: "error", title: "Couldn't load notification channel settings", text: getBackendErrorMessage(err), showConfirmButton: true }))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (field: keyof ChannelSettings, checked: boolean) => {
    if (!channels) return;
    const next = { ...channels, [field]: checked };
    setChannels(next);
    setSavingChannel(field);
    try {
      await NotificationApi.updateChannelSettings(next);
    } catch (err) {
      setChannels(channels);
      Swal.fire({ icon: "error", title: "Couldn't save channel setting", text: getBackendErrorMessage(err), showConfirmButton: true });
    } finally {
      setSavingChannel(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">System preferences and configuration</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Bell className="w-4 h-4" /> Notification Channels</CardTitle>
            <CardDescription>Turn on the channels available school-wide — staff and parents can only select a channel here once it's enabled</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading || !channels ? (
              <p className="text-sm text-muted-foreground py-4">Loading...</p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <Label>In-App</Label>
                  <Switch checked={channels.inAppEnabled} disabled={savingChannel === "inAppEnabled"} onCheckedChange={(c) => handleToggle("inAppEnabled", c)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Email</Label>
                  <Switch checked={channels.emailEnabled} disabled={savingChannel === "emailEnabled"} onCheckedChange={(c) => handleToggle("emailEnabled", c)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>SMS</Label>
                  <Switch checked={channels.smsEnabled} disabled={savingChannel === "smsEnabled"} onCheckedChange={(c) => handleToggle("smsEnabled", c)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>WhatsApp</Label>
                  <Switch checked={channels.whatsappEnabled} disabled={savingChannel === "whatsappEnabled"} onCheckedChange={(c) => handleToggle("whatsappEnabled", c)} />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Shield className="w-4 h-4" /> Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Two-Factor Authentication</Label>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <Label>Audit Logging</Label>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        <NotificationPreferencesCard />
      </div>
    </div>
  );
};

export default SettingsPage;
