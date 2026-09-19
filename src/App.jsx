import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Scan from './pages/Scan.jsx'
import Family from './pages/Family.jsx'
import Cart from './pages/Cart.jsx'
import Report from './pages/Report.jsx'
import Ask from './pages/Ask.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="scan" element={<Scan />} />
        <Route path="family" element={<Family />} />
        <Route path="cart" element={<Cart />} />
        <Route path="report" element={<Report />} />
        <Route path="ask" element={<Ask />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
