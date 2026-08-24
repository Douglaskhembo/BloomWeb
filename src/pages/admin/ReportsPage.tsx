import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, BarChart3, Users, DollarSign, GraduationCap, AlertTriangle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

// `permission` mirrors the permission actually enforced by the TARGET page's own backend
// call(s) — not necessarily the (sometimes stricter/looser) permission the sidebar nav guard
// uses for the same route. Omitted = target page's data is open to any authenticated user.
const reports = [
  { title: "Student Enrollment Report", desc: "Complete list of all enrolled students by grade", icon: Users, category: "Students", to: "/admin/students", permission: undefined },
  { title: "Fee Collection Summary", desc: "Expected vs collected fees by grade and stream", icon: DollarSign, category: "Finance", to: "/admin/fee-collection-summary", permission: "FEES_VIEW" },
  { title: "Fee Arrears", desc: "Students ranked by outstanding balance", icon: AlertTriangle, category: "Finance", to: "/admin/fee-arrears", permission: "FEES_VIEW" },
  { title: "Academic Performance Report", desc: "CBC assessment results by grade and subject", icon: GraduationCap, category: "Academics", to: "/admin/academics", permission: "REPORTS_VIEW" },
  { title: "Attendance Report", desc: "Daily records and attendance percentage by student", icon: BarChart3, category: "Students", to: "/admin/attendance", permission: "ATTENDANCE_VIEW" },
  { title: "Transport Usage Report", desc: "Route utilization and driver logs", icon: FileText, category: "Transport", to: null, permission: undefined },
  { title: "Financial Reconciliation", desc: "M-Pesa and bank payment reconciliation", icon: DollarSign, category: "Finance", to: null, permission: undefined },
];

const ReportsPage = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const visibleReports = reports.filter((report) => hasPermission(report.permission));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">Generate and download school reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleReports.map((report, i) => (
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
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={!report.to}
                onClick={() => report.to && navigate(report.to)}
              >
                <Download className="w-4 h-4 mr-1" /> {report.to ? "Open Report" : "Not yet available"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ReportsPage;
