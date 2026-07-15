import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, BarChart3, Users, DollarSign, GraduationCap } from "lucide-react";

const reports = [
  { title: "Student Enrollment Report", desc: "Complete list of all enrolled students by grade", icon: Users, category: "Students" },
  { title: "Fee Collection Summary", desc: "Term-wise fee collection and outstanding balances", icon: DollarSign, category: "Finance" },
  { title: "Academic Performance Report", desc: "CBC assessment results by grade and subject", icon: GraduationCap, category: "Academics" },
  { title: "Attendance Report", desc: "Daily and monthly attendance statistics", icon: BarChart3, category: "Students" },
  { title: "Transport Usage Report", desc: "Route utilization and driver logs", icon: FileText, category: "Transport" },
  { title: "Financial Reconciliation", desc: "M-Pesa and bank payment reconciliation", icon: DollarSign, category: "Finance" },
];

const ReportsPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">Generate and download school reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((report, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <report.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{report.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{report.desc}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full">
                <Download className="w-4 h-4 mr-1" /> Generate Report
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ReportsPage;
