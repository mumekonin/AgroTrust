import './FactBadge.css'

interface FactBadgeProps {
  value: string
  label: string
}

export function FactBadge({ value, label }: FactBadgeProps) {
  return (
    <div className="fact-badge">
      <span className="fact-badge__value">{value}</span>
      <span className="fact-badge__label">{label}</span>
    </div>
  )
}
