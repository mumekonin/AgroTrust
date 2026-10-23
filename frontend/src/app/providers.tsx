import type { ReactNode } from 'react'
import { LangProvider } from '@/shared/i18n/LangContext'

interface ProvidersProps {
  children: ReactNode
}

/** Root providers. Language is the only provider needed for Page 1. */
export function Providers({ children }: ProvidersProps) {
  return <LangProvider>{children}</LangProvider>
}
