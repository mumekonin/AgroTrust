import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { WelcomePage } from '@/portal/pages/WelcomePage'
import { StaffLoginPage } from '@/auth/pages/StaffLoginPage'
import { AcceptInvitationPage } from '@/auth/pages/AcceptInvitationPage'
import { AdminShell } from '@/admin/components/AdminShell'
import { SeasonsPage } from '@/admin/pages/SeasonsPage'
import { LocalShell } from '@/local-admin/components/LocalShell'
import { LocalFarmersPage } from '@/local-admin/pages/LocalFarmersPage'
import { AssistedPage } from '@/local-admin/pages/AssistedPage'
import { RequisitionsPage } from '@/local-admin/pages/RequisitionsPage'
import { PaymentsPage as LocalPaymentsPage } from '@/local-admin/pages/PaymentsPage'
import { ReceivePage } from '@/local-admin/pages/ReceivePage'
import { PickupPage } from '@/local-admin/pages/PickupPage'
import { RegionalShell } from '@/regional/components/RegionalShell'
import { RegionalInvitationsPage } from '@/regional/pages/RegionalInvitationsPage'
import { DistributorShell } from '@/distributor/components/DistributorShell'
import { RequisitionsPage as DistributorRequisitionsPage } from '@/distributor/pages/RequisitionsPage'
import { ShipmentsPage } from '@/distributor/pages/ShipmentsPage'

export function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/auth/staff" element={<StaffLoginPage />} />
        <Route path="/auth/accept" element={<AcceptInvitationPage />} />
        <Route path="/regional" element={<RegionalShell />}>
          <Route index element={<RegionalInvitationsPage />} />
        </Route>
        <Route path="/local" element={<LocalShell />}>
          <Route index element={<LocalFarmersPage />} />
          <Route path="assisted" element={<AssistedPage />} />
          <Route path="payments" element={<LocalPaymentsPage />} />
          <Route path="requisitions" element={<RequisitionsPage />} />
          <Route path="receiving" element={<ReceivePage />} />
          <Route path="pickup" element={<PickupPage />} />
        </Route>
        <Route path="/distributor" element={<DistributorShell />}>
          <Route index element={<DistributorRequisitionsPage />} />
          <Route path="shipments" element={<ShipmentsPage />} />
        </Route>
        <Route path="/admin" element={<AdminShell />}>
          <Route index element={<SeasonsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
