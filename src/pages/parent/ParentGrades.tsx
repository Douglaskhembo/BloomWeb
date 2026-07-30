import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Pagination from "@/utils/Pagination";

const grades = [
  { subject: "Mathematics", t1: 78, t2: 72, t3: 80, rubric: "Exceeding Expectations" },
  { subject: "English", t1: 85, t2: 88, t3: 82, rubric: "Exceeding Expectations" },
  { subject: "Kiswahili", t1: 72, t2: 68, t3: 75, rubric: "Meeting Expectations" },
  { subject: "Science & Technology", t1: 68, t2: 65, t3: 70, rubric: "Meeting Expectations" },
  { subject: "Social Studies", t1: 80, t2: 76, t3: 82, rubric: "Exceeding Expectations" },
  { subject: "Creative Arts", t1: 90, t2: 92, t3: 88, rubric: "Exceeding Expectations" },
  { subject: "Religious Education", t1: 75, t2: 70, t3: 78, rubric: "Meeting Expectations" },
];

const ParentGrades = () => {
  const [gradesPage, setGradesPage] = useState(1);
  const [gradesPerPage, setGradesPerPage] = useState(10);
  const totalGradesPages = Math.ceil(grades.length / gradesPerPage);
  const pagedGrades = grades.slice((gradesPage - 1) * gradesPerPage, gradesPage * gradesPerPage);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Academic Performance</h1>
        <p className="text-muted-foreground">Joy Kamau · Grade 5A · CBC Assessment Results</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Term-wise Performance</CardTitle>
          <CardDescription>Scores across all terms</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead className="text-center">Term 1</TableHead>
                <TableHead className="text-center">Term 2</TableHead>
                <TableHead className="text-center">Term 3</TableHead>
                <TableHead>CBC Rubric</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedGrades.map((g) => (
                <TableRow key={g.subject}>
                  <TableCell className="font-medium">{g.subject}</TableCell>
                  <TableCell className="text-center font-semibold">{g.t1}%</TableCell>
                  <TableCell className="text-center font-semibold">{g.t2}%</TableCell>
                  <TableCell className="text-center font-semibold">{g.t3}%</TableCell>
                  <TableCell>
                    <Badge variant={g.rubric.includes("Exceeding") ? "default" : "secondary"} className="text-[10px]">
                      {g.rubric}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination currentPage={gradesPage} totalPages={totalGradesPages} onPageChange={setGradesPage}
            itemsPerPage={gradesPerPage} onItemsPerPageChange={v => { setGradesPerPage(v); setGradesPage(1); }} />
        </CardContent>
      </Card>
    </div>
  );
};

export default ParentGrades;
