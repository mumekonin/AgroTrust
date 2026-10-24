import { Icon } from '@/shared/ui/Icon'
import './StepTracker.css'

export function StepTracker({ current, labels }: { current: number; labels: string[] }) {
  return (
    <ol className="steps">
      {labels.map((label, index) => {
        const number = index + 1
        const state = number < current ? 'done' : number === current ? 'current' : 'upcoming'
        return (
          <li key={label} className={`steps__item steps__item--${state}`}>
            <span className="steps__dot" aria-hidden="true">
              {state === 'done' ? <Icon name="check" size="sm" /> : number}
            </span>
            <span className="steps__label">{label}</span>
          </li>
        )
      })}
    </ol>
  )
}
