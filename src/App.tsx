import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/layout/AppLayout";
import Index from "./pages/Index";
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
import SuppliersPage from "./pages/admin/SuppliersPage";
import BillsPage from "./pages/admin/BillsPage";
import UsersPage from "./pages/admin/UsersPage";
import RolesPermissionsPage from "./pages/admin/RolesPermissionsPage";
import StudentPerformancePage from "./pages/admin/StudentPerformancePage";
import SubjectPerformancePage from "./pages/admin/SubjectPerformancePage";
import GradeComparisonPage from "./pages/admin/GradeComparisonPage";
import SchoolFeesPage from "./pages/admin/SchoolFeesPage";
import FeeStatementPage from "./pages/admin/FeeStatementPage";
import SystemSetupsPage from "./pages/admin/SystemSetupsPage";
import ManagementPage from "./pages/admin/ManagementPage";
import LeaveTypesSetupPage from "./pages/admin/LeaveTypesSetupPage";
import FeeStructureSetupPage from "./pages/admin/FeeStructureSetupPage";
import SchoolSetupPage from "./pages/admin/SchoolSetupPage";
import SubjectsSetupPage from "./pages/admin/SubjectsSetupPage";
import PayrollSetupPage from "./pages/admin/PayrollSetupPage";
import GradingSetupPage from "./pages/admin/GradingSetupPage";
import StaffSalariesPage from "./pages/admin/StaffSalariesPage";
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
import TeacherPayslips from "./pages/teacher/TeacherPayslips";
import TermReportsPage from "./pages/shared/TermReportsPage";

const queryClient = new QueryClient();

import { ThemeProvider } from "@/components/ThemeProvider";
import { StudentProvider } from "@/context/StudentContext";
import { PayrollProvider } from "@/context/PayrollContext";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <StudentProvider>
    <PayrollProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />

          {/* Admin routes */}
          <Route path="/admin" element={<AppLayout role="admin" />}>
            <Route index element={<AdminDashboard />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="admissions" element={<AdmissionsPage />} />
            <Route path="academics" element={<AcademicsPage />} />
            <Route path="finance" element={<FinancePage />} />
            <Route path="timetable" element={<TimetablePage />} />
            <Route path="school-fees" element={<SchoolFeesPage />} />
            <Route path="fee-statement" element={<FeeStatementPage />} />
            <Route path="transport" element={<TransportPage />} />
            <Route path="communication" element={<CommunicationPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="teachers" element={<TeachersPage />} />
            <Route path="leave" element={<LeaveManagementPage />} />
            <Route path="payroll" element={<PayrollPage />} />
            <Route path="staff-salaries" element={<StaffSalariesPage />} />
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
            <Route path="setup-payroll" element={<PayrollSetupPage />} />
            <Route path="setup-grading" element={<GradingSetupPage />} />
            <Route path="student-performance" element={<StudentPerformancePage />} />
            <Route path="subject-performance" element={<SubjectPerformancePage />} />
            <Route path="grade-comparison" element={<GradeComparisonPage />} />
            <Route path="term-reports" element={<TermReportsPage role="admin" />} />
          </Route>

          {/* Parent routes */}
          <Route path="/parent" element={<AppLayout role="parent" />}>
            <Route index element={<ParentDashboard />} />
            <Route path="grades" element={<ParentGrades />} />
            <Route path="fees" element={<ParentFees />} />
            <Route path="calendar" element={<ParentCalendar />} />
            <Route path="transport" element={<ParentTransport />} />
            <Route path="communication" element={<ParentMessages />} />
            <Route path="term-reports" element={<TermReportsPage role="parent" />} />
          </Route>

          {/* Teacher routes */}
          <Route path="/teacher" element={<AppLayout role="teacher" />}>
            <Route index element={<TeacherDashboard />} />
            <Route path="classes" element={<TeacherClasses />} />
            <Route path="timetable" element={<TeacherTimetable />} />
            <Route path="leave" element={<TeacherLeave />} />
            <Route path="payslips" element={<TeacherPayslips />} />
            <Route path="communication" element={<ParentMessages />} />
            <Route path="term-reports" element={<TermReportsPage role="teacher" />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </PayrollProvider>
    </StudentProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
