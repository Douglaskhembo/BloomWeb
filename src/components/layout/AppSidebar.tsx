import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, GraduationCap, DollarSign, BookOpen, Bus,
  MessageSquare, Calendar, ClipboardList, Settings, ChevronLeft, School,
  UserCircle, Briefcase, CalendarDays, Receipt, Store, CreditCard,
  ChevronDown, Package, ShieldCheck, UserCog, BarChart3, FileText, Fingerprint,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

interface NavChild {
  to: string;
  icon: any;
  label: string;
  /** If set, this item only renders for a user holding at least one of these permissions.
   *  Omitted entirely = always visible within the portal (matches a read that's deliberately
   *  left open backend-side, or a section with no fine-grained permission concept yet). */
  permissions?: string[];
}

interface NavItem extends NavChild {
  children?: NavChild[];
}

const adminNavItems: NavItem[] = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/attendance", icon: Fingerprint, label: "Attendance", permissions: ["ATTENDANCE_VIEW"] },
  {
    to: "", icon: Users, label: "Students & Admissions",
    children: [
      { to: "/admin/students", icon: Users, label: "Students", permissions: ["STUDENT_VIEW"] },
      { to: "/admin/admissions", icon: ClipboardList, label: "Admissions", permissions: ["ADMISSION_VIEW"] },
      { to: "/admin/transport", icon: Bus, label: "Transport" },
    ],
  },
  {
    to: "", icon: GraduationCap, label: "Academics",
    children: [
      { to: "/admin/academics", icon: BookOpen, label: "Curriculum", permissions: ["ACADEMICS_VIEW"] },
      { to: "/admin/timetable", icon: Calendar, label: "Timetable", permissions: ["TIMETABLE_VIEW"] },
    ],
  },
  {
    to: "", icon: DollarSign, label: "Finance",
    children: [
      { to: "/admin/finance", icon: DollarSign, label: "Overview", permissions: ["FINANCE_VIEW", "FEES_VIEW"] },
      { to: "/admin/school-fees", icon: Users, label: "School Fees", permissions: ["FEES_VIEW"] },
      { to: "/admin/fee-statement", icon: BookOpen, label: "Fee Statement", permissions: ["FEES_VIEW"] },
      { to: "/admin/fee-collection-summary", icon: BarChart3, label: "Fee Collection Summary", permissions: ["FEES_VIEW"] },
      { to: "/admin/fee-arrears", icon: ClipboardList, label: "Fee Arrears", permissions: ["FEES_VIEW"] },
      { to: "/admin/suppliers", icon: Store, label: "Suppliers" },
      { to: "/admin/bills", icon: Receipt, label: "Bills & Expenses" },
    ],
  },
  {
    to: "", icon: FileText, label: "Reports",
    children: [
      { to: "/admin/reports", icon: BookOpen, label: "General Reports" },
      { to: "/admin/student-performance", icon: BarChart3, label: "Student Performance", permissions: ["REPORTS_VIEW"] },
      { to: "/admin/subject-performance", icon: GraduationCap, label: "Class Performance", permissions: ["GRADES_VIEW"] },
      { to: "/admin/grade-comparison", icon: BarChart3, label: "Grade Comparison", permissions: ["REPORTS_VIEW"] },
      { to: "/admin/term-reports", icon: FileText, label: "Term Reports", permissions: ["REPORTS_VIEW"] },
    ],
  },
  {
    to: "", icon: Briefcase, label: "HR & Payroll",
    children: [
      { to: "/admin/teachers", icon: Briefcase, label: "Staff", permissions: ["STAFF_VIEW"] },
      { to: "/admin/leave", icon: CalendarDays, label: "Leave Mgmt", permissions: ["LEAVE_APPROVE"] },
      { to: "/admin/payroll", icon: CreditCard, label: "Payroll" },
    ],
  },
  {
    to: "", icon: MessageSquare, label: "Communication",
    children: [
      { to: "/admin/communication", icon: MessageSquare, label: "Messages & Notices", permissions: ["COMMUNICATION_MANAGE"] },
    ],
  },
  {
    to: "/admin/management", icon: Briefcase, label: "Management",
  },
  {
    to: "", icon: ShieldCheck, label: "Administration",
    children: [
      { to: "/admin/users", icon: UserCog, label: "Users", permissions: ["USER_VIEW"] },
      { to: "/admin/roles", icon: ShieldCheck, label: "Roles & Permissions", permissions: ["ROLE_VIEW"] },
      { to: "/admin/system-setups", icon: Settings, label: "System Setups", permissions: ["SETUP_VIEW"] },
    ],
  },
  { to: "/admin/settings", icon: Settings, label: "Settings" },
];

