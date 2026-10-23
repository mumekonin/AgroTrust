import type { ReactNode } from 'react'
import { LanguageSwitch } from '@/shared/ui/LanguageSwitch'
import './PageShell.css'

interface PageShellProps {
  children: ReactNode
}

export function PageShell({ children }: PageShellProps) {
  return (
    <div className="page-shell">
      <header className="page-shell__header">
        <span className="page-shell__logo">AgroTrust</span>
        <LanguageSwitch />
      </header>
      <main className="page-shell__main">{children}</main>
      <footer className="page-shell__footer">
        <span>© {new Date().getFullYear()} AgroTrust · Ministry of Agriculture pilot</span>
      </footer>
    </div>
  )
}
