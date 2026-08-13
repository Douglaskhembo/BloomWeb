import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { StaffApi, TimetableApi } from "@/services/api";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"] as const;
const DAY_LABELS: Record<string, string> = {
  MONDAY: "Monday", TUESDAY: "Tuesday", WEDNESDAY: "Wednesday", THURSDAY: "Thursday", FRIDAY: "Friday",
};

// LocalTime comes back as "08:00:00" — trim to "8:00" for display.
const formatTime = (t: string) => {
  const [h, m] = t.split(":");
  return `${parseInt(h, 10)}:${m}`;
};
const periodLabel = (p: any) => `${formatTime(p.startTime)} - ${formatTime(p.endTime)}`;

const TeacherTimetable = () => {
  const { user } = useAuth();
  const [staff, setStaff] = useState<any | null>(null);
  const [periods, setPeriods] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.profileRef) return;
    StaffApi.getByUuid(user.profileRef).then(setStaff);
    TimetableApi.getPeriods().then((data) => setPeriods(Array.isArray(data) ? data : []));
  }, [user?.profileRef]);

  useEffect(() => {
    if (!staff?.uuid) return;
    TimetableApi.getMine(staff.uuid).then((data) => setEntries(Array.isArray(data) ? data : []));
  }, [staff?.uuid]);

  const entryFor = (day: string, periodUuid: string) => entries.find((e) => e.dayOfWeek === day && e.periodUuid === periodUuid);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Timetable</h1>
        <p className="text-muted-foreground">Your weekly class schedule</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Weekly Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Time
                    </div>
                  </TableHead>
                  {DAYS.map((day) => (
                    <TableHead key={day} className="text-center min-w-[140px]">{DAY_LABELS[day]}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map((p) => (
                  <TableRow key={p.uuid} className={p.breakPeriod ? "bg-muted/50" : ""}>
                    <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {periodLabel(p)}
                    </TableCell>
                    {p.breakPeriod ? (
                      <TableCell colSpan={DAYS.length} className="text-center">
                        <span className="text-xs font-medium text-muted-foreground">{p.breakLabel || "BREAK"}</span>
                      </TableCell>
                    ) : (
                      DAYS.map((day) => {
                        const entry = entryFor(day, p.uuid);
                        return (
                          <TableCell key={day} className="text-center p-2">
                            {entry ? (
                              <div className="space-y-1">
                                <Badge variant="outline" className="text-[10px]">{`${entry.grade} ${entry.stream}`.trim()}</Badge>
                                <p className="text-xs font-medium">{entry.subjectName}</p>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        );
                      })
                    )}
                  </TableRow>
                ))}
                {periods.length === 0 && (
                  <TableRow><TableCell colSpan={DAYS.length + 1} className="text-center text-muted-foreground py-8">No timetable has been set up yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherTimetable;
