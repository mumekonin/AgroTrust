import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { PageShell } from '@/shared/layout/PageShell'
import { WelcomePage } from '@/portal/pages/WelcomePage'

/**
 * App router.
 * Page 1 only: the public welcome portal at /.
 * Auth and role shells will be added in subsequent pages.
 */
export function Router() {
  return (
    <BrowserRouter>
      <PageShell>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
        </Routes>
      </PageShell>
    </BrowserRouter>
  )
}
