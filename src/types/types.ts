export interface GradeFormValue {
  name: string;
  displayOrder: number;
  streams: number;
  status: "active" | "inactive";
}