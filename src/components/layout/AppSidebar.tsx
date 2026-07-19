import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, GraduationCap, DollarSign, BookOpen, Bus,
  MessageSquare, Calendar, ClipboardList, Settings, ChevronLeft, School,
  UserCircle, Briefcase, CalendarDays, Receipt, Store, CreditCard,
  ChevronDown, Package, ShieldCheck, UserCog, BarChart3, FileText, Wallet, Fingerprint,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface NavItem {
  to: string;
  icon: any;
  label: string;
  children?: { to: string; icon: any; label: string }[];
}

const adminNavItems: NavItem[] = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/attendance", icon: Fingerprint, label: "Attendance" },
  {
    to: "", icon: Users, label: "Students & Admissions",
    children: [
      { to: "/admin/students", icon: Users, label: "Students" },
      { to: "/admin/admissions", icon: ClipboardList, label: "Admissions" },
      { to: "/admin/transport", icon: Bus, label: "Transport" },
    ],
  },
  {
    to: "", icon: GraduationCap, label: "Academics",
    children: [
      { to: "/admin/academics", icon: BookOpen, label: "Curriculum" },
      { to: "/admin/timetable", icon: Calendar, label: "Timetable" },
    ],
  },
  {
    to: "", icon: DollarSign, label: "Finance",
    children: [
      { to: "/admin/finance", icon: DollarSign, label: "Overview" },
      { to: "/admin/school-fees", icon: Users, label: "School Fees" },
      { to: "/admin/fee-statement", icon: BookOpen, label: "Fee Statement" },
      { to: "/admin/suppliers", icon: Store, label: "Suppliers" },
      { to: "/admin/bills", icon: Receipt, label: "Bills & Expenses" },
    ],
  },
  {
    to: "", icon: FileText, label: "Reports",
    children: [
      { to: "/admin/reports", icon: BookOpen, label: "General Reports" },
      { to: "/admin/student-performance", icon: BarChart3, label: "Student Performance" },
      { to: "/admin/subject-performance", icon: GraduationCap, label: "Subject Performance" },
      { to: "/admin/grade-comparison", icon: BarChart3, label: "Grade Comparison" },
      { to: "/admin/term-reports", icon: FileText, label: "Term Reports" },
    ],
  },
  {
    to: "", icon: Briefcase, label: "HR & Payroll",
    children: [
      { to: "/admin/teachers", icon: Briefcase, label: "Staff" },
      { to: "/admin/leave", icon: CalendarDays, label: "Leave Mgmt" },
      { to: "/admin/payroll", icon: CreditCard, label: "Payroll" },
    ],
  },
  {
    to: "", icon: MessageSquare, label: "Communication",
    children: [
      { to: "/admin/communication", icon: MessageSquare, label: "Messages & Notices" },
    ],
  },
  {
    to: "/admin/management", icon: Briefcase, label: "Management",
  },
  {
    to: "", icon: ShieldCheck, label: "Administration",
    children: [
      { to: "/admin/users", icon: UserCog, label: "Users" },
      { to: "/admin/roles", icon: ShieldCheck, label: "Roles & Permissions" },
      { to: "/admin/system-setups", icon: Settings, label: "System Setups" },
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
  { to: "/teacher/timetable", icon: Calendar, label: "Timetable" },
  { to: "/teacher/term-reports", icon: FileText, label: "Term Reports" },
  { to: "/teacher/leave", icon: CalendarDays, label: "Leave" },
  { to: "/teacher/payslips", icon: CreditCard, label: "Payslips" },
  { to: "/teacher/communication", icon: MessageSquare, label: "Messages" },
];

interface AppSidebarProps {
  role: "admin" | "parent" | "teacher";
}

const AppSidebar = ({ role }: AppSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const navItems = role === "admin" ? adminNavItems : role === "teacher" ? teacherNavItems : parentNavItems;

  const roleLabel = role === "admin" ? "School Admin" : role === "teacher" ? "Teacher Portal" : "Parent Portal";
  const switchOptions = [
    { to: "/admin", label: "Admin" },
    { to: "/teacher", label: "Teacher" },
    { to: "/parent", label: "Parent" },
  ].filter((o) => !o.to.includes(role));

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
