import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import { CommunicationApi } from "@/services/api";

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

const ParentMessages = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    CommunicationApi.getInbox().then(setMessages).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleOpen = async (msg: any) => {
    if (msg.read) return;
    setMessages((prev) => prev.map((m) => (m.uuid === msg.uuid ? { ...m, read: true } : m)));
    try { await CommunicationApi.markRead(msg.uuid); } catch { /* keep optimistic state */ }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
        <p className="text-muted-foreground">Communications from school</p>
      </div>

      <div className="space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No messages yet.</p>
        ) : messages.map((msg) => (
          <Card
            key={msg.uuid}
            onClick={() => handleOpen(msg)}
            className={`hover:shadow-md transition-shadow cursor-pointer ${!msg.read ? "border-primary/30 bg-primary/[0.02]" : ""}`}
          >
            <CardContent className="p-4 flex items-start gap-3">
              <div className={`p-2 rounded-lg shrink-0 ${!msg.read ? "bg-primary/10" : "bg-muted"}`}>
                <MessageSquare className={`w-4 h-4 ${!msg.read ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className={`text-sm ${!msg.read ? "font-bold" : "font-medium"}`}>{msg.message?.subject}</p>
                  {!msg.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground">{msg.message?.senderName} · {fmtDate(msg.receivedAt)}</p>
                <p className="text-sm text-muted-foreground mt-1 truncate">{msg.message?.body}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ParentMessages;
