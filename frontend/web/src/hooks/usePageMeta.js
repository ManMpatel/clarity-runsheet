import { useLocation } from 'react-router-dom'
import { pageTitleFor } from '../components/layout/nav-config'

/** Route -> topbar title, driven by the same nav-config every other chrome piece reads from. */
export default function usePageMeta() {
  const { pathname } = useLocation()
  return { title: pageTitleFor(pathname) }
}
