import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { WelcomePage } from '@/portal/pages/WelcomePage'
import { FarmerLoginPage } from '@/auth/pages/FarmerLoginPage'
import { StaffLoginPage } from '@/auth/pages/StaffLoginPage'
import { ActivationPage } from '@/auth/pages/ActivationPage'
import { AcceptInvitationPage } from '@/auth/pages/AcceptInvitationPage'
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
import { PlacesPage } from '@/admin/pages/PlacesPage'
import { AllocationsPage } from '@/admin/pages/AllocationsPage'
import { FarmersPage } from '@/admin/pages/FarmersPage'
import { PaymentsPage } from '@/admin/pages/PaymentsPage'
import { NoticesPage } from '@/admin/pages/NoticesPage'
import { InvitationsPage } from '@/admin/pages/InvitationsPage'
import { OperationsPage } from '@/admin/pages/OperationsPage'
import { LocalShell } from '@/local-admin/components/LocalShell'
import { LocalFarmersPage } from '@/local-admin/pages/LocalFarmersPage'
import { QueuePage } from '@/local-admin/pages/QueuePage'
import { AssistedPage } from '@/local-admin/pages/AssistedPage'
import { RequisitionsPage } from '@/local-admin/pages/RequisitionsPage'
import { PaymentsPage as LocalPaymentsPage } from '@/local-admin/pages/PaymentsPage'
import { ReceivePage } from '@/local-admin/pages/ReceivePage'
import { PickupPage } from '@/local-admin/pages/PickupPage'
import { NoticesPage as LocalNoticesPage } from '@/local-admin/pages/NoticesPage'
import { StockPage } from '@/local-admin/pages/StockPage'
import { RegionalShell } from '@/regional/components/RegionalShell'
import { RegionalInvitationsPage } from '@/regional/pages/RegionalInvitationsPage'
import { DistributorShell } from '@/distributor/components/DistributorShell'
import { RequisitionsPage as DistributorRequisitionsPage } from '@/distributor/pages/RequisitionsPage'
import { ShipmentsPage } from '@/distributor/pages/ShipmentsPage'
import { PaymentsPage as DistributorPaymentsPage } from '@/distributor/pages/PaymentsPage'

export function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/auth/farmer" element={<FarmerLoginPage />} />
        <Route path="/auth/staff" element={<StaffLoginPage />} />
        <Route path="/auth/activate" element={<ActivationPage />} />
        <Route path="/auth/accept" element={<AcceptInvitationPage />} />
        <Route path="/farmer" element={<FarmerShell />}>
          <Route index element={<FarmerHomePage />} />
          <Route path="request" element={<FarmerRequestPage />} />
        </Route>
        <Route path="/regional" element={<RegionalShell />}>
          <Route index element={<RegionalInvitationsPage />} />
          <Route path="overview" element={<NationalAdminPage />} />
          <Route path="centers" element={<CentersPage />} />
          <Route path="distributors" element={<DistributorsPage />} />
          <Route path="allocations" element={<AllocationsPage />} />
          <Route path="operations" element={<OperationsPage />} />
          <Route path="fraud" element={<FraudPage />} />
          <Route path="audit" element={<AuditPage />} />
        </Route>
        <Route path="/local" element={<LocalShell />}>
          <Route index element={<LocalFarmersPage />} />
          <Route path="queue" element={<QueuePage />} />
          <Route path="assisted" element={<AssistedPage />} />
          <Route path="requisitions" element={<RequisitionsPage />} />
          <Route path="payments" element={<LocalPaymentsPage />} />
          <Route path="receiving" element={<ReceivePage />} />
          <Route path="pickup" element={<PickupPage />} />
          <Route path="notices" element={<LocalNoticesPage />} />
          <Route path="stock" element={<StockPage />} />
        </Route>
        <Route path="/distributor" element={<DistributorShell />}>
          <Route index element={<DistributorRequisitionsPage />} />
          <Route path="shipments" element={<ShipmentsPage />} />
          <Route path="payments" element={<DistributorPaymentsPage />} />
        </Route>
        <Route path="/admin" element={<AdminShell />}>
          <Route index element={<NationalAdminPage />} />
          <Route path="seasons" element={<SeasonsPage />} />
          <Route path="places" element={<PlacesPage />} />
          <Route path="allocations" element={<AllocationsPage />} />
          <Route path="farmers" element={<FarmersPage />} />
          <Route path="distributors" element={<DistributorsPage />} />
          <Route path="centers" element={<CentersPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="notifications" element={<NoticesPage />} />
          <Route path="invitations" element={<InvitationsPage />} />
          <Route path="operations" element={<OperationsPage />} />
          <Route path="fraud" element={<FraudPage />} />
          <Route path="audit" element={<AuditPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
