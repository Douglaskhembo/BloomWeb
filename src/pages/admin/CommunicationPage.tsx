import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Users, Bell, Mail } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";

const recentMessages = [
  { to: "All Parents - Grade 5", subject: "Term 1 Exam Schedule", channel: "SMS", date: "2026-04-07", status: "Delivered" },
  { to: "All Teachers", subject: "Staff Meeting - Friday", channel: "WhatsApp", date: "2026-04-06", status: "Delivered" },
  { to: "Parents - Fee Defaulters", subject: "Fee Reminder", channel: "SMS", date: "2026-04-05", status: "Delivered" },
  { to: "All Parents", subject: "Sports Day Announcement", channel: "Email", date: "2026-04-04", status: "Sent" },
];

const CommunicationPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Communication</h1>
        <p className="text-muted-foreground">Bulk messaging, alerts, and announcements</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Messages Sent" value={1284} change="This term" changeType="neutral" icon={Send} iconColor="bg-primary/10 text-primary" />
        <StatCard title="SMS Credits" value={3420} icon={MessageSquare} iconColor="bg-success/10 text-success" />
        <StatCard title="Groups" value={14} icon={Users} iconColor="bg-info/10 text-info" />
        <StatCard title="Emergency Alerts" value={2} change="This month" changeType="neutral" icon={Bell} iconColor="bg-warning/10 text-warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compose */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Compose Message</CardTitle>
            <CardDescription>Send SMS, WhatsApp, or email to groups</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Select recipients (e.g., All Parents - Grade 5)" />
            <Input placeholder="Subject" />
            <Textarea placeholder="Type your message here..." rows={4} />
            <div className="flex items-center gap-2">
              <Button size="sm"><Send className="w-4 h-4 mr-1" /> Send SMS</Button>
              <Button size="sm" variant="outline"><MessageSquare className="w-4 h-4 mr-1" /> WhatsApp</Button>
              <Button size="sm" variant="outline"><Mail className="w-4 h-4 mr-1" /> Email</Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Messages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentMessages.map((msg, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                <div className="p-2 rounded-lg bg-muted">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{msg.subject}</p>
                  <p className="text-xs text-muted-foreground">{msg.to}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px]">{msg.channel}</Badge>
                    <span className="text-[10px] text-muted-foreground">{msg.date}</span>
                  </div>
                </div>
                <Badge variant="default" className="text-[10px] shrink-0">{msg.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CommunicationPage;
