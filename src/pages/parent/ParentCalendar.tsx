import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon } from "lucide-react";

const events = [
  { date: "Apr 14-18", title: "Term 1 Examinations", type: "Exam", desc: "End of term assessments for all subjects" },
  { date: "Apr 18", title: "Parents Meeting - Grade 5", type: "Meeting", desc: "Review term performance with teachers" },
  { date: "Apr 22", title: "Inter-House Sports Day", type: "Event", desc: "Annual sports competition at the school field" },
  { date: "Apr 25", title: "Report Card Day", type: "Academic", desc: "Collect term 1 report cards" },
  { date: "May 1", title: "Term 2 Fee Deadline", type: "Finance", desc: "Last date for term 2 fee payment" },
  { date: "May 5", title: "Term 2 Begins", type: "Academic", desc: "School reopens for term 2" },
  { date: "May 15", title: "Science Fair", type: "Event", desc: "Grade 4-9 science project exhibition" },
  { date: "Jun 1", title: "Madaraka Day - No School", type: "Holiday", desc: "Public holiday" },
];

const typeColors: Record<string, string> = {
  Exam: "bg-destructive/10 text-destructive",
  Meeting: "bg-primary/10 text-primary",
  Event: "bg-success/10 text-success",
  Academic: "bg-info/10 text-info",
  Finance: "bg-warning/10 text-warning",
  Holiday: "bg-muted text-muted-foreground",
};

const ParentCalendar = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">School Calendar</h1>
        <p className="text-muted-foreground">Upcoming events, exams, and important dates</p>
      </div>

      <div className="space-y-3">
        {events.map((event, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-muted flex flex-col items-center justify-center shrink-0">
                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-[10px] font-bold text-muted-foreground mt-0.5">{event.date.split(" ")[0]}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm">{event.title}</h3>
                  <Badge className={`text-[10px] ${typeColors[event.type]}`} variant="secondary">{event.type}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{event.date}</p>
                <p className="text-sm text-muted-foreground mt-1">{event.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ParentCalendar;
