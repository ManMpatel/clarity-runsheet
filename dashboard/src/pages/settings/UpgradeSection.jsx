import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

export default function UpgradeSection() {
  const navigate = useNavigate()

  useEffect(() => {
    navigate('/settings?tab=billing')
  }, [])

  return null
}
