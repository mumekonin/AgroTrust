import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { WelcomePage } from '@/portal/pages/WelcomePage'
import { FarmerLoginPage } from '@/auth/pages/FarmerLoginPage'
import { StaffLoginPage } from '@/auth/pages/StaffLoginPage'
import { ActivationPage } from '@/auth/pages/ActivationPage'
import { FarmerShell } from '@/farmers/components/FarmerShell'
import { FarmerHomePage } from '@/farmers/pages/FarmerHomePage'
import { FarmerRequestPage } from '@/farmers/pages/FarmerRequestPage'
import { AdminShell } from '@/admin/components/AdminShell'
import { NationalAdminPage } from '@/admin/pages/NationalAdminPage'
import { SeasonsPage } from '@/admin/pages/SeasonsPage'
import { DistributorsPage } from '@/admin/pages/DistributorsPage'
import { CentersPage } from '@/admin/pages/CentersPage'
import { FraudPage } from '@/admin/pages/FraudPage'
import { AuditPage } from '@/admin/pages/AuditPage'

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
        <Route path="/admin" element={<AdminShell />}>
          <Route index element={<NationalAdminPage />} />
          <Route path="seasons" element={<SeasonsPage />} />
          <Route path="distributors" element={<DistributorsPage />} />
          <Route path="centers" element={<CentersPage />} />
          <Route path="fraud" element={<FraudPage />} />
          <Route path="audit" element={<AuditPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
