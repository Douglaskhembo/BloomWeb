import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { StudentProvider } from "@/context/StudentContext";
import { PayrollProvider } from "@/context/PayrollContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";

// Admin
import AdminDashboard from "./pages/admin/AdminDashboard";
import StudentsPage from "./pages/admin/StudentsPage";
import AdmissionsPage from "./pages/admin/AdmissionsPage";
import AcademicsPage from "./pages/admin/AcademicsPage";
import FinancePage from "./pages/admin/FinancePage";
import TimetablePage from "./pages/admin/TimetablePage";
import TransportPage from "./pages/admin/TransportPage";
import CommunicationPage from "./pages/admin/CommunicationPage";
import ReportsPage from "./pages/admin/ReportsPage";
import SettingsPage from "./pages/admin/SettingsPage";
import TeachersPage from "./pages/admin/TeachersPage";
import LeaveManagementPage from "./pages/admin/LeaveManagementPage";
import PayrollPage from "./pages/admin/PayrollPage";
import PayrollRunDetailPage from "./pages/admin/PayrollRunDetailPage";
import SuppliersPage from "./pages/admin/SuppliersPage";
import BillsPage from "./pages/admin/BillsPage";
import UsersPage from "./pages/admin/UsersPage";
import RolesPermissionsPage from "./pages/admin/RolesPermissionsPage";
import StudentPerformancePage from "./pages/admin/StudentPerformancePage";
import SubjectPerformancePage from "./pages/admin/SubjectPerformancePage";
import GradeComparisonPage from "./pages/admin/GradeComparisonPage";
import SchoolFeesPage from "./pages/admin/SchoolFeesPage";
import FeeStatementPage from "./pages/admin/FeeStatementPage";
import FeeCollectionSummaryPage from "./pages/admin/FeeCollectionSummaryPage";
import FeeArrearsPage from "./pages/admin/FeeArrearsPage";
import SystemSetupsPage from "./pages/admin/SystemSetupsPage";
import ManagementPage from "./pages/admin/ManagementPage";
import LeaveTypesSetupPage from "./pages/admin/LeaveTypesSetupPage";
import FeeStructureSetupPage from "./pages/admin/FeeStructureSetupPage";
import SchoolSetupPage from "./pages/admin/SchoolSetupPage";
import SubjectsSetupPage from "./pages/admin/SubjectsSetupPage";
import StaffRolesSetupPage from "./pages/admin/StaffRolesSetupPage";
import HolidaysSetupPage from "./pages/admin/HolidaysSetupPage";
import AcademicCalendarSetupPage from "./pages/admin/AcademicCalendarSetupPage";
import PayrollSetupPage from "./pages/admin/PayrollSetupPage";
import GradingSetupPage from "./pages/admin/GradingSetupPage";
import StaffSalariesPage from "./pages/admin/StaffSalariesPage";
import StaffPaymentDetailsPage from "./pages/admin/StaffPaymentDetailsPage";
import BanksSetupPage from "./pages/admin/BanksSetupPage";
import BiometricsSetupPage from "./pages/admin/BiometricsSetupPage";
import AttendancePage from "./pages/admin/AttendancePage";
// Parent
import ParentDashboard from "./pages/parent/ParentDashboard";
import ParentGrades from "./pages/parent/ParentGrades";
import ParentFees from "./pages/parent/ParentFees";
import ParentCalendar from "./pages/parent/ParentCalendar";
import ParentTransport from "./pages/parent/ParentTransport";
import ParentMessages from "./pages/parent/ParentMessages";
// Teacher
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherClasses from "./pages/teacher/TeacherClasses";
import TeacherTimetable from "./pages/teacher/TeacherTimetable";
import TeacherLeave from "./pages/teacher/TeacherLeave";
import TeacherProfile from "./pages/teacher/TeacherProfile";
import TeacherPayslips from "./pages/teacher/TeacherPayslips";
import TeacherAttendance from "./pages/teacher/TeacherAttendance";
import ParentAttendance from "./pages/parent/ParentAttendance";
import TermReportsPage from "./pages/shared/TermReportsPage";

const queryClient = new QueryClient();

// Redirect to login if not authenticated
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
}

