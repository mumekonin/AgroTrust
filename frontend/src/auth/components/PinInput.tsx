import { useRef, type ChangeEvent } from 'react'
import { useTranslation } from '@/shared/i18n/LangContext'
import './PinInput.css'

interface PinInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  error?: boolean
  autoFocus?: boolean
  length?: number
  mask?: boolean
  autoComplete?: string
  label?: string
}

export function PinInput({
  value,
  onChange,
  disabled = false,
  error = false,
  autoFocus = false,
  length = 6,
  mask = true,
  autoComplete = 'one-time-code',
  label,
}: PinInputProps) {
  const { t } = useTranslation()
  const hiddenInputRef = useRef<HTMLInputElement>(null)
  const digits = Array.from({ length }, (_, index) => value[index] || '')
  const accessibleName = label ?? t('labelPin')

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value.replace(/\D/g, '').slice(0, length))
  }

  return (
    <div
      className={`pin-input-container${error ? ' pin-input--error' : ''}${disabled ? ' pin-input--disabled' : ''}`}
      onClick={() => hiddenInputRef.current?.focus()}
    >
      <input
        ref={hiddenInputRef}
        type={mask ? 'password' : 'text'}
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={length}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        autoFocus={autoFocus}
        className="pin-hidden-input"
        aria-label={accessibleName}
        autoComplete={autoComplete}
      />

      <div className="pin-slots" aria-hidden="true">
        {digits.map((digit, index) => {
          const isCurrent = index === value.length && !disabled
          const isFilled = Boolean(digit)
          return (
            <div
              key={index}
              className={`pin-slot${isFilled ? ' pin-slot--filled' : ''}${isCurrent ? ' pin-slot--current' : ''}`}
            >
              {digit ? (mask ? '•' : digit) : ''}
            </div>
          )
        })}
      </div>
    </div>
  )
}
