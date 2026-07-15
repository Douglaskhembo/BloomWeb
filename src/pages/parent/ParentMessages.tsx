import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Bell } from "lucide-react";

const messages = [
  { from: "School Admin", subject: "Term 1 Exam Schedule", date: "Apr 7, 2026", preview: "Dear Parent, please note that Term 1 exams will begin on April 14...", read: false },
  { from: "Mrs. Njeri (Class Teacher)", subject: "Joy's Progress Update", date: "Apr 5, 2026", preview: "I wanted to share that Joy has shown great improvement in Mathematics...", read: false },
  { from: "School Admin", subject: "Sports Day Announcement", date: "Apr 4, 2026", preview: "We are excited to announce the annual inter-house sports day...", read: true },
  { from: "Finance Office", subject: "Fee Statement - Term 1", date: "Apr 1, 2026", preview: "Please find attached your fee statement for Term 1, 2026...", read: true },
  { from: "Transport Office", subject: "Route B Schedule Change", date: "Mar 28, 2026", preview: "Please note that Route B pickup time will change to 6:45 AM...", read: true },
];

const ParentMessages = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
        <p className="text-muted-foreground">Communications from school</p>
      </div>

      <div className="space-y-2">
        {messages.map((msg, i) => (
          <Card key={i} className={`hover:shadow-md transition-shadow cursor-pointer ${!msg.read ? "border-primary/30 bg-primary/[0.02]" : ""}`}>
            <CardContent className="p-4 flex items-start gap-3">
              <div className={`p-2 rounded-lg shrink-0 ${!msg.read ? "bg-primary/10" : "bg-muted"}`}>
                <MessageSquare className={`w-4 h-4 ${!msg.read ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className={`text-sm ${!msg.read ? "font-bold" : "font-medium"}`}>{msg.subject}</p>
                  {!msg.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground">{msg.from} · {msg.date}</p>
                <p className="text-sm text-muted-foreground mt-1 truncate">{msg.preview}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ParentMessages;
