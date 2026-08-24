import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Send, Users, Mail, Eye } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import { CommunicationApi } from "@/services/api";
import { getBackendErrorMessage } from "@/utils/errorHandler";
import { GRADES } from "@/data/feesMock";
import { useAuth } from "@/context/AuthContext";
import Swal from "sweetalert2";

const AUDIENCE_LABELS: Record<string, string> = {
  ALL_PARENTS: "All Parents",
  ALL_TEACHERS: "All Teachers",
  ALL_STAFF: "All Staff",
  PARENTS_BY_GRADE: "Parents — Grade",
};

const CHANNEL_LABELS: Record<string, string> = {
  IN_APP: "In-App",
  SMS: "SMS",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
};

const fmtDate = (iso: string) => new Date(iso).toLocaleString();

const CommunicationPage = () => {
  const { hasPermission } = useAuth();
  // Message-history load actually requires COMMUNICATION_MANAGE on the backend (not
  // COMMUNICATION_VIEW, which this page doesn't use); sending is gated independently on
  // COMMUNICATION_SEND so a user can hold one without the other.
  const canViewMessages = hasPermission("COMMUNICATION_MANAGE");
  const canSend = hasPermission("COMMUNICATION_SEND");
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const [audience, setAudience] = useState("ALL_PARENTS");
  const [gradeFilter, setGradeFilter] = useState(GRADES[0]);
  const [channel, setChannel] = useState("IN_APP");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const load = () => {
    setLoading(true);
    CommunicationApi.getMessages().then(setMessages).finally(() => setLoading(false));
  };
  useEffect(() => { if (canViewMessages) load(); }, [canViewMessages]);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      Swal.fire({ icon: "error", title: "Error", text: "Subject and message body are required", showConfirmButton: true });
      return;
    }
    setSending(true);
    try {
      await CommunicationApi.sendMessage({
        subject,
        body,
        channel,
        audience,
        gradeFilter: audience === "PARENTS_BY_GRADE" ? gradeFilter : undefined,
      });
      setSubject("");
      setBody("");
      Swal.fire({ title: "Success", text: "Message sent", icon: "success", showConfirmButton: true });
      load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: getBackendErrorMessage(err, "Failed to send message"), showConfirmButton: true });
    } finally {
      setSending(false);
    }
  };

  const totalRecipients = messages.reduce((sum, m) => sum + (m.recipientCount ?? 0), 0);
  const distinctAudiences = new Set(messages.map((m) => m.audience)).size;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Communication</h1>
        <p className="text-muted-foreground">Send in-app announcements to parents, teachers, or staff</p>
      </div>

      {canViewMessages && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Messages Sent" value={messages.length} icon={Send} iconColor="bg-primary/10 text-primary" />
          <StatCard title="Recipients Reached" value={totalRecipients} icon={Users} iconColor="bg-info/10 text-info" />
          <StatCard title="Audiences Used" value={distinctAudiences} icon={MessageSquare} iconColor="bg-success/10 text-success" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compose */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Compose Message</CardTitle>
            <CardDescription>Delivered in-app to recipients' inbox</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Select value={audience} onValueChange={setAudience}>
                <SelectTrigger><SelectValue placeholder="Recipients" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(AUDIENCE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger><SelectValue placeholder="Channel" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CHANNEL_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {audience === "PARENTS_BY_GRADE" && (
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger><SelectValue placeholder="Grade" /></SelectTrigger>
                <SelectContent>
                  {GRADES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <Textarea placeholder="Type your message here..." rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              In-app delivery always happens. SMS/WhatsApp/Email are only actually dispatched if enabled in Settings, and skip any recipient who has personally opted out of that channel.
            </p>
            {canSend && (
              <Button size="sm" disabled={sending} onClick={handleSend}>
                <Send className="w-4 h-4 mr-1" /> {sending ? "Sending..." : "Send"}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Recent */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Messages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!canViewMessages ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center text-center">
                <Eye className="w-4 h-4 shrink-0" /> You don't have permission to view sent messages.
              </div>
            ) : loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
            ) : messages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No messages sent yet.</p>
            ) : messages.map((msg) => (
              <div key={msg.uuid} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                <div className="p-2 rounded-lg bg-muted">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{msg.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {AUDIENCE_LABELS[msg.audience] ?? msg.audience}{msg.gradeFilter ? ` ${msg.gradeFilter}` : ""} · {msg.senderName}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px]">{CHANNEL_LABELS[msg.channel] ?? msg.channel}</Badge>
                    <span className="text-[10px] text-muted-foreground">{fmtDate(msg.sentAt)}</span>
                  </div>
                </div>
                <Badge variant="default" className="text-[10px] shrink-0">{msg.recipientCount} recipient{msg.recipientCount === 1 ? "" : "s"}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CommunicationPage;
