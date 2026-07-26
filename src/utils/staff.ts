/** Human-facing identifier for a staff member in payroll-related tables/exports — prefers National ID,
 *  falls back to Passport Number, then the internal staff code, rather than ever showing the raw UUID. */
export const getStaffIdentifier = (s: { idNumber?: string; passportNumber?: string; staffId?: string; uuid?: string }): string =>
  s.idNumber?.trim() || s.passportNumber?.trim() || s.staffId?.trim() || s.uuid || "";
