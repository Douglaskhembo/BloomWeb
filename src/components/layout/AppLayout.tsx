import { Outlet, useNavigate } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import { Bell, Search, Sun, Moon, Monitor, Check, LogOut, KeyRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/context/AuthContext";

interface AppLayoutProps {
  role: "admin" | "parent" | "teacher";
}

const AppLayout = ({ role }: AppLayoutProps) => {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const initials = user
    ? `${user.firstName.charAt(0)}${user.otherNames.charAt(0)}`.toUpperCase()
    : role.slice(0, 2).toUpperCase();

  const displayName = user ? `${user.firstName} ${user.otherNames}` : role;

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar role={role} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search..." className="pl-10 bg-muted/50 border-0 focus-visible:ring-1" />
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="w-9 h-9 cursor-pointer">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-3 py-2 text-sm font-medium border-b border-border truncate">{displayName}</div>
                <div className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">Theme</div>
                <DropdownMenuItem onClick={() => setTheme("light")}>
                  <Sun className="w-4 h-4 mr-2" /> Light
                  {theme === "light" && <Check className="w-4 h-4 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                  <Moon className="w-4 h-4 mr-2" /> Dark
                  {theme === "dark" && <Check className="w-4 h-4 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                  <Monitor className="w-4 h-4 mr-2" /> System
                  {theme === "system" && <Check className="w-4 h-4 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={role !== "teacher"} onClick={role === "teacher" ? () => navigate("/teacher/profile") : undefined}>
                  <KeyRound className="w-4 h-4 mr-2" />
                  {role === "teacher" ? "My Profile" : "Change Password"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { logout(); navigate("/", { replace: true }); }} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
        <footer className="border-t border-border bg-card/50 px-6 py-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} BloomSchool. All rights reserved.</span>
          <span>v1.0.0</span>
        </footer>
      </div>
    </div>
  );
};

export default AppLayout;
