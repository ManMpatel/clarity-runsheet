import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

const API_URL = 'http://localhost:3000'

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
})

api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch {}
  return config
})

export default api