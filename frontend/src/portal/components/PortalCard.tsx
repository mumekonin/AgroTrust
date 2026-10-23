import { Card } from '@/shared/ui/Card'
import './PortalCard.css'

interface PortalCardProps {
  id: string
  icon: string          /* single emoji used as a decorative icon */
  title: string
  description: string
  accent: string        /* CSS colour token value */
}

export function PortalCard({ id, icon, title, description, accent }: PortalCardProps) {
  return (
    <Card id={id} className="portal-card" accent={accent}>
      <span className="portal-card__icon" aria-hidden="true">{icon}</span>
      <h3 className="portal-card__title">{title}</h3>
      <p className="portal-card__desc">{description}</p>
    </Card>
  )
}
