import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'

export default function GoogleAuthSuccess() {
  const navigate  = useNavigate()
  const login     = useAuthStore(s => s.login)
  const initDark  = useUiStore(s => s.initDarkMode)

  useEffect(() => {
    const params    = new URLSearchParams(window.location.search)
    const token     = params.get('token')
    const onboarding = params.get('onboarding') === 'true'

    if (!token) {
      navigate('/login?error=google')
      return
    }

    const payload = JSON.parse(atob(token.split('.')[1]))
    const user = {
      id:    payload.userId,
      role:  payload.role,
      email: '',
      name:  '',
    }

    login(token, user, onboarding)
    initDark()
    navigate(onboarding ? '/dashboard' : '/onboarding')
  }, [])

  return (
    <div className='min-h-screen flex items-center justify-center'>
      <p className='text-sm text-gray-500'>Signing you in...</p>
    </div>
  )
}
