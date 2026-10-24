import type { CSSProperties, ReactNode } from 'react'
import './Icon.css'

interface IconProps {
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  fill?: boolean
  className?: string
  style?: CSSProperties
  'aria-hidden'?: boolean
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const icons: Record<string, ReactNode> = {
  eco: (
    <path
      d="M12 21c4.5-3.2 7-6.4 7-10a7 7 0 0 0-14 0c0 3.6 2.5 6.8 7 10zM12 21V11"
      {...stroke}
    />
  ),
  translate: (
    <>
      <circle cx="12" cy="12" r="8" {...stroke} />
      <path d="M4 12h16" {...stroke} />
      <path d="M12 4c2.4 2.3 3.6 5 3.6 8s-1.2 5.7-3.6 8c-2.4-2.3-3.6-5-3.6-8s1.2-5.7 3.6-8z" {...stroke} />
    </>
  ),
  agriculture: (
    <>
      <path d="M12 21V10" {...stroke} />
      <path d="M12 14c-3 0-5-2-5-5 3 0 5 2 5 5zM12 12c3 0 5-2 5-5-3 0-5 2-5 5z" {...stroke} />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="8" r="3.2" {...stroke} />
      <path d="M5.5 19.5c1.2-3 3.5-4.5 6.5-4.5s5.3 1.5 6.5 4.5" {...stroke} />
    </>
  ),
  local_shipping: (
    <>
      <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7" {...stroke} />
      <circle cx="7" cy="17.5" r="1.6" {...stroke} />
      <circle cx="17" cy="17.5" r="1.6" {...stroke} />
    </>
  ),
  account_balance: (
    <>
      <path d="M4 10h16M6 10v7M10 10v7M14 10v7M18 10v7M3 19h18M12 4l9 6H3z" {...stroke} />
    </>
  ),
  chevron_right: <path d="M9 6l6 6-6 6" {...stroke} />,
  check: <path d="M5 12.5l4.2 4.2L19 7.5" {...stroke} />,
  radio_button_unchecked: <circle cx="12" cy="12" r="7" {...stroke} />,
  arrow_back: <path d="M19 12H6M11 7l-5 5 5 5" {...stroke} />,
  phone: (
    <path
      d="M8 3h2l1.2 3-1.6 1a12 12 0 0 0 6.4 6.4l1-1.6L21 14v2a2 2 0 0 1-2.2 2A16 16 0 0 1 4 5.2 2 2 0 0 1 6 3z"
      {...stroke}
    />
  ),
  error: (
    <>
      <circle cx="12" cy="12" r="8" {...stroke} />
      <path d="M12 8v4M12 16h.01" {...stroke} />
    </>
  ),
  sms: (
    <>
      <path d="M5 6h14v9H8l-3 3z" {...stroke} />
    </>
  ),
  check_circle: (
    <>
      <circle cx="12" cy="12" r="8" {...stroke} />
      <path d="M8.5 12.2l2.3 2.3 4.7-5" {...stroke} />
    </>
  ),
  lock: (
    <>
      <rect x="6" y="11" width="12" height="8" rx="1.5" {...stroke} />
      <path d="M8.5 11V8.5a3.5 3.5 0 0 1 7 0V11" {...stroke} />
    </>
  ),
  verified_user: (
    <>
      <path d="M12 3l7 3v6c0 4.2-2.8 7.2-7 8.5C7.8 19.2 5 16.2 5 12V6z" {...stroke} />
      <path d="M9 12l2 2 4-4" {...stroke} />
    </>
  ),
  admin_panel_settings: (
    <>
      <path d="M12 3l7 3v6c0 4.2-2.8 7.2-7 8.5C7.8 19.2 5 16.2 5 12V6z" {...stroke} />
      <circle cx="12" cy="12" r="1.4" {...stroke} />
    </>
  ),
  vpn_key: (
    <>
      <circle cx="8" cy="14" r="3" {...stroke} />
      <path d="M11 14h9l-2 2 2 2" {...stroke} />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="14" r="3" {...stroke} />
      <path d="M11 14h9" {...stroke} />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8" {...stroke} />
      <path d="M12 11v5M12 8h.01" {...stroke} />
    </>
  ),
  badge: (
    <>
      <circle cx="12" cy="9" r="3" {...stroke} />
      <path d="M7 20v-1.5A3.5 3.5 0 0 1 10.5 15h3A3.5 3.5 0 0 1 17 18.5V20" {...stroke} />
    </>
  ),
  visibility: (
    <>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" {...stroke} />
      <circle cx="12" cy="12" r="2.4" {...stroke} />
    </>
  ),
  visibility_off: (
    <>
      <path d="M4 5l16 14" {...stroke} />
      <path d="M9.5 9.7A3 3 0 0 0 12 15a3 3 0 0 0 2.2-.9M6.2 7.4C4 8.8 2.5 11 2 12c1 1.6 4 6 10 6 1.6 0 3-.4 4.2-1" {...stroke} />
      <path d="M10 6.2A10 10 0 0 1 12 6c6 0 9 6 10 6a16 16 0 0 1-2.2 2.8" {...stroke} />
    </>
  ),
  dashboard: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.4" {...stroke} />
      <rect x="13" y="4" width="7" height="4.5" rx="1.4" {...stroke} />
      <rect x="13" y="11" width="7" height="9" rx="1.4" {...stroke} />
      <rect x="4" y="13.5" width="7" height="6.5" rx="1.4" {...stroke} />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="14" rx="1.6" {...stroke} />
      <path d="M8 4v3M16 4v3M4 10h16" {...stroke} />
    </>
  ),
  history: (
    <>
      <path d="M5 12a7 7 0 1 0 2-4.9" {...stroke} />
      <path d="M5 5v3.2h3.2M12 8.5V12l2.4 1.6" {...stroke} />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6" {...stroke} />
      <path d="M15.5 15.5L20 20" {...stroke} />
    </>
  ),
  logout: <path d="M10 7V5.5A1.5 1.5 0 0 1 11.5 4h7A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 10 18.5V17M4 12h10M6.5 9.5L4 12l2.5 2.5" {...stroke} />,
}

export function Icon({
  name,
  size = 'md',
  fill = false,
  className = '',
  style,
  'aria-hidden': ariaHidden = true,
}: IconProps) {
  return (
    <svg
      className={`at-icon at-icon--${size}${fill ? ' at-icon--fill' : ''} ${className}`.trim()}
      viewBox="0 0 24 24"
      style={style}
      aria-hidden={ariaHidden || undefined}
    >
      {icons[name] ?? null}
    </svg>
  )
}
