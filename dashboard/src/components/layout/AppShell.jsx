import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import MobileBottomNav from './MobileBottomNav'

export default function AppShell() {
  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-950'>
      <Sidebar />
      <Header />
      <main className='md:ml-60 pt-[60px] md:pt-0 pb-20 md:pb-0 min-h-screen'>
        <Outlet />
      </main>
      <MobileBottomNav />
    </div>
  )
}