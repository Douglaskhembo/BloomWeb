import { createContext, useContext, useState, ReactNode } from "react";

export interface StudentDocument {
  name: string;
  type: string;
  size: number;
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  grade: string;
  stream: string;
  gender: string;
  status: string;
  parent: string;
  parentPhone: string;
  parentEmail: string;
  dob: string;
  address: string;
  medicalNotes: string;
  documents: StudentDocument[];
}

export interface Application {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  grade: string;
  stream: string;
  gender: string;
  parentName: string;
  parentRelationship: string;
  parentPhone: string;
  parentEmail: string;
  dob: string;
  address: string;
  medicalNotes: string;
  stage: string;
  date: string;
  documents: StudentDocument[];
}

interface StudentContextType {
  students: Student[];
  applications: Application[];
  addApplication: (app: Omit<Application, "id" | "name" | "date" | "stage">) => void;
  updateApplicationStage: (id: string, stage: string) => void;
  updateStudent: (id: string, data: Partial<Student>) => void;
  deleteStudent: (id: string) => void;
}

const initialStudents: Student[] = [
  { id: "2024/0156", firstName: "Joy", lastName: "Kamau", name: "Joy Kamau", grade: "Grade 5", stream: "A", gender: "Female", status: "Active", parent: "Mrs. Kamau", parentPhone: "+254712345678", parentEmail: "kamau@email.com", dob: "2015-03-12", address: "Nairobi", medicalNotes: "", documents: [] },
  { id: "2024/0201", firstName: "Brian", lastName: "Odhiambo", name: "Brian Odhiambo", grade: "Grade 3", stream: "B", gender: "Male", status: "Active", parent: "Mr. Odhiambo", parentPhone: "+254723456789", parentEmail: "odhiambo@email.com", dob: "2017-07-22", address: "Kisumu", medicalNotes: "", documents: [] },
  { id: "2024/0089", firstName: "Faith", lastName: "Wanjiku", name: "Faith Wanjiku", grade: "Grade 7", stream: "A", gender: "Female", status: "Active", parent: "Mr. Wanjiku", parentPhone: "+254734567890", parentEmail: "wanjiku@email.com", dob: "2013-01-05", address: "Nakuru", medicalNotes: "", documents: [] },
  { id: "2023/0445", firstName: "Kevin", lastName: "Mwangi", name: "Kevin Mwangi", grade: "Grade 9", stream: "A", gender: "Male", status: "Active", parent: "Mrs. Mwangi", parentPhone: "+254745678901", parentEmail: "mwangi@email.com", dob: "2011-11-18", address: "Nairobi", medicalNotes: "", documents: [] },
  { id: "2024/0312", firstName: "Mercy", lastName: "Chelimo", name: "Mercy Chelimo", grade: "PP2", stream: "-", gender: "Female", status: "Active", parent: "Mr. Chelimo", parentPhone: "+254756789012", parentEmail: "chelimo@email.com", dob: "2020-06-30", address: "Eldoret", medicalNotes: "", documents: [] },
  { id: "2023/0567", firstName: "David", lastName: "Kibet", name: "David Kibet", grade: "Grade 6", stream: "B", gender: "Male", status: "Suspended", parent: "Mrs. Kibet", parentPhone: "+254767890123", parentEmail: "kibet@email.com", dob: "2014-09-14", address: "Kericho", medicalNotes: "Asthma", documents: [{ name: "Birth Certificate.pdf", type: "Birth Certificate", size: 245000 }, { name: "Medical Report.pdf", type: "Medical Records", size: 180000 }] },
  { id: "2024/0423", firstName: "Grace", lastName: "Akinyi", name: "Grace Akinyi", grade: "Grade 2", stream: "A", gender: "Female", status: "Active", parent: "Mr. Omondi", parentPhone: "+254778901234", parentEmail: "omondi@email.com", dob: "2018-04-25", address: "Mombasa", medicalNotes: "", documents: [] },
  { id: "2024/0190", firstName: "Peter", lastName: "Njoroge", name: "Peter Njoroge", grade: "Grade 4", stream: "A", gender: "Male", status: "Active", parent: "Mrs. Njoroge", parentPhone: "+254789012345", parentEmail: "njoroge@email.com", dob: "2016-12-08", address: "Thika", medicalNotes: "", documents: [] },
];

