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

const BASE = (import.meta as any).env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

const userAPI    = applyAuthInterceptor(axios.create({ baseURL: `${BASE}/users`,      headers: { 'Content-Type': 'application/json' } }));
const roleAPI    = applyAuthInterceptor(axios.create({ baseURL: `${BASE}/role`,       headers: { 'Content-Type': 'application/json' } }));
const moduleAPI  = applyAuthInterceptor(axios.create({ baseURL: `${BASE}/module`,     headers: { 'Content-Type': 'application/json' } }));
const permAPI    = applyAuthInterceptor(axios.create({ baseURL: `${BASE}/permission`, headers: { 'Content-Type': 'application/json' } }));
const _authAPI   = applyAuthInterceptor(axios.create({ baseURL: `${BASE}/auth`,       headers: { 'Content-Type': 'application/json' } }));
const staffAPI   = applyAuthInterceptor(axios.create({ baseURL: `${BASE}/staff`,      headers: { 'Content-Type': 'application/json' } }));
const studentAPI = applyAuthInterceptor(axios.create({ baseURL: `${BASE}`,            headers: { 'Content-Type': 'application/json' } }));
const schoolAPI  = applyAuthInterceptor(axios.create({ baseURL: `${BASE}/school`,     headers: { 'Content-Type': 'application/json' } }));

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
    return res.data?.body ?? res.data ?? [];
  },
  getByUuid: async (uuid: string): Promise<any> => {
    const res = await userAPI.get(`/${uuid}`);
    return res.data?.body ?? res.data;
  },
  create: async (data: any): Promise<any> => {
    const res = await userAPI.post('', data);
    return res.data?.body ?? res.data;
  },
  update: async (uuid: string, data: any): Promise<any> => {
    const res = await userAPI.put(`/${uuid}`, data);
    return res.data?.body ?? res.data;
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
    return res.data?.body ?? res.data ?? [];
  },
  assignRoles: async (data: { userUuid: string; roleUuids: string[] }): Promise<void> => {
    await userAPI.post('/assign-roles', data);
  },
  unassignRoles: async (data: { userUuid: string; roleUuids: string[] }): Promise<void> => {
    await userAPI.post('/unassign-roles', data);
  },
  getEffectivePermissions: async (uuid: string): Promise<any[]> => {
    const res = await userAPI.get(`/${uuid}/effective-permissions`);
    return res.data?.body ?? res.data ?? [];
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
    return res.data?.body ?? res.data ?? [];
  },
  getByUuid: async (uuid: string): Promise<any> => {
    const res = await roleAPI.get(`/uuid/${uuid}`);
    return res.data?.body ?? res.data;
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
    return res.data?.body ?? res.data ?? [];
  },
};

export const PermissionApi = {
  getAll: async (): Promise<any[]> => {
    const res = await permAPI.get('/all');
    return res.data?.body ?? res.data ?? [];
  },
  getByModule: async (roleUuid: string, moduleUuid: string): Promise<any[]> => {
    const res = await permAPI.get('/by-module', { params: { roleUuid, moduleUuid } });
    return res.data?.body ?? res.data ?? [];
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
    return res.data?.body ?? res.data ?? [];
  },
  create: async (data: any): Promise<any> => {
    const res = await staffAPI.post('', data);
    return res.data?.body ?? res.data;
  },
  update: async (uuid: string, data: any): Promise<any> => {
    const res = await staffAPI.put(`/${uuid}`, data);
    return res.data?.body ?? res.data;
  },
  updateStatus: async (uuid: string, status: string): Promise<any> => {
    const res = await staffAPI.patch(`/${uuid}/status`, null, { params: { status } });
    return res.data?.body ?? res.data;
  },
  delete: async (uuid: string): Promise<void> => {
    await staffAPI.delete(`/${uuid}`);
  },
};

export const AdmissionApi = {
  getAll: async (): Promise<any[]> => {
    const res = await studentAPI.get('/admissions');
    return res.data?.body ?? res.data ?? [];
  },
  create: async (data: any): Promise<any> => {
    const res = await studentAPI.post('/admissions', data);
    return res.data?.body ?? res.data;
  },
  updateStage: async (uuid: string, stage: string): Promise<any> => {
    const res = await studentAPI.patch(`/admissions/${uuid}/stage`, null, { params: { stage } });
    return res.data?.body ?? res.data;
  },
  delete: async (uuid: string): Promise<void> => {
    await studentAPI.delete(`/admissions/${uuid}`);
  },
};

