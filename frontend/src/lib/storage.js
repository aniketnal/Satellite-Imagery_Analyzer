const USERS_KEY = 'sia_users'
const CURRENT_USER_KEY = 'user'
const ANALYSES_KEY = 'sia_analyses'
const HARDCODED_ADMIN = {
  id: 'admin_001',
  name: 'System Admin',
  email: 'admin@sia.local',
  role: 'Administrator',
  password: 'admin123',
  createdAt: '2026-01-01T00:00:00.000Z',
}

function safeParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

function getUsers() {
  const users = safeParse(localStorage.getItem(USERS_KEY), [])
  const hasAdmin = users.some((u) => u.email === HARDCODED_ADMIN.email)

  if (!hasAdmin) {
    const nextUsers = [...users, HARDCODED_ADMIN]
    saveUsers(nextUsers)
    return nextUsers
  }

  return users
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
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
  const trimmedName = (name || '').trim()
  const normalizedEmail = normalizeEmail(email)
  const rawPassword = (password || '').trim()

  if (!trimmedName || !normalizedEmail || !rawPassword) {
    return { ok: false, message: 'Please fill all required fields.' }
  }

  if (rawPassword.length < 6) {
    return { ok: false, message: 'Password must be at least 6 characters.' }
  }

  const users = getUsers()
  const exists = users.some((u) => u.email === normalizedEmail)
  if (exists) {
    return { ok: false, message: 'Account already exists for this email.' }
  }

  const newUser = {
    id: `u_${Date.now()}`,
    name: trimmedName,
    email: normalizedEmail,
    role: 'Planner',
    password: rawPassword,
    createdAt: new Date().toISOString(),
  }

  users.push(newUser)
  saveUsers(users)

  const sessionUser = {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
    createdAt: newUser.createdAt,
  }
  setCurrentUser(sessionUser)

  return { ok: true, user: sessionUser }
}

export function ensureHardcodedAdminAccount() {
  getUsers()
}

export function loginUser({ email, password }) {
  const normalizedEmail = normalizeEmail(email)
  const rawPassword = (password || '').trim()

  const users = getUsers()
  const found = users.find((u) => u.email === normalizedEmail && u.password === rawPassword)

  if (!found) {
    return { ok: false, message: 'Invalid email or password.' }
  }

  const sessionUser = {
    id: found.id,
    name: found.name,
    email: found.email,
    role: found.role,
    createdAt: found.createdAt,
  }

  setCurrentUser(sessionUser)
  return { ok: true, user: sessionUser }
}

export function logoutUser() {
  localStorage.removeItem(CURRENT_USER_KEY)
}

export function getUserAnalyses(userId) {
  const items = safeParse(localStorage.getItem(ANALYSES_KEY), [])
  if (!userId) return []
  return items.filter((item) => item.userId === userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export function saveAnalysisForUser(userId, reportState) {
  if (!userId || !reportState) return null

  const items = safeParse(localStorage.getItem(ANALYSES_KEY), [])
  const newItem = {
    id: `a_${Date.now()}`,
    userId,
    createdAt: new Date().toISOString(),
    reportState,
  }

  items.push(newItem)
  localStorage.setItem(ANALYSES_KEY, JSON.stringify(items))

  return newItem
}

export function getLatestAnalysis(userId) {
  const items = getUserAnalyses(userId)
  return items.length > 0 ? items[0] : null
}

export function getCurrentUserSafe() {
  return getCurrentUser()
}

export function isAdminUser(user) {
  return user?.role === 'Administrator'
}

export function getAllUsersWithAnalyses() {
  const users = getUsers().map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  }))

  return users.map((user) => {
    const analyses = getUserAnalyses(user.id)
    return {
      ...user,
      analyses,
      analysesCount: analyses.length,
    }
  })
}

export function getAllAnalyses() {
  return safeParse(localStorage.getItem(ANALYSES_KEY), []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export function getHardcodedAdminCredentials() {
  return {
    email: HARDCODED_ADMIN.email,
    password: HARDCODED_ADMIN.password,
  }
}
