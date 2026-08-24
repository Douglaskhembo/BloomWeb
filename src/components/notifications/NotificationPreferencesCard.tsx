import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell } from "lucide-react";
import { NotificationApi } from "@/services/api";
import { getBackendErrorMessage } from "@/utils/errorHandler";
import Swal from "sweetalert2";

const CHANNEL_LABELS: Record<string, string> = {
  IN_APP: "In-App",
  EMAIL: "Email",
  SMS: "SMS",
  WHATSAPP: "WhatsApp",
};

const CHANNEL_FIELD: Record<string, "inAppEnabled" | "emailEnabled" | "smsEnabled" | "whatsappEnabled"> = {
  IN_APP: "inAppEnabled",
  EMAIL: "emailEnabled",
  SMS: "smsEnabled",
  WHATSAPP: "whatsappEnabled",
};

type Preferences = { smsEnabled: boolean; whatsappEnabled: boolean; emailEnabled: boolean; inAppEnabled: boolean };

/** Lets the current user pick which channels they want notifications on — only channels the
 *  admin has enabled org-wide (Settings > Notifications) are shown here at all. */
const NotificationPreferencesCard = () => {
  const [availableChannels, setAvailableChannels] = useState<string[]>([]);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingChannel, setSavingChannel] = useState<string | null>(null);

  useEffect(() => {
    NotificationApi.getMyPreferences()
      .then((res) => {
        setAvailableChannels(res.availableChannels ?? []);
        setPreferences(res.preferences ?? { smsEnabled: true, whatsappEnabled: true, emailEnabled: true, inAppEnabled: true });
      })
      .catch((err) => Swal.fire({ icon: "error", title: "Couldn't load notification preferences", text: getBackendErrorMessage(err), showConfirmButton: true }))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (channel: string, checked: boolean) => {
    if (!preferences) return;
    const field = CHANNEL_FIELD[channel];
    const next = { ...preferences, [field]: checked };
    setPreferences(next);
    setSavingChannel(channel);
    try {
      await NotificationApi.updateMyPreferences(next);
    } catch (err) {
      setPreferences(preferences);
      Swal.fire({ icon: "error", title: "Couldn't save preference", text: getBackendErrorMessage(err), showConfirmButton: true });
    } finally {
      setSavingChannel(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Bell className="w-4 h-4" /> My Notification Preferences</CardTitle>
        <CardDescription>Choose how you want to be notified — only channels enabled by your admin appear here</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground py-4">Loading...</p>
        ) : availableChannels.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Your admin hasn't enabled any notification channels yet.</p>
        ) : (
          availableChannels.map((channel) => (
            <div key={channel} className="flex items-center justify-between">
              <Label>{CHANNEL_LABELS[channel] ?? channel}</Label>
              <Switch
                checked={preferences ? preferences[CHANNEL_FIELD[channel]] : false}
                disabled={savingChannel === channel}
                onCheckedChange={(checked) => handleToggle(channel, checked)}
              />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationPreferencesCard;
