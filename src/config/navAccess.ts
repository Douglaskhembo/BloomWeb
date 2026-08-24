import {
  LayoutDashboard, Users, GraduationCap, DollarSign, BookOpen, Bus,
  MessageSquare, Calendar, ClipboardList, Settings, School,
  UserCircle, Briefcase, CalendarDays, Receipt, Store, CreditCard,
  Package, ShieldCheck, UserCog, BarChart3, FileText, Fingerprint,
} from "lucide-react";
import type { AuthUser } from "@/context/AuthContext";

export interface NavChild {
  to: string;
  icon: any;
  label: string;
  /** If set, this item only renders for a user holding at least one of these permissions.
   *  Omitted entirely = always visible within the portal (matches a read that's deliberately
   *  left open backend-side, or a section with no fine-grained permission concept yet). */
  permissions?: string[];
}

export interface NavItem extends NavChild {
  children?: NavChild[];
}

export const adminNavItems: NavItem[] = [
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

export const parentNavItems: NavItem[] = [
  { to: "/parent", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/parent/attendance", icon: Fingerprint, label: "Attendance" },
  { to: "/parent/grades", icon: GraduationCap, label: "Grades", permissions: ["GRADES_VIEW"] },
  { to: "/parent/fees", icon: DollarSign, label: "Fees", permissions: ["FEES_VIEW"] },
  { to: "/parent/term-reports", icon: FileText, label: "Term Reports", permissions: ["REPORTS_VIEW"] },
  { to: "/parent/calendar", icon: Calendar, label: "Calendar" },
  { to: "/parent/transport", icon: Bus, label: "Transport" },
  { to: "/parent/communication", icon: MessageSquare, label: "Messages", permissions: ["COMMUNICATION_VIEW", "COMMUNICATION_SEND"] },
];

export const teacherNavItems: NavItem[] = [
  { to: "/teacher", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/teacher/attendance", icon: Fingerprint, label: "Attendance" },
  { to: "/teacher/classes", icon: BookOpen, label: "My Classes" },
  { to: "/teacher/performance", icon: BarChart3, label: "Performance", permissions: ["GRADES_VIEW"] },
  { to: "/teacher/timetable", icon: Calendar, label: "Timetable", permissions: ["TIMETABLE_VIEW"] },
  { to: "/teacher/term-reports", icon: FileText, label: "Term Reports", permissions: ["REPORTS_VIEW"] },
  { to: "/teacher/leave", icon: CalendarDays, label: "Leave", permissions: ["LEAVE_VIEW", "LEAVE_APPLY"] },
  { to: "/teacher/payslips", icon: CreditCard, label: "Payslips", permissions: ["PAYSLIP_VIEW"] },
  { to: "/teacher/communication", icon: MessageSquare, label: "Messages", permissions: ["COMMUNICATION_VIEW", "COMMUNICATION_SEND"] },
  { to: "/teacher/profile", icon: UserCircle, label: "My Profile" },
];

/** Routes reachable only via in-page navigation (e.g. cards on SystemSetupsPage/ManagementPage),
 *  not as sidebar nav items — still need an entry here so directly typing the URL is guarded the
 *  same way a hidden nav link would be. Kept separate from the nav arrays above so the sidebar
 *  itself never renders these as top-level links.
 *
 *  IMPORTANT: only list a permission here when the backend's own GET/view is actually gated by it
 *  (or, for setup-banks, when exposing read-only bank/mobile-money payment config to someone who
 *  can't act on it is deliberately not worth doing even though the GET itself is technically
 *  open). Everywhere else the backend view is open by design — those pages get NO entry here (so
 *  the route stays open) and are instead gated action-by-action inside the page body, so a viewer
 *  without the MANAGE permission can still see the (read-only) page, matching how e.g. Students/
 *  Admissions/School Fees already work. */
export const adminExtraRoutePermissions: NavChild[] = [
  { to: "/admin/setup-banks", icon: Package, label: "Bank/Mobile Money Setup", permissions: ["SALARY_MANAGE"] },
  { to: "/admin/setup-fee-structure", icon: Package, label: "Fee Structure Setup", permissions: ["FEES_VIEW"] },
  { to: "/admin/staff-salaries", icon: Package, label: "Staff Salaries", permissions: ["SALARY_MANAGE"] },
  { to: "/admin/staff-payment-details", icon: Package, label: "Staff Payment Details", permissions: ["PAYROLL_STAFF_PAYMENT_MANAGE"] },
  // setup-leave-types, setup-school, setup-subjects, setup-staff-roles, setup-public-holidays,
  // setup-academic-calendar, setup-payroll, setup-grading, setup-biometrics deliberately absent:
  // their backend GETs are open, so the route stays open too — write actions inside each are
  // gated at the page-body level instead (see the implementation plan's page sweep).
];

/** Permissions every plain Teacher and/or Parent already holds for their OWN portal's unrelated
 *  features (see SeedService.seedRolesWithPermissions). Holding one of these must never, by
 *  itself, unlock an ADMIN-portal aggregate/management screen for someone who isn't genuinely
 *  admin-portal-eligible — without this, a teacher given nothing but PAYROLL_APPROVE would still
 *  see Curriculum/Timetable/Reports in the admin nav, since their own ACADEMICS_VIEW/
 *  TIMETABLE_VIEW/REPORTS_VIEW already technically match those items' permission list. */
export const TEACHER_PARENT_BASELINE = new Set([
  "DASHBOARD_VIEW", "ACADEMICS_VIEW", "GRADES_VIEW", "GRADES_ENTER", "TIMETABLE_VIEW",
  "REPORTS_VIEW", "LEAVE_VIEW", "LEAVE_APPLY", "PAYSLIP_VIEW", "COMMUNICATION_VIEW",
  "COMMUNICATION_SEND", "FEES_VIEW",
]);

export type PortalRole = "admin" | "parent" | "teacher";

/** Someone whose only roles are TEACHER and/or PARENT is fundamentally a teacher/parent account —
 *  even if individually granted one extra admin permission (e.g. PAYROLL_APPROVE) — not a genuine
 *  admin-portal user. ADMIN, or any other (custom) role, counts as admin-portal-eligible, matching
 *  AuthService.REDIRECT's own "anything that isn't specifically TEACHER/PARENT defaults to
 *  /admin" rule. */
export function isAdminEligible(user: AuthUser | null): boolean {
  const myRoles = user?.roles ?? "";
  const hasRole = (r: string) => myRoles.includes(r);
  return hasRole("ADMIN") || (!hasRole("TEACHER") && !hasRole("PARENT"));
}

/** Nav visibility (and route access — see canAccessPath below) follows the viewer's actual
 *  granted permissions, not just which portal they're in — an item with no `permissions` listed
 *  stays visible/reachable to everyone in that portal (matches a read deliberately left open
 *  backend-side) UNLESS this is the admin portal and the viewer isn't admin-portal-eligible, in
 *  which case an ungated item defaults to HIDDEN instead (e.g. "Management" has no permission
 *  concept at all — safe default is hidden, not shown-to-everyone, for a non-admin). */
export function hasNavAccess(role: PortalRole, user: AuthUser | null, perms?: string[]): boolean {
  const myPermissions = user?.permissions ?? [];
  if (role !== "admin" || isAdminEligible(user)) {
    return !perms || perms.length === 0 || perms.some((p) => myPermissions.includes(p));
  }
  if (!perms || perms.length === 0) return false;
  return perms.some((p) => myPermissions.includes(p) && !TEACHER_PARENT_BASELINE.has(p));
}

function allNavItemsFor(role: PortalRole): NavItem[] {
  if (role === "admin") return adminNavItems;
  if (role === "teacher") return teacherNavItems;
  return parentNavItems;
}

/** Flattens the nav tree (+ the extra non-nav admin routes) into {to, permissions} pairs, used by
 *  both the sidebar's own filtering (indirectly, via hasNavAccess above) and the route guard in
 *  AppLayout — one definition, so a hidden nav link and a blocked direct-URL visit can never
 *  disagree about who's allowed to see a given screen. */
function flattenRoutes(role: PortalRole): NavChild[] {
  const items = allNavItemsFor(role);
  const flat: NavChild[] = [];
  for (const item of items) {
    if (item.children) flat.push(...item.children);
    else flat.push(item);
  }
  if (role === "admin") flat.push(...adminExtraRoutePermissions);
  return flat;
}

/** True if `pathname` should be reachable by this user — finds the most specific (longest `to`)
 *  matching route entry and applies hasNavAccess to its permissions. A pathname matching no known
 *  route entry at all is left open (e.g. `/admin/payroll/runs/:id`, whose own page already does
 *  finer-grained inline gating for its sensitive actions). */
export function canAccessPath(role: PortalRole, user: AuthUser | null, pathname: string): boolean {
  const candidates = flattenRoutes(role).filter((r) => r.to && pathname.startsWith(r.to));
  if (candidates.length === 0) return true;
  const best = candidates.reduce((a, b) => (b.to.length > a.to.length ? b : a));
  return hasNavAccess(role, user, best.permissions);
}
