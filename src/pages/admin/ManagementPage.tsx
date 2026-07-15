import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, DollarSign, GraduationCap, BookOpen, Calculator, Award, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";

const managementCards = [
  {
    to: "/admin/setup-leave-types",
    icon: CalendarDays,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    title: "Leave Types",
    description: "Configure leave categories, entitlements, and policies",
    activeCount: 5,
    totalCount: 6,
    totalLabel: "total",
  },
  {
    to: "/admin/setup-fee-structure",
    icon: DollarSign,
    iconBg: "bg-success/10",
    iconColor: "text-success",
    title: "Fee Structure",
    description: "Set up fee items, amounts per grade, and billing terms",
    activeCount: 5,
    totalCount: 6,
    totalLabel: "items",
  },
  {
    to: "/admin/setup-subjects",
    icon: BookOpen,
    iconBg: "bg-warning/10",
    iconColor: "text-warning",
    title: "Subjects",
    description: "Define subjects offered per grade level",
    activeCount: 8,
    totalCount: 10,
    totalLabel: "subjects",
  },
  {
    to: "/admin/setup-grading",
    icon: Award,
    iconBg: "bg-accent/50",
    iconColor: "text-accent-foreground",
    title: "Grading Structure",
    description: "Define grade boundaries and points per grade level",
    activeCount: 2,
    totalCount: 11,
    totalLabel: "grades",
  },
  {
    to: "/admin/setup-payroll",
    icon: Calculator,
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
    title: "Payroll",
    description: "Tax brackets, statutory deductions, allowances, and payroll parameters",
    activeCount: 5,
    totalCount: 6,
    totalLabel: "parameters",
  },
  {
    to: "/admin/staff-salaries",
    icon: Wallet,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-600",
    title: "Staff Salaries",
    description: "Configure staff salary scales, grades, and pay structures",
    activeCount: 0,
    totalCount: 0,
    totalLabel: "records",
  },
];

const ManagementPage = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Management</h1>
        <p className="text-muted-foreground">Configure core management settings and reference data</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {managementCards.map((card) => (
          <Card
            key={card.to}
            className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
            onClick={() => navigate(card.to)}
          >
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${card.iconBg}`}>
                  <card.icon className={`w-6 h-6 ${card.iconColor}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{card.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{card.description}</p>
                  <div className="flex gap-2 mt-3">
                    <Badge variant="outline" className="text-[10px]">{card.activeCount} active</Badge>
                    <Badge variant="secondary" className="text-[10px]">{card.totalCount} {card.totalLabel}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ManagementPage;