const initialApplications: Application[] = [
  { id: "APP-001", firstName: "Samuel", lastName: "Otieno", name: "Samuel Otieno", grade: "Grade 3", stream: "A", gender: "Male", parentName: "Mr. Otieno", parentRelationship: "Father", parentPhone: "+254712345678", parentEmail: "otieno@email.com", dob: "2017-05-10", address: "Nairobi", medicalNotes: "", stage: "Application Review", date: "2026-04-05", documents: [{ name: "Birth Certificate.pdf", type: "Birth Certificate", size: 312000 }] },
  { id: "APP-002", firstName: "Amina", lastName: "Hassan", name: "Amina Hassan", grade: "PP1", stream: "-", gender: "Female", parentName: "Mrs. Hassan", parentRelationship: "Mother", parentPhone: "+254723456789", parentEmail: "hassan@email.com", dob: "2021-02-14", address: "Mombasa", medicalNotes: "", stage: "Interview Scheduled", date: "2026-04-06", documents: [] },
  { id: "APP-003", firstName: "Daniel", lastName: "Kipchoge", name: "Daniel Kipchoge", grade: "Grade 6", stream: "B", gender: "Male", parentName: "Mr. Kipchoge", parentRelationship: "Father", parentPhone: "+254734567890", parentEmail: "kipchoge@email.com", dob: "2014-08-20", address: "Eldoret", medicalNotes: "", stage: "Offer Sent", date: "2026-04-04", documents: [{ name: "Transfer Letter.pdf", type: "Transfer Letter", size: 156000 }, { name: "Previous Report.pdf", type: "Previous School Report", size: 420000 }] },
  { id: "APP-004", firstName: "Lucy", lastName: "Wambui", name: "Lucy Wambui", grade: "Grade 1", stream: "A", gender: "Female", parentName: "Mrs. Wambui", parentRelationship: "Mother", parentPhone: "+254745678901", parentEmail: "wambui@email.com", dob: "2019-11-03", address: "Nakuru", medicalNotes: "", stage: "Fee Payment", date: "2026-04-03", documents: [{ name: "Birth Certificate.pdf", type: "Birth Certificate", size: 289000 }] },
];

const StudentContext = createContext<StudentContextType | undefined>(undefined);

export const useStudentContext = () => {
  const ctx = useContext(StudentContext);
  if (!ctx) throw new Error("useStudentContext must be used within StudentProvider");
  return ctx;
};

export const StudentProvider = ({ children }: { children: ReactNode }) => {
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [applications, setApplications] = useState<Application[]>(initialApplications);

  const addApplication = (app: Omit<Application, "id" | "name" | "date" | "stage">) => {
    const newApp: Application = {
      ...app,
      id: `APP-${String(applications.length + 1).padStart(3, "0")}`,
      name: `${app.firstName} ${app.lastName}`,
      stage: "Application Review",
      date: new Date().toISOString().split("T")[0],
    };
    setApplications(prev => [newApp, ...prev]);
  };

  const updateApplicationStage = (id: string, stage: string) => {
    setApplications(prev => prev.map(app => {
      if (app.id !== id) return app;
      const updated = { ...app, stage };
      if (stage === "Enrolled") {
        const admNo = `${new Date().getFullYear()}/${String(students.length + 1).padStart(4, "0")}`;
        const newStudent: Student = {
          id: admNo,
          firstName: updated.firstName,
          lastName: updated.lastName,
          name: updated.name,
          grade: updated.grade,
          stream: updated.stream || "-",
          gender: updated.gender,
          status: "Active",
          parent: updated.parentName,
          parentPhone: updated.parentPhone,
          parentEmail: updated.parentEmail,
          dob: updated.dob,
          address: updated.address,
          medicalNotes: updated.medicalNotes,
          documents: updated.documents || [],
        };
        setStudents(prev => [newStudent, ...prev]);
      }
      return updated;
    }));
  };

  const updateStudent = (id: string, data: Partial<Student>) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  };

  const deleteStudent = (id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
  };

  return (
    <StudentContext.Provider value={{ students, applications, addApplication, updateApplicationStage, updateStudent, deleteStudent }}>
      {children}
    </StudentContext.Provider>
  );
};
