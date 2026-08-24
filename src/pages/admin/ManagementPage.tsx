import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, DollarSign, BookOpen, Calculator, Award, Wallet, Fingerprint, IdCard, Calendar, CalendarClock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LeaveApi, FeeApi, SubjectApi, StaffRoleApi, PayrollApi, StaffApi, DeviceApi, HolidayApi, AcademicCalendarApi } from "@/services/api";
import { usePayroll } from "@/context/PayrollContext";
import { useAuth } from "@/context/AuthContext";

interface CardCounts { active: number; total: number; }

const emptyCounts: CardCounts = { active: 0, total: 0 };

/** Counts rows as "active" whichever shape the backend used for this resource — a boolean
 *  `active` flag (leave types, fee items, subjects, staff roles, payroll parameters) or a
 *  string `status` (biometric devices). */
const countActive = (rows: any[]): CardCounts => ({
  active: rows.filter((r) => r.active === true || r.status === "ACTIVE").length,
  total: rows.length,
});

const ManagementPage = () => {
  const navigate = useNavigate();
  const { salaries } = usePayroll();
  const { hasPermission } = useAuth();
  const canViewFees = hasPermission("FEES_VIEW");
  const canManageAttendance = hasPermission("ATTENDANCE_MANAGE");
  const canViewStaff = hasPermission("STAFF_VIEW");
  const [counts, setCounts] = useState<Record<string, CardCounts>>({});
  const [staffList, setStaffList] = useState<any[]>([]);

  useEffect(() => {
    LeaveApi.getTypes().then((rows) => setCounts((c) => ({ ...c, leaveTypes: countActive(rows) })));
    if (canViewFees) {
      FeeApi.getItems().then((rows) => setCounts((c) => ({ ...c, feeStructure: countActive(rows) })));
    }
    SubjectApi.getAll().then((rows) => setCounts((c) => ({ ...c, subjects: countActive(rows) })));
    StaffRoleApi.getAll().then((rows) => setCounts((c) => ({ ...c, staffRoles: countActive(rows) })));
    if (canManageAttendance) {
      DeviceApi.getAll().then((rows) => setCounts((c) => ({ ...c, biometrics: countActive(rows) })));
    }
    HolidayApi.getAll().then((rows) => setCounts((c) => ({ ...c, holidays: countActive(rows) })));
    Promise.all([AcademicCalendarApi.getTermPeriods(), AcademicCalendarApi.getEvents()]).then(([terms, events]) => {
      setCounts((c) => ({
        ...c,
        academicCalendar: { active: terms.length + events.filter((e) => e.active).length, total: terms.length + events.length },
      }));
    });
    if (canViewStaff) {
      StaffApi.getAll().then(setStaffList).catch(() => setStaffList([]));
    }

    Promise.all([
      PayrollApi.getPayeBands(),
      PayrollApi.getStatutoryDeductions(),
      PayrollApi.getAllowanceTypes(),
      PayrollApi.getOtherDeductions(),
    ]).then(([bands, statutory, allowances, deductions]) => {
      // PAYE tax bands don't carry an active/inactive toggle, so they always count as active.
      const toggleable = [...statutory, ...allowances, ...deductions];
      setCounts((c) => ({
        ...c,
        payroll: {
          active: bands.length + toggleable.filter((p: any) => p.active).length,
          total: bands.length + toggleable.length,
        },
      }));
    });
  }, [canViewFees, canManageAttendance, canViewStaff]);

  const staffSalaries: CardCounts = useMemo(
    () => ({
      active: staffList.filter((s) => (salaries[s.uuid]?.basic ?? 0) > 0).length,
      total: staffList.length,
    }),
    [staffList, salaries],
  );

  const managementCards = [
    {
      to: "/admin/setup-leave-types",
      icon: CalendarDays,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      title: "Leave Types",
      description: "Configure leave categories, entitlements, and policies",
      counts: counts.leaveTypes ?? emptyCounts,
      totalLabel: "total",
    },
    {
      to: "/admin/setup-fee-structure",
      icon: DollarSign,
      iconBg: "bg-success/10",
      iconColor: "text-success",
      title: "Fee Structure",
      description: "Set up fee items, amounts per grade, and billing terms",
      counts: counts.feeStructure ?? emptyCounts,
      totalLabel: "items",
      requiredPermission: "FEES_VIEW",
    },
    {
      to: "/admin/setup-subjects",
      icon: BookOpen,
      iconBg: "bg-warning/10",
      iconColor: "text-warning",
      title: "Subjects",
      description: "Define subjects offered per grade level",
      counts: counts.subjects ?? emptyCounts,
      totalLabel: "subjects",
    },
    {
      to: "/admin/setup-staff-roles",
      icon: IdCard,
      iconBg: "bg-rose-500/10",
      iconColor: "text-rose-600",
      title: "Staff Roles",
      description: "Define job titles/positions available when onboarding staff",
      counts: counts.staffRoles ?? emptyCounts,
      totalLabel: "roles",
    },
    {
      to: "/admin/setup-grading",
      icon: Award,
      iconBg: "bg-accent/50",
      iconColor: "text-accent-foreground",
      title: "Grading Structure",
      description: "Define grade boundaries and points per grade level",
      counts: null,
      totalLabel: "grades",
    },
    {
      to: "/admin/setup-payroll",
      icon: Calculator,
      iconBg: "bg-destructive/10",
      iconColor: "text-destructive",
      title: "Payroll",
      description: "Tax brackets, statutory deductions, allowances, and payroll parameters",
      counts: counts.payroll ?? emptyCounts,
      totalLabel: "parameters",
    },
    {
      to: "/admin/staff-salaries",
      icon: Wallet,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-600",
      title: "Staff Salaries",
      description: "Configure staff salary scales, grades, and pay structures",
      counts: staffSalaries,
      totalLabel: "staff",
      requiredPermission: "STAFF_VIEW",
    },
    {
      to: "/admin/setup-biometrics",
      icon: Fingerprint,
      iconBg: "bg-sky-500/10",
      iconColor: "text-sky-600",
      title: "Biometrics & Devices",
      description: "Enroll staff/student fingerprints, register devices, assign class teachers",
      counts: counts.biometrics ?? emptyCounts,
      totalLabel: "devices",
      requiredPermission: "ATTENDANCE_MANAGE",
    },
    {
      to: "/admin/setup-public-holidays",
      icon: Calendar,
      iconBg: "bg-violet-500/10",
      iconColor: "text-violet-600",
      title: "Public Holidays",
      description: "Manage the dates leave requests treat as non-working days",
      counts: counts.holidays ?? emptyCounts,
      totalLabel: "holidays",
    },
    {
      to: "/admin/setup-academic-calendar",
      icon: CalendarClock,
      iconBg: "bg-cyan-500/10",
      iconColor: "text-cyan-600",
      title: "Academic Calendar",
      description: "Set term dates and school events so the current term is detected automatically",
      counts: counts.academicCalendar ?? emptyCounts,
      totalLabel: "entries",
    },
  ];

  const visibleCards = managementCards.filter((card) => hasPermission(card.requiredPermission));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Management</h1>
        <p className="text-muted-foreground">Configure core management settings and reference data</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleCards.map((card) => (
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
                    {card.counts ? (
                      <>
                        <Badge variant="outline" className="text-[10px]">{card.counts.active} active</Badge>
                        <Badge variant="secondary" className="text-[10px]">{card.counts.total} {card.totalLabel}</Badge>
                      </>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">Not yet tracked</Badge>
                    )}
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
