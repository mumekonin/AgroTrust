import { Link } from 'react-router-dom'
import { Icon } from '@/shared/ui/Icon'
import './PortalCard.css'

interface PortalCardProps {
  id: string
  icon: string
  title: string
  description: string
  accent?: string
  to?: string
  tone?: 'dark' | 'light'
}

export function PortalCard({
  id,
  icon,
  title,
  description,
  accent = '#2f6b45',
  to,
  tone = 'dark',
}: PortalCardProps) {
  const content = (
    <>
      <div className="portal-card__icon-wrap" aria-hidden="true">
        <Icon name={icon} size="md" />
      </div>

      <div className="portal-card__body">
        <span className="portal-card__title">{title}</span>
        <span className="portal-card__desc">{description}</span>
      </div>

      <Icon name="chevron_right" size="md" className="portal-card__arrow" aria-hidden />
    </>
  )

  if (to) {
    return (
      <Link
        id={id}
        to={to}
        className={`portal-card portal-card--link${tone === 'light' ? ' portal-card--light' : ''}`}
        style={{ '--pc-accent': accent, textDecoration: 'none', color: 'inherit' } as React.CSSProperties}
      >
        {content}
      </Link>
    )
  }

  return (
    <div
      id={id}
      className={`portal-card${tone === 'light' ? ' portal-card--light' : ''}`}
      style={{ '--pc-accent': accent } as React.CSSProperties}
    >
      {content}
    </div>
  )
}
