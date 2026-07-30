import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CalendarDays, CheckCircle, Clock, XCircle } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import { LeaveApi, StaffApi } from "@/services/api";
import { getBackendErrorMessage } from "@/utils/errorHandler";
import Swal from "sweetalert2";
import Pagination from "@/utils/Pagination";

const todayIso = () => new Date().toISOString().slice(0, 10);
const currentMonth = () => new Date().toISOString().slice(0, 7);

const LeaveManagementPage = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [staffSearch, setStaffSearch] = useState("");
  const [form, setForm] = useState({ staffUuid: "", leaveTypeId: "", fromDate: "", toDate: "", reason: "" });

  const [rejectFor, setRejectFor] = useState<any | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const [requestsPage, setRequestsPage] = useState(1);
  const [requestsPerPage, setRequestsPerPage] = useState(10);

  const load = () => {
    setLoading(true);
    Promise.all([LeaveApi.getRequests(), LeaveApi.getTypes(), StaffApi.getAll()])
      .then(([r, t, s]) => { setRequests(r); setLeaveTypes(t); setAllStaff(s); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const activeLeaveTypes = leaveTypes.filter((t) => t.active);
  const availableStaff = allStaff.filter((s) =>
    `${s.firstName} ${s.lastName} ${s.staffId}`.toLowerCase().includes(staffSearch.toLowerCase())
  );

  const openAdd = () => {
    setForm({ staffUuid: "", leaveTypeId: "", fromDate: "", toDate: "", reason: "" });
    setStaffSearch("");
    setAddOpen(true);
  };

  const handleStaffSelect = (staffUuid: string) => setForm((f) => ({ ...f, staffUuid }));

  const handleSubmit = async () => {
    const staff = allStaff.find((s) => s.uuid === form.staffUuid);
    if (!staff) { Swal.fire({ icon: "error", title: "Error", text: "Select a staff member", showConfirmButton: true }); return; }
    if (!form.leaveTypeId) { Swal.fire({ icon: "error", title: "Error", text: "Select a leave type", showConfirmButton: true }); return; }
    if (!form.fromDate || !form.toDate) { Swal.fire({ icon: "error", title: "Error", text: "From and To dates are required", showConfirmButton: true }); return; }
    try {
      await LeaveApi.createRequest({
        staffId: staff.staffId,
        staffName: `${staff.firstName} ${staff.lastName}`,
        leaveTypeId: Number(form.leaveTypeId),
        fromDate: form.fromDate,
        toDate: form.toDate,
        reason: form.reason,
      });
      Swal.fire({ title: "Success", text: "Leave request created", icon: "success", showConfirmButton: true });
      setAddOpen(false);
      load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: getBackendErrorMessage(err, "Failed to create leave request"), showConfirmButton: true });
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await LeaveApi.reviewRequest(id, "APPROVED");
      Swal.fire({ title: "Success", text: "Leave approved", icon: "success", showConfirmButton: true });
      load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: getBackendErrorMessage(err, "Failed to approve leave"), showConfirmButton: true });
    }
  };

  const confirmReject = async () => {
    if (!rejectFor) return;
    try {
      await LeaveApi.reviewRequest(rejectFor.id, "REJECTED", rejectNote);
      Swal.fire({ title: "Success", text: "Leave rejected", icon: "success", showConfirmButton: true });
      setRejectFor(null);
      setRejectNote("");
      load();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: getBackendErrorMessage(err, "Failed to reject leave"), showConfirmButton: true });
    }
  };

  const pending = requests.filter((r) => r.status === "PENDING");
  const rejected = requests.filter((r) => r.status === "REJECTED");
  const approvedThisMonth = requests.filter((r) => r.status === "APPROVED" && r.fromDate?.slice(0, 7) === currentMonth());
  const onLeaveToday = requests.filter((r) => r.status === "APPROVED" && r.fromDate <= todayIso() && r.toDate >= todayIso());

  const totalRequestPages = Math.ceil(requests.length / requestsPerPage);
  const pagedRequests = requests.slice((requestsPage - 1) * requestsPerPage, requestsPage * requestsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leave Management</h1>
          <p className="text-muted-foreground">Track and manage staff leave requests</p>
        </div>
        <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> New Leave Request</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Pending Requests" value={pending.length} icon={Clock} iconColor="bg-warning/10 text-warning" />
        <StatCard title="Approved This Month" value={approvedThisMonth.length} icon={CheckCircle} iconColor="bg-success/10 text-success" />
        <StatCard title="On Leave Today" value={onLeaveToday.length} icon={CalendarDays} iconColor="bg-info/10 text-info" />
        <StatCard title="Rejected" value={rejected.length} icon={XCircle} iconColor="bg-destructive/10 text-destructive" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Leave Requests</CardTitle>
          <CardDescription>All leave applications from staff</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          ) : (
          <>
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
              {pagedRequests.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">No leave requests yet.</TableCell></TableRow>
              ) : pagedRequests.map((lr) => (
                <TableRow key={lr.uuid}>
                  <TableCell className="font-mono text-xs">{lr.leaveId}</TableCell>
                  <TableCell className="font-medium">{lr.staffName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{lr.leaveType?.name}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{lr.fromDate}</TableCell>
                  <TableCell className="text-xs">{lr.toDate}</TableCell>
                  <TableCell className="text-center font-semibold">{lr.days}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{lr.reason}</TableCell>
                  <TableCell>
                    <Badge
                      variant={lr.status === "APPROVED" ? "default" : lr.status === "PENDING" ? "secondary" : "destructive"}
                      className="text-[10px]"
                    >
                      {lr.status === "APPROVED" ? "Approved" : lr.status === "PENDING" ? "Pending" : "Rejected"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {lr.status === "PENDING" && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-success" onClick={() => handleApprove(lr.id)}>Approve</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => { setRejectFor(lr); setRejectNote(""); }}>Reject</Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination currentPage={requestsPage} totalPages={totalRequestPages} onPageChange={setRequestsPage}
            itemsPerPage={requestsPerPage} onItemsPerPageChange={v => { setRequestsPerPage(v); setRequestsPage(1); }} />
          </>
          )}
        </CardContent>
      </Card>

      {/* New Leave Request */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Leave Request</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Staff Member *</Label>
              <Select value={form.staffUuid || undefined} onValueChange={handleStaffSelect}>
                <SelectTrigger><SelectValue placeholder="Select a staff member" /></SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-2">
                    <Input placeholder="Search staff..." value={staffSearch} onChange={(e) => setStaffSearch(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
                  </div>
                  {availableStaff.map((s) => (
                    <SelectItem key={s.uuid} value={s.uuid}>{s.firstName} {s.lastName} — {s.staffId}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Leave Type *</Label>
              <Select value={form.leaveTypeId} onValueChange={(v) => setForm((f) => ({ ...f, leaveTypeId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select leave type" /></SelectTrigger>
                <SelectContent>
                  {activeLeaveTypes.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>From *</Label>
                <Input type="date" value={form.fromDate} onChange={(e) => setForm((f) => ({ ...f, fromDate: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>To *</Label>
                <Input type="date" value={form.toDate} onChange={(e) => setForm((f) => ({ ...f, toDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Reason</Label>
              <Textarea rows={3} value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject reason */}
      <Dialog open={Boolean(rejectFor)} onOpenChange={(o) => { if (!o) { setRejectFor(null); setRejectNote(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
            <DialogDescription>{rejectFor && `${rejectFor.staffName} · ${rejectFor.leaveType?.name}`}</DialogDescription>
          </DialogHeader>
          <Textarea rows={4} placeholder="Reason for rejection (optional)" value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectFor(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmReject}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeaveManagementPage;