export const StudentApi = {
  getAll: async (search?: string): Promise<any[]> => {
    const res = await studentAPI.get('/students', { params: search ? { search } : {} });
    return res.data?.body ?? res.data ?? [];
  },
  update: async (uuid: string, data: any): Promise<any> => {
    const res = await studentAPI.put(`/students/${uuid}`, data);
    return res.data?.body ?? res.data;
  },
  updateStatus: async (uuid: string, status: string): Promise<any> => {
    const res = await studentAPI.patch(`/students/${uuid}/status`, null, { params: { status } });
    return res.data?.body ?? res.data;
  },
  delete: async (uuid: string): Promise<void> => {
    await studentAPI.delete(`/students/${uuid}`);
  },
};

const transportAPI = applyAuthInterceptor(axios.create({ baseURL: `${BASE}/transport`, headers: { 'Content-Type': 'application/json' } }));

export const TransportApi = {
  getRoutes: async (): Promise<any[]> => {
    const res = await transportAPI.get('/routes');
    return res.data?.body ?? res.data ?? [];
  },
  createRoute: async (data: any): Promise<any> => {
    const res = await transportAPI.post('/routes', data);
    return res.data?.body ?? res.data;
  },
  updateRoute: async (uuid: string, data: any): Promise<any> => {
    const res = await transportAPI.put(`/routes/${uuid}`, data);
    return res.data?.body ?? res.data;
  },
  deleteRoute: async (uuid: string): Promise<void> => {
    await transportAPI.delete(`/routes/${uuid}`);
  },
  toggleRouteStatus: async (uuid: string): Promise<any> => {
    const res = await transportAPI.patch(`/routes/${uuid}/toggle-status`);
    return res.data?.body ?? res.data;
  },
  getEnrollments: async (): Promise<any[]> => {
    const res = await transportAPI.get('/enrollments');
    return res.data?.body ?? res.data ?? [];
  },
  enrollStudent: async (data: { studentUuid: string; routeUuid: string; pickupPoint: string }): Promise<any> => {
    const res = await transportAPI.post('/enrollments', data);
    return res.data?.body ?? res.data;
  },
  unenrollStudent: async (uuid: string): Promise<void> => {
    await transportAPI.delete(`/enrollments/${uuid}`);
  },
};

export const SchoolApi = {
  getInfo: async (): Promise<any> => {
    try {
      const res = await schoolAPI.get('/info');
      return res.data?.body ?? res.data ?? {};
    } catch { return {}; }
  },
  saveInfo: async (data: any): Promise<any> => {
    const res = await schoolAPI.put('/info', data);
    return res.data?.body ?? res.data;
  },
  // Grade Levels
  getGradeLevels: async (): Promise<any[]> => {
    try {
      const res = await schoolAPI.get('/grade-levels');
      const d = res.data?.body ?? res.data;
      return Array.isArray(d) ? d : [];
    } catch { return []; }
  },
  createGradeLevel: async (data: any): Promise<any> => {
    const res = await schoolAPI.post('/grade-levels', data);
    return res.data?.body ?? res.data;
  },
  updateGradeLevel: async (uuid: string, data: any): Promise<any> => {
    const res = await schoolAPI.put(`/grade-levels/${uuid}`, data);
    return res.data?.body ?? res.data;
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
      const d = res.data?.body ?? res.data;
      return Array.isArray(d) ? d : [];
    } catch { return []; }
  },
  createDepartment: async (data: any): Promise<any> => {
    const res = await schoolAPI.post('/departments', data);
    return res.data?.body ?? res.data;
  },
  updateDepartment: async (uuid: string, data: any): Promise<any> => {
    const res = await schoolAPI.put(`/departments/${uuid}`, data);
    return res.data?.body ?? res.data;
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
      const d = res.data?.body ?? res.data;
      return Array.isArray(d) ? d : [];
    } catch { return []; }
  },
  createBranch: async (data: any): Promise<any> => {
    const res = await schoolAPI.post('/branches', data);
    return res.data?.body ?? res.data;
  },
  updateBranch: async (uuid: string, data: any): Promise<any> => {
    const res = await schoolAPI.put(`/branches/${uuid}`, data);
    return res.data?.body ?? res.data;
  },
  toggleBranchStatus: async (uuid: string): Promise<void> => {
    await schoolAPI.patch(`/branches/${uuid}/toggle-status`);
  },
  deleteBranch: async (uuid: string): Promise<void> => {
    await schoolAPI.delete(`/branches/${uuid}`);
  },
};
