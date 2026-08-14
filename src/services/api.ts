import axios from "axios";

let _token: string | null = null;
let _onUnauthorized: (() => void) | null = null;

export const setAuthToken = (token: string | null) => { _token = token; };
export const setUnauthorizedHandler = (handler: () => void) => { _onUnauthorized = handler; };

const applyAuthInterceptor = (instance: ReturnType<typeof axios.create>) => {
  instance.interceptors.request.use(config => {
    if (_token) config.headers.Authorization = `Bearer ${_token}`;
    return config;
  });
  instance.interceptors.response.use(
    res => res,
    err => {
      const url = err.config?.url ?? '';
      const isAuthFlow = url.includes('/auth/login') || url.includes('/auth/reset-password');
      if (err.response?.status === 401 && !isAuthFlow && _onUnauthorized) _onUnauthorized();
      return Promise.reject(err);
    }
  );
  return instance;
};

// Backend responses wrap the payload as either `body` (auth.utils.ApiResponse)
// or `data` (common.dto.ApiResponse), depending on which controller handled the request.
const unwrap = (res: { data?: any }): any => res.data?.body ?? res.data?.data ?? res.data;
const unwrapList = (res: { data?: any }): any[] => {
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

const BASE = (import.meta as any).env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

const userAPI    = applyAuthInterceptor(axios.create({ baseURL: `${BASE}/users`,      headers: { 'Content-Type': 'application/json' } }));
const roleAPI    = applyAuthInterceptor(axios.create({ baseURL: `${BASE}/role`,       headers: { 'Content-Type': 'application/json' } }));
const moduleAPI  = applyAuthInterceptor(axios.create({ baseURL: `${BASE}/module`,     headers: { 'Content-Type': 'application/json' } }));
const permAPI    = applyAuthInterceptor(axios.create({ baseURL: `${BASE}/permission`, headers: { 'Content-Type': 'application/json' } }));
const _authAPI   = applyAuthInterceptor(axios.create({ baseURL: `${BASE}/auth`,       headers: { 'Content-Type': 'application/json' } }));
const staffAPI   = applyAuthInterceptor(axios.create({ baseURL: `${BASE}/staff`,      headers: { 'Content-Type': 'application/json' } }));
const studentAPI = applyAuthInterceptor(axios.create({ baseURL: `${BASE}`,            headers: { 'Content-Type': 'application/json' } }));
const schoolAPI  = applyAuthInterceptor(axios.create({ baseURL: `${BASE}/school`,     headers: { 'Content-Type': 'application/json' } }));
const leaveAPI   = applyAuthInterceptor(axios.create({ baseURL: `${BASE}`,            headers: { 'Content-Type': 'application/json' } }));
const feesAPI    = applyAuthInterceptor(axios.create({ baseURL: `${BASE}/fees`,       headers: { 'Content-Type': 'application/json' } }));
const subjectAPI = applyAuthInterceptor(axios.create({ baseURL: `${BASE}/subjects`,   headers: { 'Content-Type': 'application/json' } }));
const staffRoleAPI = applyAuthInterceptor(axios.create({ baseURL: `${BASE}/staff-roles`, headers: { 'Content-Type': 'application/json' } }));
const holidayAPI = applyAuthInterceptor(axios.create({ baseURL: `${BASE}/holidays`, headers: { 'Content-Type': 'application/json' } }));
const academicCalendarAPI = applyAuthInterceptor(axios.create({ baseURL: `${BASE}/academic-calendar`, headers: { 'Content-Type': 'application/json' } }));
const supplierAPI = applyAuthInterceptor(axios.create({ baseURL: `${BASE}/suppliers`, headers: { 'Content-Type': 'application/json' } }));
const billsAPI = applyAuthInterceptor(axios.create({ baseURL: `${BASE}/bills`, headers: { 'Content-Type': 'application/json' } }));
const paymentsAPI = applyAuthInterceptor(axios.create({ baseURL: `${BASE}/payments`, headers: { 'Content-Type': 'application/json' } }));
const bioStaffAPI = applyAuthInterceptor(axios.create({ baseURL: `${BASE}/biometrics/staff`, headers: { 'Content-Type': 'application/json' } }));
const bioStudentAPI = applyAuthInterceptor(axios.create({ baseURL: `${BASE}/biometrics/students`, headers: { 'Content-Type': 'application/json' } }));
const bioCaptureAPI = applyAuthInterceptor(axios.create({ baseURL: `${BASE}/biometrics`, headers: { 'Content-Type': 'application/json' } }));
const deviceAPI = applyAuthInterceptor(axios.create({ baseURL: `${BASE}/attendance/devices`, headers: { 'Content-Type': 'application/json' } }));
const classTeacherAPI = applyAuthInterceptor(axios.create({ baseURL: `${BASE}/attendance/class-teachers`, headers: { 'Content-Type': 'application/json' } }));
const attendanceReportAPI = applyAuthInterceptor(axios.create({ baseURL: `${BASE}/attendance/reports`, headers: { 'Content-Type': 'application/json' } }));
const payrollAPI = applyAuthInterceptor(axios.create({ baseURL: `${BASE}/payroll`,    headers: { 'Content-Type': 'application/json' } }));
const commAPI    = applyAuthInterceptor(axios.create({ baseURL: `${BASE}/communication`, headers: { 'Content-Type': 'application/json' } }));
const timetablePeriodAPI = applyAuthInterceptor(axios.create({ baseURL: `${BASE}/timetable/periods`, headers: { 'Content-Type': 'application/json' } }));
const timetableEntryAPI  = applyAuthInterceptor(axios.create({ baseURL: `${BASE}/timetable/entries`, headers: { 'Content-Type': 'application/json' } }));
const assessmentAPI = applyAuthInterceptor(axios.create({ baseURL: `${BASE}/assessments`, headers: { 'Content-Type': 'application/json' } }));
const termReportAPI = applyAuthInterceptor(axios.create({ baseURL: `${BASE}/term-reports`, headers: { 'Content-Type': 'application/json' } }));

export const authAPI = {
  login: (data: { username: string; password: string }) => _authAPI.post('/login', data),
  changePassword: (data: any) => _authAPI.post('/change-password', data),
  resetPassword: (data: any, token?: string) =>
    _authAPI.post('/reset-password', data, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
  adminResetPassword: (userUuid: string) => _authAPI.post(`/admin/reset-password/${userUuid}`),
  toggle2FA: () => _authAPI.post('/toggle-2fa'),
};

export const UserApi = {
  getAll: async (): Promise<any[]> => {
    const res = await userAPI.get('');
    return unwrapList(res);
  },
  getByUuid: async (uuid: string): Promise<any> => {
    const res = await userAPI.get(`/${uuid}`);
    return unwrap(res);
  },
  create: async (data: any): Promise<any> => {
    const res = await userAPI.post('', data);
    return unwrap(res);
  },
  onboardStaff: async (data: any): Promise<any> => {
    const res = await userAPI.post('/onboard-staff', data);
    return unwrap(res);
  },
  update: async (uuid: string, data: any): Promise<any> => {
    const res = await userAPI.put(`/${uuid}`, data);
    return unwrap(res);
  },
  toggleStatus: async (uuid: string): Promise<void> => {
    await userAPI.patch(`/${uuid}/toggle-status`);
  },
  delete: async (uuid: string): Promise<void> => {
    await userAPI.delete(`/${uuid}`);
  },
  adminResetPassword: async (uuid: string): Promise<void> => {
    await _authAPI.post(`/admin/reset-password/${uuid}`);
  },
  getAssignedRoles: async (uuid: string): Promise<any[]> => {
    const res = await userAPI.get(`/${uuid}/assigned-roles`);
    return unwrapList(res);
  },
  assignRoles: async (data: { userUuid: string; roleUuids: string[] }): Promise<void> => {
    await userAPI.post('/assign-roles', data);
  },
  unassignRoles: async (data: { userUuid: string; roleUuids: string[] }): Promise<void> => {
    await userAPI.post('/unassign-roles', data);
  },
  getEffectivePermissions: async (uuid: string): Promise<any[]> => {
    const res = await userAPI.get(`/${uuid}/effective-permissions`);
    return unwrapList(res);
  },
  grantPermission: async (data: { userUuid: string; permissionUuids: string[] }): Promise<void> => {
    await userAPI.post('/grant-permission', data);
  },
  revokePermission: async (data: { userUuid: string; permissionUuid: string }): Promise<void> => {
    await userAPI.post('/revoke-permission', data);
  },
};

export const RoleApi = {
  getAll: async (): Promise<any[]> => {
    const res = await roleAPI.get('/allRoles');
    return unwrapList(res);
  },
  getByUuid: async (uuid: string): Promise<any> => {
    const res = await roleAPI.get(`/uuid/${uuid}`);
    return unwrap(res);
  },
  create: async (data: { roleName: string }): Promise<void> => {
    await roleAPI.post('/createRole', data);
  },
  update: async (uuid: string, data: { roleName: string }): Promise<void> => {
    await roleAPI.put(`/${uuid}`, data);
  },
  delete: async (uuid: string): Promise<void> => {
    await roleAPI.delete(`/${uuid}`);
  },
};

export const ModuleApi = {
  getAll: async (): Promise<any[]> => {
    const res = await moduleAPI.get('');
    return unwrapList(res);
  },
};

export const PermissionApi = {
  getAll: async (): Promise<any[]> => {
    const res = await permAPI.get('/all');
    return unwrapList(res);
  },
  getByModule: async (roleUuid: string, moduleUuid: string): Promise<any[]> => {
    const res = await permAPI.get('/by-module', { params: { roleUuid, moduleUuid } });
    return unwrapList(res);
  },
  create: async (data: any): Promise<void> => {
    await permAPI.post('/create', data);
  },
  grant: async (data: { roleUuid: string; permissionUuid: string }): Promise<void> => {
    await permAPI.post('/grant', data);
  },
  revoke: async (data: { roleUuid: string; permissionUuid: string }): Promise<void> => {
    await permAPI.post('/revoke', data);
  },
  delete: async (uuid: string): Promise<void> => {
    await permAPI.delete(`/${uuid}`);
  },
};

export const StaffApi = {
  getAll: async (search?: string): Promise<any[]> => {
    const res = await staffAPI.get('', { params: search ? { search } : {} });
    return unwrapList(res);
  },
  getByUuid: async (uuid: string): Promise<any> => {
    const res = await staffAPI.get(`/${uuid}`);
    return unwrap(res);
  },
  create: async (data: any): Promise<any> => {
    const res = await staffAPI.post('', data);
    return unwrap(res);
  },
  update: async (uuid: string, data: any): Promise<any> => {
    const res = await staffAPI.put(`/${uuid}`, data);
    return unwrap(res);
  },
  updateStatus: async (uuid: string, status: string): Promise<any> => {
    const res = await staffAPI.patch(`/${uuid}/status`, null, { params: { status } });
    return unwrap(res);
  },
  delete: async (uuid: string): Promise<void> => {
    await staffAPI.delete(`/${uuid}`);
  },
  getMyProfile: async (): Promise<any> => {
    const res = await staffAPI.get('/me');
    return unwrap(res);
  },
  updateMyProfile: async (data: any): Promise<any> => {
    const res = await staffAPI.patch('/me', data);
    return unwrap(res);
  },
};

export const AdmissionApi = {
  getAll: async (): Promise<any[]> => {
    const res = await studentAPI.get('/admissions');
    return unwrapList(res);
  },
  create: async (data: any): Promise<any> => {
    const res = await studentAPI.post('/admissions', data);
    return unwrap(res);
  },
  updateStage: async (uuid: string, stage: string): Promise<any> => {
    const res = await studentAPI.patch(`/admissions/${uuid}/stage`, null, { params: { stage } });
    return unwrap(res);
  },
  delete: async (uuid: string): Promise<void> => {
    await studentAPI.delete(`/admissions/${uuid}`);
  },
};

export const StudentApi = {
  getAll: async (search?: string): Promise<any[]> => {
    const res = await studentAPI.get('/students', { params: search ? { search } : {} });
    return unwrapList(res);
  },
  update: async (uuid: string, data: any): Promise<any> => {
    const res = await studentAPI.put(`/students/${uuid}`, data);
    return unwrap(res);
  },
  updateStatus: async (uuid: string, status: string): Promise<any> => {
    const res = await studentAPI.patch(`/students/${uuid}/status`, null, { params: { status } });
    return unwrap(res);
  },
  delete: async (uuid: string): Promise<void> => {
    await studentAPI.delete(`/students/${uuid}`);
  },
  getMyChildren: async (parentUserUuid: string): Promise<any[]> => {
    try { return unwrapList(await studentAPI.get('/students/my-children', { params: { parentUserUuid } })); } catch { return []; }
  },
  linkParent: async (uuid: string, parentUserUuid: string): Promise<any> => {
    const res = await studentAPI.patch(`/students/${uuid}/link-parent`, null, { params: { parentUserUuid } });
    return unwrap(res);
  },
};

const transportAPI = applyAuthInterceptor(axios.create({ baseURL: `${BASE}/transport`, headers: { 'Content-Type': 'application/json' } }));

export const TransportApi = {
  getRoutes: async (): Promise<any[]> => {
    const res = await transportAPI.get('/routes');
    return unwrapList(res);
  },
  createRoute: async (data: any): Promise<any> => {
    const res = await transportAPI.post('/routes', data);
    return unwrap(res);
  },
  updateRoute: async (uuid: string, data: any): Promise<any> => {
    const res = await transportAPI.put(`/routes/${uuid}`, data);
    return unwrap(res);
  },
  deleteRoute: async (uuid: string): Promise<void> => {
    await transportAPI.delete(`/routes/${uuid}`);
  },
  toggleRouteStatus: async (uuid: string): Promise<any> => {
    const res = await transportAPI.patch(`/routes/${uuid}/toggle-status`);
    return unwrap(res);
  },
  getEnrollments: async (): Promise<any[]> => {
    const res = await transportAPI.get('/enrollments');
    return unwrapList(res);
  },
  enrollStudent: async (data: { studentUuid: string; routeUuid: string; pickupPoint: string }): Promise<any> => {
    const res = await transportAPI.post('/enrollments', data);
    return unwrap(res);
  },
  unenrollStudent: async (uuid: string): Promise<void> => {
    await transportAPI.delete(`/enrollments/${uuid}`);
  },
};

export const SchoolApi = {
  getInfo: async (): Promise<any> => {
    try {
      const res = await schoolAPI.get('/info');
      return unwrap(res) ?? {};
    } catch { return {}; }
  },
  saveInfo: async (data: any): Promise<any> => {
    const res = await schoolAPI.put('/info', data);
    return unwrap(res);
  },
  // Grade Levels
  getGradeLevels: async (): Promise<any[]> => {
    try {
      const res = await schoolAPI.get('/grade-levels');
      return unwrapList(res);
    } catch { return []; }
  },
  createGradeLevel: async (data: any): Promise<any> => {
    const res = await schoolAPI.post('/grade-levels', data);
    return unwrap(res);
  },
  updateGradeLevel: async (uuid: string, data: any): Promise<any> => {
    const res = await schoolAPI.put(`/grade-levels/${uuid}`, data);
    return unwrap(res);
  },
  toggleGradeLevelStatus: async (uuid: string): Promise<void> => {
    await schoolAPI.patch(`/grade-levels/${uuid}/toggle-status`);
  },
  deleteGradeLevel: async (uuid: string): Promise<void> => {
    await schoolAPI.delete(`/grade-levels/${uuid}`);
  },
  // Departments
  getDepartments: async (): Promise<any[]> => {
    try {
      const res = await schoolAPI.get('/departments');
      return unwrapList(res);
    } catch { return []; }
  },
  createDepartment: async (data: any): Promise<any> => {
    const res = await schoolAPI.post('/departments', data);
    return unwrap(res);
  },
  updateDepartment: async (uuid: string, data: any): Promise<any> => {
    const res = await schoolAPI.put(`/departments/${uuid}`, data);
    return unwrap(res);
  },
  toggleDepartmentStatus: async (uuid: string): Promise<void> => {
    await schoolAPI.patch(`/departments/${uuid}/toggle-status`);
  },
  deleteDepartment: async (uuid: string): Promise<void> => {
    await schoolAPI.delete(`/departments/${uuid}`);
  },
  // Branches
  getBranches: async (): Promise<any[]> => {
    try {
      const res = await schoolAPI.get('/branches');
      return unwrapList(res);
    } catch { return []; }
  },
  createBranch: async (data: any): Promise<any> => {
    const res = await schoolAPI.post('/branches', data);
    return unwrap(res);
  },
  updateBranch: async (uuid: string, data: any): Promise<any> => {
    const res = await schoolAPI.put(`/branches/${uuid}`, data);
    return unwrap(res);
  },
  toggleBranchStatus: async (uuid: string): Promise<void> => {
    await schoolAPI.patch(`/branches/${uuid}/toggle-status`);
  },
  deleteBranch: async (uuid: string): Promise<void> => {
    await schoolAPI.delete(`/branches/${uuid}`);
  },
  // Bank accounts (school's own accounts; one may be flagged as the payroll debit account)
  getBankAccounts: async (): Promise<any[]> => {
    try { return unwrapList(await schoolAPI.get('/bank-accounts')); } catch { return []; }
  },
  createBankAccount: async (data: any): Promise<any> => unwrap(await schoolAPI.post('/bank-accounts', data)),
  updateBankAccount: async (uuid: string, data: any): Promise<any> => unwrap(await schoolAPI.put(`/bank-accounts/${uuid}`, data)),
  toggleBankAccount: async (uuid: string): Promise<void> => { await schoolAPI.patch(`/bank-accounts/${uuid}/toggle`); },
  setBankAccountUseForPayroll: async (uuid: string): Promise<any> => unwrap(await schoolAPI.patch(`/bank-accounts/${uuid}/use-for-payroll`)),
  deleteBankAccount: async (uuid: string): Promise<void> => { await schoolAPI.delete(`/bank-accounts/${uuid}`); },
};

export const LeaveApi = {
  getTypes: async (): Promise<any[]> => {
    try {
      const res = await leaveAPI.get('/leave-types');
      return unwrapList(res);
    } catch { return []; }
  },
  createType: async (data: any): Promise<any> => {
    const res = await leaveAPI.post('/leave-types', data);
    return unwrap(res);
  },
  updateType: async (id: number, data: any): Promise<any> => {
    const res = await leaveAPI.put(`/leave-types/${id}`, data);
    return unwrap(res);
  },
  toggleTypeStatus: async (id: number): Promise<void> => {
    await leaveAPI.patch(`/leave-types/${id}/toggle-status`);
  },
  deleteType: async (id: number): Promise<void> => {
    await leaveAPI.delete(`/leave-types/${id}`);
  },

  // Leave requests
  getRequests: async (staffId?: string): Promise<any[]> => {
    try {
      const res = await leaveAPI.get('/leave-requests', { params: staffId ? { staffId } : {} });
      return unwrapList(res);
    } catch { return []; }
  },
  createRequest: async (data: any): Promise<any> => {
    const res = await leaveAPI.post('/leave-requests', data);
    return unwrap(res);
  },
  reviewRequest: async (id: number, status: "APPROVED" | "REJECTED", note?: string): Promise<any> => {
    const res = await leaveAPI.patch(`/leave-requests/${id}/review`, null, { params: { status, note } });
    return unwrap(res);
  },
  deleteRequest: async (id: number): Promise<void> => {
    await leaveAPI.delete(`/leave-requests/${id}`);
  },
  getBalances: async (staffId: string, year?: number): Promise<any[]> => {
    try {
      const res = await leaveAPI.get('/leave-requests/balance', { params: year ? { staffId, year } : { staffId } });
      return unwrapList(res);
    } catch { return []; }
  },
};

export const HolidayApi = {
  getAll: async (): Promise<any[]> => {
    try {
      const res = await holidayAPI.get('');
      return unwrapList(res);
    } catch { return []; }
  },
  create: async (data: any): Promise<any> => {
    const res = await holidayAPI.post('', data);
    return unwrap(res);
  },
  update: async (id: number, data: any): Promise<any> => {
    const res = await holidayAPI.put(`/${id}`, data);
    return unwrap(res);
  },
  toggle: async (id: number): Promise<void> => {
    await holidayAPI.patch(`/${id}/toggle`);
  },
  delete: async (id: number): Promise<void> => {
    await holidayAPI.delete(`/${id}`);
  },
};

export const AcademicCalendarApi = {
  getTermPeriods: async (): Promise<any[]> => {
    try { return unwrapList(await academicCalendarAPI.get('/term-periods')); } catch { return []; }
  },
  getCurrentTerm: async (): Promise<{ academicYear: number | null; term: string | null }> => {
    try { return unwrap(await academicCalendarAPI.get('/current-term')); } catch { return { academicYear: null, term: null }; }
  },
  createTermPeriod: async (data: any): Promise<any> => {
    const res = await academicCalendarAPI.post('/term-periods', data);
    return unwrap(res);
  },
  updateTermPeriod: async (id: number, data: any): Promise<any> => {
    const res = await academicCalendarAPI.put(`/term-periods/${id}`, data);
    return unwrap(res);
  },
  deleteTermPeriod: async (id: number): Promise<void> => {
    await academicCalendarAPI.delete(`/term-periods/${id}`);
  },
  getEvents: async (): Promise<any[]> => {
    try { return unwrapList(await academicCalendarAPI.get('/events')); } catch { return []; }
  },
  createEvent: async (data: any): Promise<any> => {
    const res = await academicCalendarAPI.post('/events', data);
    return unwrap(res);
  },
  updateEvent: async (id: number, data: any): Promise<any> => {
    const res = await academicCalendarAPI.put(`/events/${id}`, data);
    return unwrap(res);
  },
  toggleEvent: async (id: number): Promise<void> => {
    await academicCalendarAPI.patch(`/events/${id}/toggle`);
  },
  deleteEvent: async (id: number): Promise<void> => {
    await academicCalendarAPI.delete(`/events/${id}`);
  },
};

export const FeeApi = {
  // Fee items
  getItems: async (): Promise<any[]> => {
    try {
      const res = await feesAPI.get('/items');
      return unwrapList(res);
    } catch { return []; }
  },
  createItem: async (data: any): Promise<any> => {
    const res = await feesAPI.post('/items', data);
    return unwrap(res);
  },
  updateItem: async (id: number, data: any): Promise<any> => {
    const res = await feesAPI.put(`/items/${id}`, data);
    return unwrap(res);
  },
  toggleItem: async (id: number): Promise<void> => {
    await feesAPI.patch(`/items/${id}/toggle`);
  },
  deleteItem: async (id: number): Promise<void> => {
    await feesAPI.delete(`/items/${id}`);
  },

  // Student fee charges (persisted, itemized — the "what should this student currently pay" source of truth)
  getCurrentCharges: async (params?: { admissionNumber?: string; grade?: string }): Promise<any[]> => {
    try {
      const res = await feesAPI.get('/charges', { params });
      return unwrapList(res);
    } catch { return []; }
  },

  // Fee payments
  getPayments: async (studentId?: string): Promise<any[]> => {
    try {
      const res = await feesAPI.get('/payments', { params: studentId ? { studentId } : {} });
      return unwrapList(res);
    } catch { return []; }
  },
  getBalance: async (studentId: string): Promise<number> => {
    try { return unwrap(await feesAPI.get(`/payments/balance/${studentId}`)) ?? 0; } catch { return 0; }
  },
  recordPayment: async (data: any): Promise<any> => {
    const res = await feesAPI.post('/payments', data);
    return unwrap(res);
  },
  deletePayment: async (id: number): Promise<void> => {
    await feesAPI.delete(`/payments/${id}`);
  },

  // Manual payment verification (maker-checker for cheque / bank-slip entries)
  getPendingVerification: async (): Promise<any[]> => {
    try {
      const res = await feesAPI.get('/payments/pending-verification');
      return unwrapList(res);
    } catch { return []; }
  },
  verifyPayment: async (id: number, verifier: string): Promise<any> => {
    const res = await feesAPI.patch(`/payments/${id}/verify`, { approver: verifier });
    return unwrap(res);
  },
  rejectPayment: async (id: number, verifier: string, reason: string): Promise<any> => {
    const res = await feesAPI.patch(`/payments/${id}/reject`, { approver: verifier, reason });
    return unwrap(res);
  },

  // Fee structures (Maker / Approver / Approved workflow)
  getStructures: async (): Promise<any[]> => {
    try {
      const res = await feesAPI.get('/structures');
      return unwrapList(res);
    } catch { return []; }
  },
  getStructureAudit: async (): Promise<any[]> => {
    try {
      const res = await feesAPI.get('/structures/audit');
      return unwrapList(res);
    } catch { return []; }
  },
  saveDraft: async (data: any): Promise<any> => {
    const res = await feesAPI.post('/structures/draft', data);
    return unwrap(res);
  },
  submitStructure: async (data: any): Promise<any> => {
    const res = await feesAPI.post('/structures/submit', data);
    return unwrap(res);
  },
  approveStructure: async (uuid: string, note: string): Promise<any> => {
    const res = await feesAPI.patch(`/structures/${uuid}/approve`, { reason: note });
    return unwrap(res);
  },
  rejectStructure: async (uuid: string, reason: string): Promise<any> => {
    const res = await feesAPI.patch(`/structures/${uuid}/reject`, { reason });
    return unwrap(res);
  },
  getCollectionSummary: async (academicYear: number, term: string): Promise<any[]> => {
    try { return unwrapList(await feesAPI.get('/reports/collection-summary', { params: { academicYear, term } })); } catch { return []; }
  },
  getArrears: async (params: { academicYear?: number; term: string; grade?: string; stream?: string }): Promise<any[]> => {
    try { return unwrapList(await feesAPI.get('/reports/arrears', { params })); } catch { return []; }
  },
  getCollectionTrend: async (months = 6): Promise<any[]> => {
    try { return unwrapList(await feesAPI.get('/reports/collection-trend', { params: { months } })); } catch { return []; }
  },
};

export const SubjectApi = {
  getAll: async (): Promise<any[]> => {
    try {
      const res = await subjectAPI.get('');
      return unwrapList(res);
    } catch { return []; }
  },
  create: async (data: any): Promise<any> => {
    const res = await subjectAPI.post('', data);
    return unwrap(res);
  },
  update: async (id: number, data: any): Promise<any> => {
    const res = await subjectAPI.put(`/${id}`, data);
    return unwrap(res);
  },
  toggle: async (id: number): Promise<void> => {
    await subjectAPI.patch(`/${id}/toggle`);
  },
  delete: async (id: number): Promise<void> => {
    await subjectAPI.delete(`/${id}`);
  },
};

export const StaffRoleApi = {
  getAll: async (): Promise<any[]> => {
    try {
      const res = await staffRoleAPI.get('');
      return unwrapList(res);
    } catch { return []; }
  },
  create: async (data: any): Promise<any> => {
    const res = await staffRoleAPI.post('', data);
    return unwrap(res);
  },
  update: async (id: number, data: any): Promise<any> => {
    const res = await staffRoleAPI.put(`/${id}`, data);
    return unwrap(res);
  },
  toggle: async (id: number): Promise<void> => {
    await staffRoleAPI.patch(`/${id}/toggle`);
  },
  delete: async (id: number): Promise<void> => {
    await staffRoleAPI.delete(`/${id}`);
  },
};

export const SupplierApi = {
  getAll: async (search?: string): Promise<any[]> => {
    try {
      const res = await supplierAPI.get('', { params: search ? { search } : undefined });
      return unwrapList(res);
    } catch { return []; }
  },
  getById: async (id: number): Promise<any> => {
    const res = await supplierAPI.get(`/${id}`);
    return unwrap(res);
  },
  create: async (data: any): Promise<any> => {
    const res = await supplierAPI.post('', data);
    return unwrap(res);
  },
  update: async (id: number, data: any): Promise<any> => {
    const res = await supplierAPI.put(`/${id}`, data);
    return unwrap(res);
  },
  toggleStatus: async (id: number): Promise<void> => {
    await supplierAPI.patch(`/${id}/toggle-status`);
  },
  delete: async (id: number): Promise<void> => {
    await supplierAPI.delete(`/${id}`);
  },
};

export const BillApi = {
  getAll: async (search?: string): Promise<any[]> => {
    try {
      const res = await billsAPI.get('', { params: search ? { search } : undefined });
      return unwrapList(res);
    } catch { return []; }
  },
  getById: async (id: number): Promise<any> => {
    const res = await billsAPI.get(`/${id}`);
    return unwrap(res);
  },
  create: async (data: any): Promise<any> => {
    const res = await billsAPI.post('', data);
    return unwrap(res);
  },
  update: async (id: number, data: any): Promise<any> => {
    const res = await billsAPI.put(`/${id}`, data);
    return unwrap(res);
  },
  markPaid: async (id: number): Promise<any> => {
    const res = await billsAPI.patch(`/${id}/mark-paid`);
    return unwrap(res);
  },
  delete: async (id: number): Promise<void> => {
    await billsAPI.delete(`/${id}`);
  },
};

export const PaymentApi = {
  // M-Pesa STK push — triggers a prompt on the payer's phone; admissionNumber is sent as the AccountReference
  initiateStkPush: async (data: { admissionNumber: string; phone?: string; amount: number }): Promise<any> => {
    const res = await paymentsAPI.post('/mpesa/stk-push', data);
    return unwrap(res);
  },
  getTransactions: async (status?: string): Promise<any[]> => {
    try {
      const res = await paymentsAPI.get('/transactions', { params: status ? { status } : undefined });
      return unwrapList(res);
    } catch { return []; }
  },
  getUnmatchedTransactions: async (): Promise<any[]> => {
    try { return unwrapList(await paymentsAPI.get('/transactions/unmatched')); } catch { return []; }
  },
  reconcileTransaction: async (id: number, admissionNumber: string): Promise<any> => {
    const res = await paymentsAPI.patch(`/transactions/${id}/reconcile`, { admissionNumber });
    return unwrap(res);
  },
};

export const BiometricsApi = {
  staff: {
    enroll: async (staffUuid: string, data: any): Promise<any> => unwrap(await bioStaffAPI.post(`/${staffUuid}/enroll`, data)),
    getBioData: async (staffUuid: string): Promise<any> => {
      try { return unwrap(await bioStaffAPI.get(`/${staffUuid}`)); } catch { return null; }
    },
    updateStatus: async (bioUuid: string, status: string): Promise<any> =>
      unwrap(await bioStaffAPI.patch(`/${bioUuid}/status`, null, { params: { status } })),
    getAttendance: async (staffUuid: string, from: string, to: string): Promise<any[]> => {
      try { return unwrapList(await bioStaffAPI.get(`/${staffUuid}/attendance`, { params: { from, to } })); } catch { return []; }
    },
    getDaily: async (date?: string): Promise<any[]> => {
      try { return unwrapList(await bioStaffAPI.get('/attendance/daily', { params: date ? { date } : undefined })); } catch { return []; }
    },
  },
  student: {
    enroll: async (studentUuid: string, data: any): Promise<any> => unwrap(await bioStudentAPI.post(`/${studentUuid}/enroll`, data)),
    getBioData: async (studentUuid: string): Promise<any> => {
      try { return unwrap(await bioStudentAPI.get(`/${studentUuid}`)); } catch { return null; }
    },
    updateStatus: async (bioUuid: string, status: string): Promise<any> =>
      unwrap(await bioStudentAPI.patch(`/${bioUuid}/status`, null, { params: { status } })),
    getAttendance: async (studentUuid: string, from: string, to: string): Promise<any[]> => {
      try { return unwrapList(await bioStudentAPI.get(`/${studentUuid}/attendance`, { params: { from, to } })); } catch { return []; }
    },
    getDaily: async (date?: string): Promise<any[]> => {
      try { return unwrapList(await bioStudentAPI.get('/attendance/daily', { params: date ? { date } : undefined })); } catch { return []; }
    },
  },
  /** Identifies a scanned fingerprint image against every enrolled student/staff and records
   *  the resulting attendance event — server-side 1:N match, no identity claim from the caller. */
  identify: async (params: { image: string; ownerType?: 'STUDENT' | 'STAFF'; deviceId: string; remarks?: string }): Promise<any> =>
    unwrap(await bioCaptureAPI.post('/capture', params)),
};

export const DeviceApi = {
  getAll: async (): Promise<any[]> => {
    try { return unwrapList(await deviceAPI.get('')); } catch { return []; }
  },
  register: async (data: any): Promise<any> => unwrap(await deviceAPI.post('', data)),
  regenerateKey: async (uuid: string): Promise<any> => unwrap(await deviceAPI.post(`/${uuid}/regenerate-key`)),
  updateStatus: async (uuid: string, status: string): Promise<any> =>
    unwrap(await deviceAPI.patch(`/${uuid}/status`, null, { params: { status } })),
  delete: async (uuid: string): Promise<void> => { await deviceAPI.delete(`/${uuid}`); },
};

export const ClassTeacherApi = {
  getAll: async (): Promise<any[]> => {
    try { return unwrapList(await classTeacherAPI.get('')); } catch { return []; }
  },
  assign: async (data: { teacherUuid: string; gradeLevelUuid: string; stream: string }): Promise<any> =>
    unwrap(await classTeacherAPI.post('', data)),
  unassign: async (uuid: string): Promise<void> => { await classTeacherAPI.delete(`/${uuid}`); },
  getMine: async (teacherUuid: string): Promise<any> => {
    try { return unwrap(await classTeacherAPI.get('/mine', { params: { teacherUuid } })); } catch { return null; }
  },
  getMyRoster: async (teacherUuid: string): Promise<any[]> => {
    try { return unwrapList(await classTeacherAPI.get('/mine/roster', { params: { teacherUuid } })); } catch { return []; }
  },
};

export const AttendanceReportApi = {
  searchStudents: async (params: { from: string; to: string; grade?: string; stream?: string; admissionNumber?: string }): Promise<any[]> => {
    try { return unwrapList(await attendanceReportAPI.get('/students', { params })); } catch { return []; }
  },
  searchStaff: async (params: { from: string; to: string; staffId?: string }): Promise<any[]> => {
    try { return unwrapList(await attendanceReportAPI.get('/staff', { params })); } catch { return []; }
  },
  getMyClass: async (params: { teacherUuid: string; from: string; to: string }): Promise<any[]> => {
    try { return unwrapList(await attendanceReportAPI.get('/my-class', { params })); } catch { return []; }
  },
  getMyChildren: async (params: { parentUserUuid: string; from: string; to: string }): Promise<any[]> => {
    try { return unwrapList(await attendanceReportAPI.get('/my-children', { params })); } catch { return []; }
  },
  getSummary: async (params: { from: string; to: string; grade?: string; stream?: string }): Promise<any[]> => {
    try { return unwrapList(await attendanceReportAPI.get('/summary', { params })); } catch { return []; }
  },
};

export const TimetableApi = {
  // Shared school-wide period grid
  getPeriods: async (): Promise<any[]> => {
    try { return unwrapList(await timetablePeriodAPI.get('')); } catch { return []; }
  },
  createPeriod: async (data: any): Promise<any> => unwrap(await timetablePeriodAPI.post('', data)),
  updatePeriod: async (uuid: string, data: any): Promise<any> => unwrap(await timetablePeriodAPI.put(`/${uuid}`, data)),
  deletePeriod: async (uuid: string): Promise<void> => { await timetablePeriodAPI.delete(`/${uuid}`); },

  // Entries
  getGrid: async (gradeLevelUuid: string, stream: string): Promise<any[]> => {
    try { return unwrapList(await timetableEntryAPI.get('/grid', { params: { gradeLevelUuid, stream } })); } catch { return []; }
  },
  getMine: async (teacherUuid: string): Promise<any[]> => {
    try { return unwrapList(await timetableEntryAPI.get('/mine', { params: { teacherUuid } })); } catch { return []; }
  },
  getAvailableTeachers: async (subjectUuid: string, dayOfWeek: string, periodUuid: string, excludeEntryUuid?: string): Promise<any[]> => {
    try { return unwrapList(await timetableEntryAPI.get('/available-teachers', { params: { subjectUuid, dayOfWeek, periodUuid, excludeEntryUuid } })); } catch { return []; }
  },
  assign: async (data: any): Promise<any> => unwrap(await timetableEntryAPI.post('', data)),
  unassign: async (uuid: string): Promise<void> => { await timetableEntryAPI.delete(`/${uuid}`); },
};

export const AssessmentApi = {
  getMyClasses: async (teacherUuid: string): Promise<any[]> => {
    try { return unwrapList(await assessmentAPI.get('/my-classes', { params: { teacherUuid } })); } catch { return []; }
  },
  getRoster: async (gradeLevelUuid: string, stream: string): Promise<any[]> => {
    try { return unwrapList(await assessmentAPI.get('/roster', { params: { gradeLevelUuid, stream } })); } catch { return []; }
  },
  getMine: async (teacherUuid: string, gradeLevelUuid: string, stream: string, subjectUuid: string): Promise<any[]> => {
    try { return unwrapList(await assessmentAPI.get('', { params: { teacherUuid, gradeLevelUuid, stream, subjectUuid } })); } catch { return []; }
  },
  create: async (data: any): Promise<any> => unwrap(await assessmentAPI.post('', data)),
  getMarks: async (assessmentUuid: string): Promise<any[]> => {
    try { return unwrapList(await assessmentAPI.get(`/${assessmentUuid}/marks`)); } catch { return []; }
  },
  saveMarks: async (assessmentUuid: string, entries: { studentUuid: string; score: number | null }[]): Promise<void> => {
    await assessmentAPI.put(`/${assessmentUuid}/marks`, { entries });
  },
  delete: async (assessmentUuid: string): Promise<void> => { await assessmentAPI.delete(`/${assessmentUuid}`); },
};

export const TermReportApi = {
  getAll: async (params: { gradeLevelUuid?: string; stream?: string; term: string; year: number; search?: string }): Promise<any[]> => {
    try { return unwrapList(await termReportAPI.get('', { params })); } catch { return []; }
  },
  getMyClass: async (params: { teacherUuid: string; term: string; year: number }): Promise<any[]> => {
    try { return unwrapList(await termReportAPI.get('/my-class', { params })); } catch { return []; }
  },
  getMyChildren: async (params: { parentUserUuid: string; term: string; year: number }): Promise<any[]> => {
    try { return unwrapList(await termReportAPI.get('/my-children', { params })); } catch { return []; }
  },
  getDetail: async (studentUuid: string, term: string, year: number): Promise<any> =>
    unwrap(await termReportAPI.get(`/${studentUuid}/detail`, { params: { term, year } })),
  publish: async (data: { gradeLevelUuid: string; stream: string; term: string; year: number }): Promise<void> => {
    await termReportAPI.post('/publish', data);
  },
};

export const PayrollApi = {
  // PAYE bands
  getPayeBands: async (): Promise<any[]> => {
    try { return unwrapList(await payrollAPI.get('/paye-bands')); } catch { return []; }
  },
  createPayeBand: async (data: any): Promise<any> => unwrap(await payrollAPI.post('/paye-bands', data)),
  updatePayeBand: async (id: number, data: any): Promise<any> => unwrap(await payrollAPI.put(`/paye-bands/${id}`, data)),
  deletePayeBand: async (id: number): Promise<void> => { await payrollAPI.delete(`/paye-bands/${id}`); },

  // Statutory deductions (NSSF, Housing Levy, SHIF, custom)
  getStatutoryDeductions: async (): Promise<any[]> => {
    try { return unwrapList(await payrollAPI.get('/statutory-deductions')); } catch { return []; }
  },
  createStatutoryDeduction: async (data: any): Promise<any> => unwrap(await payrollAPI.post('/statutory-deductions', data)),
  updateStatutoryDeduction: async (id: number, data: any): Promise<any> => unwrap(await payrollAPI.put(`/statutory-deductions/${id}`, data)),
  toggleStatutoryDeduction: async (id: number): Promise<void> => { await payrollAPI.patch(`/statutory-deductions/${id}/toggle`); },
  deleteStatutoryDeduction: async (id: number): Promise<void> => { await payrollAPI.delete(`/statutory-deductions/${id}`); },

  // Allowance types
  getAllowanceTypes: async (): Promise<any[]> => {
    try { return unwrapList(await payrollAPI.get('/allowance-types')); } catch { return []; }
  },
  createAllowanceType: async (data: any): Promise<any> => unwrap(await payrollAPI.post('/allowance-types', data)),
  updateAllowanceType: async (id: number, data: any): Promise<any> => unwrap(await payrollAPI.put(`/allowance-types/${id}`, data)),
  toggleAllowanceType: async (id: number): Promise<void> => { await payrollAPI.patch(`/allowance-types/${id}/toggle`); },
  deleteAllowanceType: async (id: number): Promise<void> => { await payrollAPI.delete(`/allowance-types/${id}`); },

  // Other deductions
  getOtherDeductions: async (): Promise<any[]> => {
    try { return unwrapList(await payrollAPI.get('/other-deductions')); } catch { return []; }
  },
  createOtherDeduction: async (data: any): Promise<any> => unwrap(await payrollAPI.post('/other-deductions', data)),
  updateOtherDeduction: async (id: number, data: any): Promise<any> => unwrap(await payrollAPI.put(`/other-deductions/${id}`, data)),
  toggleOtherDeduction: async (id: number): Promise<void> => { await payrollAPI.patch(`/other-deductions/${id}/toggle`); },
  deleteOtherDeduction: async (id: number): Promise<void> => { await payrollAPI.delete(`/other-deductions/${id}`); },

  // Settings
  getSettings: async (): Promise<any> => {
    try { return unwrap(await payrollAPI.get('/settings')); } catch { return null; }
  },
  saveSettings: async (data: any): Promise<any> => unwrap(await payrollAPI.put('/settings', data)),

  // Staff salaries
  getAllStaffSalaries: async (): Promise<any[]> => {
    try { return unwrapList(await payrollAPI.get('/staff-salaries')); } catch { return []; }
  },
  saveStaffSalary: async (data: any): Promise<any> => unwrap(await payrollAPI.post('/staff-salaries', data)),
  deleteStaffSalary: async (staffId: string): Promise<void> => { await payrollAPI.delete(`/staff-salaries/${staffId}`); },

  // Banks
  getBanks: async (): Promise<any[]> => {
    try { return unwrapList(await payrollAPI.get('/banks')); } catch { return []; }
  },
  createBank: async (data: any): Promise<any> => unwrap(await payrollAPI.post('/banks', data)),
  updateBank: async (id: number, data: any): Promise<any> => unwrap(await payrollAPI.put(`/banks/${id}`, data)),
  toggleBank: async (id: number): Promise<void> => { await payrollAPI.patch(`/banks/${id}/toggle`); },
  deleteBank: async (id: number): Promise<void> => { await payrollAPI.delete(`/banks/${id}`); },

  // Mobile money providers
  getMobileMoneyProviders: async (): Promise<any[]> => {
    try { return unwrapList(await payrollAPI.get('/mobile-money-providers')); } catch { return []; }
  },
  createMobileMoneyProvider: async (data: any): Promise<any> => unwrap(await payrollAPI.post('/mobile-money-providers', data)),
  updateMobileMoneyProvider: async (id: number, data: any): Promise<any> => unwrap(await payrollAPI.put(`/mobile-money-providers/${id}`, data)),
  toggleMobileMoneyProvider: async (id: number): Promise<void> => { await payrollAPI.patch(`/mobile-money-providers/${id}/toggle`); },
  deleteMobileMoneyProvider: async (id: number): Promise<void> => { await payrollAPI.delete(`/mobile-money-providers/${id}`); },

  // Payment types (settlement rail for the bank-submission export, e.g. PESALINK/RTGS/MPESA)
  getPaymentTypes: async (): Promise<any[]> => {
    try { return unwrapList(await payrollAPI.get('/payment-types')); } catch { return []; }
  },
  createPaymentType: async (data: any): Promise<any> => unwrap(await payrollAPI.post('/payment-types', data)),
  updatePaymentType: async (id: number, data: any): Promise<any> => unwrap(await payrollAPI.put(`/payment-types/${id}`, data)),
  togglePaymentType: async (id: number): Promise<void> => { await payrollAPI.patch(`/payment-types/${id}/toggle`); },
  deletePaymentType: async (id: number): Promise<void> => { await payrollAPI.delete(`/payment-types/${id}`); },

  // Staff payment details (Finance-only bank/mobile-money info)
  getAllStaffPaymentDetails: async (): Promise<any[]> => {
    try { return unwrapList(await payrollAPI.get('/staff-payment-details')); } catch { return []; }
  },
  getStaffPaymentDetails: async (staffId: string): Promise<any> => {
    try { return unwrap(await payrollAPI.get(`/staff-payment-details/${staffId}`)); } catch { return null; }
  },
  saveStaffPaymentDetails: async (data: any): Promise<any> => unwrap(await payrollAPI.put('/staff-payment-details', data)),

  // Self-service: the logged-in staff member's own payslip history (any staff, not just teachers)
  getMyPayslips: async (): Promise<any[]> => {
    try { return unwrapList(await payrollAPI.get('/my-payslips')); } catch { return []; }
  },

  // Payroll makers (who can generate/submit payroll)
  getMakers: async (): Promise<any[]> => {
    try { return unwrapList(await payrollAPI.get('/makers')); } catch { return []; }
  },
  addMaker: async (userUuid: string): Promise<any> => unwrap(await payrollAPI.post('/makers', { userUuid })),
  removeMaker: async (uuid: string): Promise<void> => { await payrollAPI.delete(`/makers/${uuid}`); },

  // Approval workflow setup
  getWorkflowSteps: async (): Promise<any[]> => {
    try { return unwrapList(await payrollAPI.get('/workflow-steps')); } catch { return []; }
  },
  createWorkflowStep: async (data: any): Promise<any> => unwrap(await payrollAPI.post('/workflow-steps', data)),
  updateWorkflowStep: async (uuid: string, data: any): Promise<any> => unwrap(await payrollAPI.put(`/workflow-steps/${uuid}`, data)),
  deleteWorkflowStep: async (uuid: string): Promise<void> => { await payrollAPI.delete(`/workflow-steps/${uuid}`); },
  reorderWorkflowSteps: async (stepUuids: string[]): Promise<any[]> =>
    unwrapList(await payrollAPI.patch('/workflow-steps/reorder', { stepUuids })),

  // Payroll runs (maker → approval workflow → sent to bank)
  getRuns: async (): Promise<any[]> => {
    try { return unwrapList(await payrollAPI.get('/runs')); } catch { return []; }
  },
  getRun: async (id: number): Promise<any> => unwrap(await payrollAPI.get(`/runs/${id}`)),
  getRunApprovals: async (id: number): Promise<any[]> => {
    try { return unwrapList(await payrollAPI.get(`/runs/${id}/approvals`)); } catch { return []; }
  },
  processRun: async (year: number, monthIndex: number, monthLabel: string): Promise<any> =>
    unwrap(await payrollAPI.post('/runs/process', null, { params: { year, monthIndex, monthLabel } })),
  submitRun: async (id: number): Promise<any> => unwrap(await payrollAPI.post(`/runs/${id}/submit`)),
  decideRun: async (id: number, decision: "APPROVE" | "REJECT", comment?: string): Promise<any> =>
    unwrap(await payrollAPI.post(`/runs/${id}/decision`, { decision, comment })),
  sendRunToBank: async (id: number): Promise<any> => unwrap(await payrollAPI.post(`/runs/${id}/send-to-bank`)),
};

export const CommunicationApi = {
  getMessages: async (): Promise<any[]> => {
    try { return unwrapList(await commAPI.get('/messages')); } catch { return []; }
  },
  sendMessage: async (data: any): Promise<any> => unwrap(await commAPI.post('/messages', data)),
  getInbox: async (): Promise<any[]> => {
    try { return unwrapList(await commAPI.get('/inbox')); } catch { return []; }
  },
  getUnreadCount: async (): Promise<number> => {
    try { return unwrap(await commAPI.get('/inbox/unread-count')) ?? 0; } catch { return 0; }
  },
  markRead: async (uuid: string): Promise<void> => {
    await commAPI.patch(`/inbox/${uuid}/read`);
  },
};