const parentNavItems: NavItem[] = [
  { to: "/parent", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/parent/attendance", icon: Fingerprint, label: "Attendance" },
  { to: "/parent/grades", icon: GraduationCap, label: "Grades" },
  { to: "/parent/fees", icon: DollarSign, label: "Fees" },
  { to: "/parent/term-reports", icon: FileText, label: "Term Reports" },
  { to: "/parent/calendar", icon: Calendar, label: "Calendar" },
  { to: "/parent/transport", icon: Bus, label: "Transport" },
  { to: "/parent/communication", icon: MessageSquare, label: "Messages" },
];

const teacherNavItems: NavItem[] = [
  { to: "/teacher", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/teacher/attendance", icon: Fingerprint, label: "Attendance" },
  { to: "/teacher/classes", icon: BookOpen, label: "My Classes" },
  { to: "/teacher/performance", icon: BarChart3, label: "Performance" },
  { to: "/teacher/timetable", icon: Calendar, label: "Timetable" },
  { to: "/teacher/term-reports", icon: FileText, label: "Term Reports" },
  { to: "/teacher/leave", icon: CalendarDays, label: "Leave" },
  { to: "/teacher/payslips", icon: CreditCard, label: "Payslips" },
  { to: "/teacher/communication", icon: MessageSquare, label: "Messages" },
  { to: "/teacher/profile", icon: UserCircle, label: "My Profile" },
];

interface AppSidebarProps {
  role: "admin" | "parent" | "teacher";
}

const AppSidebar = ({ role }: AppSidebarProps) => {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const allNavItems = role === "admin" ? adminNavItems : role === "teacher" ? teacherNavItems : parentNavItems;

  const myRoles = user?.roles ?? "";
  const hasRole = (r: string) => myRoles.includes(r);
  // Someone whose only roles are TEACHER and/or PARENT is fundamentally a teacher/parent account
  // — even if individually granted one extra admin permission (e.g. PAYROLL_APPROVE) — not a
  // genuine admin-portal user. ADMIN, or any other (custom) role, counts as admin-portal-eligible,
  // matching AuthService.REDIRECT's own "anything that isn't specifically TEACHER/PARENT defaults
  // to /admin" rule.
  const isAdminEligible = hasRole("ADMIN") || (!hasRole("TEACHER") && !hasRole("PARENT"));

  // Permissions every plain Teacher and/or Parent already holds for their OWN portal's unrelated
  // features (see SeedService.seedRolesWithPermissions) — holding one of these must never, by
  // itself, unlock an ADMIN-portal aggregate/management screen for someone who isn't genuinely
  // admin-portal-eligible. Without this, a teacher given nothing but PAYROLL_APPROVE would still
  // see Curriculum/Timetable/Reports in the admin nav, since their own ACADEMICS_VIEW/
  // TIMETABLE_VIEW/REPORTS_VIEW already technically match those items' permission list.
  const TEACHER_PARENT_BASELINE = new Set([
    "DASHBOARD_VIEW", "ACADEMICS_VIEW", "GRADES_VIEW", "GRADES_ENTER", "TIMETABLE_VIEW",
    "REPORTS_VIEW", "LEAVE_VIEW", "LEAVE_APPLY", "PAYSLIP_VIEW", "COMMUNICATION_VIEW",
    "COMMUNICATION_SEND", "FEES_VIEW",
  ]);

  // Nav visibility follows the viewer's actual granted permissions, not just which portal they're
  // in — an item with no `permissions` listed stays visible to everyone in that portal (matches a
  // read deliberately left open backend-side) UNLESS this is the admin portal and the viewer isn't
  // admin-portal-eligible, in which case an ungated item defaults to HIDDEN instead (e.g.
  // "Management" has no permission concept at all — safe default is hidden, not shown-to-everyone).
  // A section whose every child gets filtered out disappears too, rather than showing an empty
  // expandable group.
  const myPermissions = user?.permissions ?? [];
  const hasAccess = (perms?: string[]) => {
    if (role !== "admin" || isAdminEligible) return !perms || perms.length === 0 || perms.some((p) => myPermissions.includes(p));
    if (!perms || perms.length === 0) return false;
    return perms.some((p) => myPermissions.includes(p) && !TEACHER_PARENT_BASELINE.has(p));
  };
  const navItems = allNavItems
    .map((item) => {
      if (!item.children) return hasAccess(item.permissions) ? item : null;
      const children = item.children.filter((c) => hasAccess(c.permissions));
      return children.length > 0 ? { ...item, children } : null;
    })
    .filter((item): item is NavItem => item !== null);

  const roleLabel = role === "admin" ? "School Admin" : role === "teacher" ? "Teacher Portal" : "Parent Portal";
  // Only offer a portal switch the user's actual roles legitimately grant — e.g. someone who holds
  // both TEACHER and ADMIN (assigned so they can run/approve payroll, manage fees, etc.) sees
  // "Switch to Admin"; a plain teacher or parent does not. Was previously unconditional (every
  // logged-in user could jump straight into the full Admin portal via this link).
  const switchOptions = [
    { to: "/admin", label: "Admin", roleKey: "ADMIN" },
    { to: "/teacher", label: "Teacher", roleKey: "TEACHER" },
    { to: "/parent", label: "Parent", roleKey: "PARENT" },
  ].filter((o) => !o.to.includes(role) && hasRole(o.roleKey));

  const isSectionActive = (children: { to: string }[]) =>
    children.some((c) => location.pathname.startsWith(c.to));

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 sticky top-0",
        collapsed ? "w-[68px]" : "w-[260px]"
      )}
    >
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <School className="w-5 h-5" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="font-bold text-sm text-sidebar-primary-foreground">EduManager</span>
            <span className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider">{roleLabel}</span>
          </div>
        )}
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          if (item.children) {
            const active = isSectionActive(item.children!);
            const isOpen = openSections[item.label] ?? active;
            return (
              <div key={item.label}>
                <button
                  onClick={() => setOpenSections((s) => ({ ...s, [item.label]: !isOpen }))}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 w-full",
                    active
                      ? "text-sidebar-accent-foreground bg-sidebar-accent/50"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
                    </>
                  )}
                </button>
                {isOpen && !collapsed && (
                  <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-sidebar-border pl-3">
                    {item.children.map((child) => {
                      const isActive = location.pathname.startsWith(child.to);
                      return (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                            isActive
                              ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          )}
                        >
                          <child.icon className="w-4 h-4 shrink-0" />
                          <span>{child.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const isActive =
            item.to === `/${role}`
              ? location.pathname === `/${role}`
              : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border space-y-1">
        {switchOptions.map((opt) => (
          <NavLink
            key={opt.to}
            to={opt.to}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <UserCircle className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Switch to {opt.label}</span>}
          </NavLink>
        ))}
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border shadow-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className={cn("w-3 h-3 transition-transform", collapsed && "rotate-180")} />
      </Button>
    </aside>
  );
};

export default AppSidebar;
