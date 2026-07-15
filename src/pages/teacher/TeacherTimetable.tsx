import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const timeSlots = [
  { label: "8:00 - 8:40", isBreak: false },
  { label: "8:40 - 9:20", isBreak: false },
  { label: "9:20 - 10:00", isBreak: false },
  { label: "10:00 - 10:30", isBreak: true, breakLabel: "BREAK" },
  { label: "10:30 - 11:10", isBreak: false },
  { label: "11:10 - 11:50", isBreak: false },
  { label: "11:50 - 12:30", isBreak: false },
  { label: "12:30 - 1:30", isBreak: true, breakLabel: "LUNCH" },
  { label: "1:30 - 2:10", isBreak: false },
  { label: "2:10 - 2:50", isBreak: false },
];

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// Sample weekly assignments for the teacher
const schedule: Record<string, Record<string, { subject: string; class: string; room: string } | null>> = {
  "Monday": {
    "8:00 - 8:40": { subject: "Mathematics", class: "Grade 5A", room: "Room 12" },
    "8:40 - 9:20": { subject: "Mathematics", class: "Grade 5B", room: "Room 14" },
    "9:20 - 10:00": { subject: "Mathematics", class: "Grade 3A", room: "Room 8" },
    "10:30 - 11:10": { subject: "Mathematics", class: "Grade 4A", room: "Room 10" },
    "11:10 - 11:50": { subject: "Mathematics", class: "Grade 6A", room: "Room 16" },
    "1:30 - 2:10": { subject: "Mathematics", class: "Grade 7A", room: "Room 18" },
  },
  "Tuesday": {
    "8:00 - 8:40": { subject: "Mathematics", class: "Grade 3A", room: "Room 8" },
    "8:40 - 9:20": { subject: "Mathematics", class: "Grade 4A", room: "Room 10" },
    "10:30 - 11:10": { subject: "Mathematics", class: "Grade 5A", room: "Room 12" },
    "11:10 - 11:50": { subject: "Mathematics", class: "Grade 7A", room: "Room 18" },
    "1:30 - 2:10": { subject: "Mathematics", class: "Grade 6A", room: "Room 16" },
  },
  "Wednesday": {
    "8:00 - 8:40": { subject: "Mathematics", class: "Grade 6A", room: "Room 16" },
    "9:20 - 10:00": { subject: "Mathematics", class: "Grade 5B", room: "Room 14" },
    "10:30 - 11:10": { subject: "Mathematics", class: "Grade 3A", room: "Room 8" },
    "1:30 - 2:10": { subject: "Mathematics", class: "Grade 4A", room: "Room 10" },
    "2:10 - 2:50": { subject: "Mathematics", class: "Grade 5A", room: "Room 12" },
  },
  "Thursday": {
    "8:00 - 8:40": { subject: "Mathematics", class: "Grade 5B", room: "Room 14" },
    "8:40 - 9:20": { subject: "Mathematics", class: "Grade 6A", room: "Room 16" },
    "9:20 - 10:00": { subject: "Mathematics", class: "Grade 4A", room: "Room 10" },
    "10:30 - 11:10": { subject: "Mathematics", class: "Grade 7A", room: "Room 18" },
    "11:10 - 11:50": { subject: "Mathematics", class: "Grade 5A", room: "Room 12" },
  },
  "Friday": {
    "8:00 - 8:40": { subject: "Mathematics", class: "Grade 7A", room: "Room 18" },
    "8:40 - 9:20": { subject: "Mathematics", class: "Grade 3A", room: "Room 8" },
    "10:30 - 11:10": { subject: "Mathematics", class: "Grade 6A", room: "Room 16" },
    "11:10 - 11:50": { subject: "Mathematics", class: "Grade 4A", room: "Room 10" },
    "1:30 - 2:10": { subject: "Mathematics", class: "Grade 5B", room: "Room 14" },
  },
};

const TeacherTimetable = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Timetable</h1>
        <p className="text-muted-foreground">Your weekly class schedule — Term 1, 2026</p>
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
                  {days.map((day) => (
                    <TableHead key={day} className="text-center min-w-[140px]">{day}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeSlots.map((slot) => (
                  <TableRow key={slot.label} className={slot.isBreak ? "bg-muted/50" : ""}>
                    <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {slot.label}
                    </TableCell>
                    {slot.isBreak ? (
                      <TableCell colSpan={5} className="text-center">
                        <span className="text-xs font-medium text-muted-foreground">{slot.breakLabel}</span>
                      </TableCell>
                    ) : (
                      days.map((day) => {
                        const assignment = schedule[day]?.[slot.label];
                        return (
                          <TableCell key={day} className="text-center p-2">
                            {assignment ? (
                              <div className="space-y-1">
                                <Badge variant="outline" className="text-[10px]">{assignment.class}</Badge>
                                <p className="text-xs font-medium">{assignment.subject}</p>
                                <p className="text-[10px] text-muted-foreground">{assignment.room}</p>
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
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherTimetable;
