import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { School, Eye, EyeOff } from "lucide-react";
import Swal from "sweetalert2";

const demoAccounts = [
  { role: "admin", label: "School Admin", email: "admin@edumanager.com", password: "admin123", path: "/admin" },
  { role: "teacher", label: "Teacher", email: "teacher@edumanager.com", password: "teacher123", path: "/teacher" },
  { role: "parent", label: "Parent", email: "parent@edumanager.com", password: "parent123", path: "/parent" },
];

const Index = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const account = demoAccounts.find((a) => a.email === email && a.password === password);
    if (account) {
      Swal.fire({
        title: 'Success',
        text: `Welcome! Logged in as ${account.label}`,
        icon: 'success',
        showConfirmButton: true,
      });
      navigate(account.path);
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: "Invalid credentials. Try a demo account below.",
        showConfirmButton: true,
      });
    }
  };

  const handleDemoLogin = (account: typeof demoAccounts[0]) => {
    Swal.fire({
      title: 'Success',
      text: `Welcome! Logged in as ${account.label}`,
      icon: 'success',
      showConfirmButton: true,
    });
    navigate(account.path);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-2">
            <School className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">EduManager</h1>
          <p className="text-sm text-muted-foreground">School Management System</p>
        </div>

        {/* Login Form */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Sign In</CardTitle>
            <CardDescription>Enter your credentials to access the system</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@school.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full">Sign In</Button>
            </form>
          </CardContent>
        </Card>

        {/* Demo Accounts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Demo Accounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {demoAccounts.map((account) => (
              <button
                key={account.role}
                onClick={() => handleDemoLogin(account)}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
              >
                <div>
                  <p className="text-sm font-medium">{account.label}</p>
                  <p className="text-xs text-muted-foreground">{account.email}</p>
                </div>
                <Button variant="outline" size="sm" className="shrink-0">Login</Button>
              </button>
            ))}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          © 2026 EduManager. Built for Kenyan primary schools.
        </p>
      </div>
    </div>
  );
};

export default Index;
