import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Scan from './pages/Scan.jsx'
import ClaimCheck from './pages/ClaimCheck.jsx'
import Family from './pages/Family.jsx'
import SafeList from './pages/SafeList.jsx'
import Report from './pages/Report.jsx'
import Ask from './pages/Ask.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="scan" element={<Scan />} />
        <Route path="check" element={<ClaimCheck />} />
        <Route path="family" element={<Family />} />
        <Route path="safe" element={<SafeList />} />
        <Route path="cart" element={<Navigate to="/safe" replace />} />
        <Route path="report" element={<Report />} />
        <Route path="ask" element={<Ask />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
