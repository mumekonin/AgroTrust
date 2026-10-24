import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { WelcomePage } from '@/portal/pages/WelcomePage'
import { FarmerLoginPage } from '@/auth/pages/FarmerLoginPage'
import { StaffLoginPage } from '@/auth/pages/StaffLoginPage'
import { ActivationPage } from '@/auth/pages/ActivationPage'
import { FarmerShell } from '@/farmers/components/FarmerShell'
import { FarmerHomePage } from '@/farmers/pages/FarmerHomePage'
import { FarmerRequestPage } from '@/farmers/pages/FarmerRequestPage'

export function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/auth/farmer" element={<FarmerLoginPage />} />
        <Route path="/auth/staff" element={<StaffLoginPage />} />
        <Route path="/auth/activate" element={<ActivationPage />} />
        <Route path="/farmer" element={<FarmerShell />}>
          <Route index element={<FarmerHomePage />} />
          <Route path="request" element={<FarmerRequestPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
