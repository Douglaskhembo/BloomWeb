export interface GradeFormValue {
  name: string;
  displayOrder: number;
  streams: number;
  /** Required (exactly `streams` entries) when streams > 1; ignored otherwise. */
  streamNames?: string[];
  /** Max students for the single stream; used only when streams === 1. Blank/0 = unlimited. */
  capacity?: number;
  /** One capacity per streamNames entry, same order; used only when streams > 1. Blank/0 entry = unlimited. */
  streamCapacities?: number[];
  status: "active" | "inactive";
}