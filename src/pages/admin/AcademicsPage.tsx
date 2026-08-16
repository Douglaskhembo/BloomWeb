import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, TrendingUp, BarChart3, Search } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import { AssessmentApi, AcademicCalendarApi } from "@/services/api";

const TERMS = ["Term 1", "Term 2", "Term 3", "Full Year"];

interface SubjectStat {
  subjectUuid: string;
  subjectName: string;
  average: number;
  highest: number;
  lowest: number;
  markCount: number;
}

interface SubjectPerformance {
  term: string;
  year: number;
  schoolAverage: number;
  subjectsOffered: number;
  assessmentsCount: number;
  subjects: SubjectStat[];
}

const AcademicsPage = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [term, setTerm] = useState("Term 1");
  const [data, setData] = useState<SubjectPerformance | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async (y: number, t: string) => {
    setLoading(true);
    try {
      setData(await AssessmentApi.getSubjectPerformance(t, y));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const current = await AcademicCalendarApi.getCurrentTerm();
      const initialYear = current.academicYear ?? year;
      const initialTerm = current.term ?? term;
      setYear(initialYear);
      setTerm(initialTerm);
      await load(initialYear, initialTerm);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Curriculum</h1>
        <p className="text-muted-foreground">CBC-aligned performance tracking and assessments</p>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Academic Year</Label>
            <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Term</Label>
            <Select value={term} onValueChange={setTerm}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TERMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={() => load(year, term)}><Search className="w-4 h-4 mr-1" /> Generate</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="School Average" value={`${data?.schoolAverage ?? 0}%`} icon={TrendingUp} iconColor="bg-primary/10 text-primary" />
        <StatCard title="Subjects Offered" value={data?.subjectsOffered ?? 0} icon={BookOpen} iconColor="bg-info/10 text-info" />
        <StatCard title="Assessments Done" value={data?.assessmentsCount ?? 0} change={term} changeType="neutral" icon={BarChart3} iconColor="bg-success/10 text-success" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Subject Performance Overview</CardTitle>
          <CardDescription>Average scores across all grades — {term}, {year}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          ) : !data || data.subjects.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No graded assessments for this year/term yet — scores will appear here once teachers enter marks.
            </p>
          ) : (
            data.subjects.map((item) => (
              <div key={item.subjectUuid} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.subjectName}</span>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Low: {item.lowest}%</span>
                    <span className="font-semibold text-foreground">Avg: {item.average}%</span>
                    <span>High: {item.highest}%</span>
                  </div>
                </div>
                <Progress value={item.average} className="h-2.5" />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AcademicsPage;
