import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
const CURRENT_USER_KEY = 'user'
const HARDCODED_ADMIN = {
  email: 'admin@sia.local',
  password: 'admin123',
}

function safeParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

function getCurrentUser() {
  return safeParse(localStorage.getItem(CURRENT_USER_KEY), null)
}

function setCurrentUser(user) {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user))
}

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase()
}

export function registerUser({ name, email, password }) {
  return axios
    .post(`${API_BASE}/auth/register`, {
      name,
      email: normalizeEmail(email),
      password: (password || '').trim(),
    })
    .then((response) => {
      const user = response.data?.user || null
      if (user) setCurrentUser(user)
      return { ok: true, user }
    })
    .catch((error) => ({
      ok: false,
      message: error?.response?.data?.error || 'Registration failed.',
    }))
}

export async function ensureHardcodedAdminAccount() {
  return true
}

export function loginUser({ email, password }) {
  return axios
    .post(`${API_BASE}/auth/login`, {
      email: normalizeEmail(email),
      password: (password || '').trim(),
    })
    .then((response) => {
      const user = response.data?.user || null
      if (user) setCurrentUser(user)
      return { ok: true, user }
    })
    .catch((error) => ({
      ok: false,
      message: error?.response?.data?.error || 'Login failed.',
    }))
}

export function logoutUser() {
  axios.post(`${API_BASE}/auth/logout`).catch(() => {})
  localStorage.removeItem(CURRENT_USER_KEY)
}

export async function getUserAnalyses(userId) {
  if (!userId) return []

  const response = await axios.get(`${API_BASE}/users/${userId}/analyses`)
  return response.data?.analyses || []
}

export async function saveAnalysisForUser(userId, reportState) {
  if (!userId || !reportState) return null

  const response = await axios.post(`${API_BASE}/users/${userId}/analyses`, {
    reportState,
    analysisData: reportState.analysisData,
  })

  return response.data?.analysis || null
}

export async function getLatestAnalysis(userId) {
  const items = await getUserAnalyses(userId)
  return items.length > 0 ? items[0] : null
}

export function getCurrentUserSafe() {
  return getCurrentUser()
}

export function isAdminUser(user) {
  return user?.role === 'Administrator'
}

export async function getAllUsersWithAnalyses() {
  const response = await axios.get(`${API_BASE}/admin/users`)
  return response.data?.users || []
}

export async function getAllAnalyses() {
  const response = await axios.get(`${API_BASE}/admin/analyses`)
  return response.data?.analyses || []
}

export function getHardcodedAdminCredentials() {
  return HARDCODED_ADMIN
}
