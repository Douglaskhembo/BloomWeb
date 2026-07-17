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