function AppRoutes() {
  const { isAuthenticated, user } = useAuth();

  return (
    <Routes>
      {/* Login — redirect away if already authenticated */}
      <Route
        path="/"
        element={isAuthenticated
          ? <Navigate to={user?.redirectPath ?? '/admin'} replace />
          : <LoginPage />}
      />

      {/* Admin routes */}
      <Route path="/admin" element={<RequireAuth><AppLayout role="admin" /></RequireAuth>}>
        <Route index element={<AdminDashboard />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="admissions" element={<AdmissionsPage />} />
        <Route path="academics" element={<AcademicsPage />} />
        <Route path="finance" element={<FinancePage />} />
        <Route path="timetable" element={<TimetablePage />} />
        <Route path="school-fees" element={<SchoolFeesPage />} />
        <Route path="fee-statement" element={<FeeStatementPage />} />
        <Route path="fee-collection-summary" element={<FeeCollectionSummaryPage />} />
        <Route path="fee-arrears" element={<FeeArrearsPage />} />
        <Route path="transport" element={<TransportPage />} />
        <Route path="communication" element={<CommunicationPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="teachers" element={<TeachersPage />} />
        <Route path="leave" element={<LeaveManagementPage />} />
        <Route path="payroll" element={<PayrollPage />} />
        <Route path="payroll/runs/:id" element={<PayrollRunDetailPage />} />
        <Route path="staff-salaries" element={<StaffSalariesPage />} />
        <Route path="staff-payment-details" element={<StaffPaymentDetailsPage />} />
        <Route path="setup-banks" element={<BanksSetupPage />} />
        <Route path="suppliers" element={<SuppliersPage />} />
        <Route path="bills" element={<BillsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="roles" element={<RolesPermissionsPage />} />
        <Route path="system-setups" element={<SystemSetupsPage />} />
        <Route path="management" element={<ManagementPage />} />
        <Route path="setup-leave-types" element={<LeaveTypesSetupPage />} />
        <Route path="setup-fee-structure" element={<FeeStructureSetupPage />} />
        <Route path="setup-school" element={<SchoolSetupPage />} />
        <Route path="setup-subjects" element={<SubjectsSetupPage />} />
        <Route path="setup-staff-roles" element={<StaffRolesSetupPage />} />
        <Route path="setup-public-holidays" element={<HolidaysSetupPage />} />
        <Route path="setup-academic-calendar" element={<AcademicCalendarSetupPage />} />
        <Route path="setup-payroll" element={<PayrollSetupPage />} />
        <Route path="setup-grading" element={<GradingSetupPage />} />
        <Route path="setup-biometrics" element={<BiometricsSetupPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="student-performance" element={<StudentPerformancePage />} />
        <Route path="subject-performance" element={<SubjectPerformancePage />} />
        <Route path="grade-comparison" element={<GradeComparisonPage />} />
        <Route path="term-reports" element={<TermReportsPage role="admin" />} />
      </Route>

      {/* Parent routes */}
      <Route path="/parent" element={<RequireAuth><AppLayout role="parent" /></RequireAuth>}>
        <Route index element={<ParentDashboard />} />
        <Route path="attendance" element={<ParentAttendance />} />
        <Route path="grades" element={<ParentGrades />} />
        <Route path="fees" element={<ParentFees />} />
        <Route path="calendar" element={<ParentCalendar />} />
        <Route path="transport" element={<ParentTransport />} />
        <Route path="communication" element={<ParentMessages />} />
        <Route path="term-reports" element={<TermReportsPage role="parent" />} />
      </Route>

      {/* Teacher routes */}
      <Route path="/teacher" element={<RequireAuth><AppLayout role="teacher" /></RequireAuth>}>
        <Route index element={<TeacherDashboard />} />
        <Route path="attendance" element={<TeacherAttendance />} />
        <Route path="classes" element={<TeacherClasses />} />
        <Route path="timetable" element={<TeacherTimetable />} />
        <Route path="leave" element={<TeacherLeave />} />
        <Route path="payslips" element={<TeacherPayslips />} />
        <Route path="profile" element={<TeacherProfile />} />
        <Route path="communication" element={<ParentMessages />} />
        <Route path="term-reports" element={<TermReportsPage role="teacher" />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <StudentProvider>
              <PayrollProvider>
                <AppRoutes />
              </PayrollProvider>
            </StudentProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
