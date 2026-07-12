import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'

const MainLayout = () => {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
        <Navbar />
        <main className="flex-1 w-full min-w-0 pt-20">
            <Outlet />
        </main>
        <Footer />
    </div>
  )
}

export default MainLayout