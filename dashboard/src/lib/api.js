import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
})

api.interceptors.request.use(config => {
  const isAdminRoute = config.url?.includes('/api/admin/')
  if (isAdminRoute) {
    const adminToken = localStorage.getItem('adminToken')
    if (adminToken) config.headers.Authorization = `Bearer ${adminToken}`
  } else {
    const token = useAuthStore.getState().token
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      const isAdminRoute = err.config?.url?.includes('/api/admin/')
      if (isAdminRoute) {
        localStorage.removeItem('adminToken')
        window.location.href = '/admin/login'
      } else {
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api