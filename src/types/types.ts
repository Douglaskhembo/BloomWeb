export interface GradeFormValue {
  name: string;
  displayOrder: number;
  streams: number;
  /** Required (exactly `streams` entries) when streams > 1; ignored otherwise. */
  streamNames?: string[];
  status: "active" | "inactive";
}