import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { AdmissionApi, StudentApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export interface StudentDocument {
  name: string;
  type: string;
  size: number;
}

export interface Student {
  id: number;
  uuid: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  grade: string;
  stream: string;
  gender: string;
  status: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  dateOfBirth: string;
  address: string;
  medicalNotes: string;
  documents: StudentDocument[];
}

export interface Application {
  id: number;
  uuid: string;
  applicationId: string;
  firstName: string;
  lastName: string;
  grade: string;
  stream: string;
  gender: string;
  parentName: string;
  parentRelationship: string;
  parentPhone: string;
  parentEmail: string;
  dateOfBirth: string;
  address: string;
  medicalNotes: string;
  stage: string;
  createdAt: string;
  documents: StudentDocument[];
}

// Map backend enum stage to display label
export const STAGE_LABELS: Record<string, string> = {
  APPLICATION_REVIEW: "Application Review",
  INTERVIEW_SCHEDULED: "Interview Scheduled",
  OFFER_SENT: "Offer Sent",
  FEE_PAYMENT: "Fee Payment",
  ENROLLED: "Enrolled",
  REJECTED: "Rejected",
};

const STAGE_SEQUENCE = [
  "APPLICATION_REVIEW",
  "INTERVIEW_SCHEDULED",
  "OFFER_SENT",
  "FEE_PAYMENT",
  "ENROLLED",
];

interface StudentContextType {
  students: Student[];
  applications: Application[];
  loadingStudents: boolean;
  loadingApplications: boolean;
  addApplication: (app: any) => Promise<void>;
  updateApplicationStage: (uuid: string, stage: string) => Promise<void>;
  updateStudent: (uuid: string, data: Partial<Student>) => Promise<void>;
  updateStudentStatus: (uuid: string, status: string) => Promise<void>;
  deleteStudent: (uuid: string) => Promise<void>;
  refreshStudents: () => Promise<void>;
  refreshApplications: () => Promise<void>;
  getNextStage: (current: string) => string | null;
}

const StudentContext = createContext<StudentContextType | undefined>(undefined);

export const useStudentContext = () => {
  const ctx = useContext(StudentContext);
  if (!ctx) throw new Error("useStudentContext must be used within StudentProvider");
  return ctx;
};

export const StudentProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingApplications, setLoadingApplications] = useState(false);

  const refreshStudents = async () => {
    setLoadingStudents(true);
    try {
      const data = await StudentApi.getAll();
      setStudents(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load students");
    } finally {
      setLoadingStudents(false);
    }
  };

  const refreshApplications = async () => {
    setLoadingApplications(true);
    try {
      const data = await AdmissionApi.getAll();
      setApplications(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load applications");
    } finally {
      setLoadingApplications(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    refreshStudents();
    refreshApplications();
  }, [isAuthenticated]);

  const addApplication = async (app: any) => {
    const payload = {
      firstName: app.firstName,
      lastName: app.lastName,
      gender: app.gender,
      dateOfBirth: app.dob,
      grade: app.grade,
      gradeLevelUuid: app.gradeLevelUuid || null,
      stream: app.stream || null,
      parentName: app.parentName,
      parentRelationship: app.parentRelationship,
      parentPhone: app.parentPhone,
      parentEmail: app.parentEmail || null,
      address: app.address || null,
      medicalNotes: app.medicalNotes || null,
    };
    const created = await AdmissionApi.create(payload);
    setApplications(prev => Array.isArray(prev) ? [created, ...prev] : [created]);
  };

  const updateApplicationStage = async (uuid: string, stage: string) => {
    const updated = await AdmissionApi.updateStage(uuid, stage);
    setApplications(prev => prev.map(a => a.uuid === uuid ? updated : a));
    if (stage === "ENROLLED") {
      await refreshStudents();
    }
  };

  const updateStudent = async (uuid: string, data: Partial<Student>) => {
    const s = students.find(x => x.uuid === uuid)!;
    const payload = {
      firstName: data.firstName ?? s.firstName,
      lastName: data.lastName ?? s.lastName,
      gender: data.gender ?? s.gender,
      dateOfBirth: data.dateOfBirth ?? s.dateOfBirth,
      grade: data.grade ?? s.grade,
      stream: data.stream ?? s.stream,
      parentName: data.parentName ?? s.parentName,
      parentPhone: data.parentPhone ?? s.parentPhone,
      parentEmail: data.parentEmail ?? s.parentEmail,
      address: data.address ?? s.address,
      medicalNotes: data.medicalNotes ?? s.medicalNotes,
    };
    const updated = await StudentApi.update(uuid, payload);
    setStudents(prev => prev.map(x => x.uuid === uuid ? updated : x));
  };

  const updateStudentStatus = async (uuid: string, status: string) => {
    const updated = await StudentApi.updateStatus(uuid, status);
    setStudents(prev => prev.map(x => x.uuid === uuid ? updated : x));
  };

  const deleteStudent = async (uuid: string) => {
    await StudentApi.delete(uuid);
    setStudents(prev => prev.filter(x => x.uuid !== uuid));
  };

  const getNextStage = (current: string): string | null => {
    const idx = STAGE_SEQUENCE.indexOf(current);
    return idx >= 0 && idx < STAGE_SEQUENCE.length - 1 ? STAGE_SEQUENCE[idx + 1] : null;
  };

  return (
    <StudentContext.Provider value={{
      students, applications, loadingStudents, loadingApplications,
      addApplication, updateApplicationStage, updateStudent, updateStudentStatus,
      deleteStudent, refreshStudents, refreshApplications, getNextStage,
    }}>
      {children}
    </StudentContext.Provider>
  );
};
