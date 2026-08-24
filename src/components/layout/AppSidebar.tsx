import { NavLink, useLocation } from "react-router-dom";
import { ChevronLeft, School, UserCircle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { adminNavItems, parentNavItems, teacherNavItems, hasNavAccess, type NavItem } from "@/config/navAccess";

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

  // Nav visibility follows the viewer's actual granted permissions, not just which portal they're
  // in — see hasNavAccess in navAccess.ts (shared with the AppLayout route guard, so a hidden nav
  // link and a blocked direct-URL visit can never disagree). A section whose every child gets
  // filtered out disappears too, rather than showing an empty expandable group.
  const navItems = allNavItems
    .map((item) => {
      if (!item.children) return hasNavAccess(role, user, item.permissions) ? item : null;
      const children = item.children.filter((c) => hasNavAccess(role, user, c.permissions));
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
