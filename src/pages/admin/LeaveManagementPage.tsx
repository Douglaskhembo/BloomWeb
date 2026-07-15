import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, CalendarDays, CheckCircle, Clock, XCircle } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";

const leaveRequests = [
  { id: "LV-042", teacher: "Mrs. Sarah Wambui", type: "Sick Leave", from: "2026-04-07", to: "2026-04-11", days: 5, status: "Approved", reason: "Medical appointment" },
  { id: "LV-043", teacher: "Mr. Peter Ouma", type: "Annual Leave", from: "2026-04-14", to: "2026-04-18", days: 5, status: "Pending", reason: "Family event" },
  { id: "LV-044", teacher: "Mrs. Grace Akinyi", type: "Maternity", from: "2026-05-01", to: "2026-07-31", days: 90, status: "Approved", reason: "Maternity leave" },
  { id: "LV-045", teacher: "Mr. David Kibet", type: "Personal", from: "2026-04-10", to: "2026-04-10", days: 1, status: "Pending", reason: "Personal errand" },
  { id: "LV-046", teacher: "Mr. James Wafula", type: "Sick Leave", from: "2026-03-25", to: "2026-03-26", days: 2, status: "Approved", reason: "Flu" },
  { id: "LV-047", teacher: "Mrs. Mary Chebet", type: "Annual Leave", from: "2026-03-10", to: "2026-03-14", days: 5, status: "Rejected", reason: "Travel plans" },
];

const LeaveManagementPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leave Management</h1>
          <p className="text-muted-foreground">Track and manage staff leave requests</p>
        </div>
        <Button size="sm"><Plus className="w-4 h-4 mr-1" /> New Leave Request</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Pending Requests" value={2} icon={Clock} iconColor="bg-warning/10 text-warning" />
        <StatCard title="Approved This Month" value={4} icon={CheckCircle} iconColor="bg-success/10 text-success" />
        <StatCard title="On Leave Today" value={1} icon={CalendarDays} iconColor="bg-info/10 text-info" />
        <StatCard title="Rejected" value={1} icon={XCircle} iconColor="bg-destructive/10 text-destructive" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Leave Requests</CardTitle>
          <CardDescription>All leave applications from staff</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Staff Member</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaveRequests.map((lr) => (
                <TableRow key={lr.id}>
                  <TableCell className="font-mono text-xs">{lr.id}</TableCell>
                  <TableCell className="font-medium">{lr.teacher}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{lr.type}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{lr.from}</TableCell>
                  <TableCell className="text-xs">{lr.to}</TableCell>
                  <TableCell className="text-center font-semibold">{lr.days}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{lr.reason}</TableCell>
                  <TableCell>
                    <Badge
                      variant={lr.status === "Approved" ? "default" : lr.status === "Pending" ? "secondary" : "destructive"}
                      className="text-[10px]"
                    >
                      {lr.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {lr.status === "Pending" && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-success">Approve</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive">Reject</Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaveManagementPage;
