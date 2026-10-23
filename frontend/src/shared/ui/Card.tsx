import type { HTMLAttributes, ReactNode } from 'react'
import './Card.css'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  accent?: string   /* CSS colour value for the top border stripe */
}

export function Card({ children, accent, className = '', style, ...rest }: CardProps) {
  return (
    <div
      className={`at-card ${className}`.trim()}
      style={accent ? { '--card-accent': accent, ...style } as React.CSSProperties : style}
      {...rest}
    >
      {children}
    </div>
  )
}
