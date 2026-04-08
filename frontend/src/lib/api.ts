import axios from "axios";

const RAILWAY_URL = "https://myfundedtournament-production.up.railway.app";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || RAILWAY_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("fc_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("fc_token");
      localStorage.removeItem("fc_user");
    }
    return Promise.reject(err);
  }
);

export const tournamentApi = {
  getAll: (filter?: string) => api.get("/api/tournaments", { params: { filter } }).then(r => r.data.data),
  getById: (id: string) => api.get(`/api/tournaments/${id}`).then(r => r.data.data),
};

export const entryApi = {
  create: (data: any) => api.post("/api/entries", data).then(r => r.data.data),
  getMy: (tournamentId: string) => api.get(`/api/entries/my/${tournamentId}`).then(r => r.data.data),
  getById: (id: string) => api.get(`/api/entries/${id}`).then(r => r.data.data),
};

export const paymentApi = {
  getStatus: (entryId: string) => api.get(`/api/payments/status/${entryId}`).then(r => r.data.data),
};

export const leaderboardApi = {
  get: (tournamentId: string, limit = 100) =>
    api.get(`/api/leaderboard/${tournamentId}`, { params: { limit } }).then(r => r.data.data),
  getMe: (tournamentId: string) =>
    api.get(`/api/leaderboard/${tournamentId}/me`).then(r => r.data.data),
};

export const userApi = {
  register: (data: any) => api.post("/api/users/register", data).then(r => {
    localStorage.setItem("fc_token", r.data.token);
    localStorage.setItem("fc_user", JSON.stringify(r.data.user));
    return r.data;
  }),
  login: (email: string, password: string) => api.post("/api/users/login", { email, password }).then(r => {
    localStorage.setItem("fc_token", r.data.token);
    localStorage.setItem("fc_user", JSON.stringify(r.data.user));
    return r.data;
  }),
  logout: () => {
    localStorage.removeItem("fc_token");
    localStorage.removeItem("fc_user");
  },
  getMe: () => api.get("/api/users/me").then(r => r.data.data),
  update: (data: any) => api.patch("/api/users/me", data).then(r => r.data.data || r.data),
  getMyTournaments: () => api.get("/api/users/me/tournaments").then(r => r.data.data),
  submitPayout: (data: any) => api.post("/api/users/payout-request", data).then(r => r.data.data),
};

export const guildApi = {
  getAll:      () => api.get("/api/guild").then(r => r.data.data),
  getMine:     () => api.get("/api/guild/mine").then(r => r.data.data),
  getById:     (id: string) => api.get(`/api/guild/${id}`).then(r => r.data.data),
  getBySlug:   (slug: string) => api.get(`/api/guild/slug/${slug}`).then(r => r.data.data),
  create:      (data: any) => api.post("/api/guild", data).then(r => r.data.data),
};

export const adminApi = {
  dashboard:    () => api.get("/api/admin/dashboard").then(r => r.data.data),
  activity:     () => api.get("/api/admin/activity").then(r => r.data.data),
  finance:      () => api.get("/api/admin/finance").then(r => r.data.data),
  settings:     () => api.get("/api/admin/settings").then(r => r.data.data),
  updateSettings:(data: any) => api.patch("/api/admin/settings", data).then(r => r.data.data),
  // users
  users:        (params?: any) => api.get('/api/admin/users', { params }).then(r => r.data),
  getUsers:     (search?: string, limit=50, offset=0) => api.get(`/api/admin/users?${search?`search=${search}&`:''}limit=${limit}&offset=${offset}`).then(r => r.data),
  updateUser:   (id: string, data: any) => api.patch(`/api/admin/users/${id}`, data).then(r => r.data.data),
  // payments
  getPayments:  (status?: string) => api.get(`/api/admin/payments${status?`?status=${status}`:''}`).then(r => r.data.data),
  confirmPayment:(id: string) => api.patch(`/api/admin/payments/${id}/confirm`).then(r => r.data),
  // guild
  getGuildBattles: () => api.get("/api/admin/guild").then(r => r.data.data),
  // tournament controls
  forceStart:   (id: string) => api.post(`/api/admin/tournaments/${id}/force-start`).then(r => r.data),
  forceEnd:     (id: string) => api.post(`/api/admin/tournaments/${id}/force-end`).then(r => r.data),
  renameTournament: (id: string, name: string) => api.patch(`/api/admin/tournaments/${id}/rename`, { name }).then(r => r.data),

  getDashboard: () => api.get("/api/admin/dashboard").then(r => r.data.data),
  getTournaments: () => api.get("/api/admin/tournaments").then(r => r.data.data),
  createTournament: (data: any) => api.post("/api/admin/tournaments", data).then(r => r.data.data),
  updateTournament: (id: string, data: any) => api.patch(`/api/admin/tournaments/${id}`, data).then(r => r.data.data),
  deleteTournament: (id: string) => api.delete(`/api/admin/tournaments/${id}`).then(r => r.data),
  getPayouts: (status = "pending") => api.get("/api/admin/payouts", { params: { status } }).then(r => r.data.data),
  updatePayout: (id: string, data: any) => api.patch(`/api/admin/payouts/${id}`, data).then(r => r.data.data),
  getFundedAccounts: () => api.get("/api/admin/funded-accounts").then(r => r.data.data),
  updateFundedAccount: (id: string, data: any) => api.patch(`/api/admin/funded-accounts/${id}`, data).then(r => r.data.data),
  getViolations: (status = "pending_review") => api.get("/api/admin/violations", { params: { status } }).then(r => r.data.data),
  updateViolation: (id: string, data: any) => api.patch(`/api/admin/violations/${id}`, data).then(r => r.data.data),
  getEntries: (params: any) => api.get("/api/admin/entries", { params }).then(r => r.data.data),
};

export default api;
