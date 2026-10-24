import { useRef, type ChangeEvent, type KeyboardEvent } from 'react'
import { useTranslation } from '@/shared/i18n/LangContext'
import './PinInput.css'

interface PinInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  error?: boolean
  autoFocus?: boolean
  length?: number
}

export function PinInput({
  value,
  onChange,
  disabled = false,
  error = false,
  autoFocus = false,
  length = 6,
}: PinInputProps) {
  const { t } = useTranslation()
  const hiddenInputRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, length)
    onChange(raw)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && value.length > 0) {
      // naturally handled by input
    }
  }

  const digits = Array.from({ length }).map((_, i) => value[i] || '')

  return (
    <div
      className={`pin-input-container ${error ? 'pin-input--error' : ''} ${disabled ? 'pin-input--disabled' : ''}`}
      onClick={() => hiddenInputRef.current?.focus()}
      role="group"
      aria-label={t('labelPin')}
    >
      <input
        ref={hiddenInputRef}
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={length}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        autoFocus={autoFocus}
        className="pin-hidden-input"
        aria-label={t('labelPin')}
        autoComplete="one-time-code"
      />

      <div className="pin-slots" aria-hidden="true">
        {digits.map((digit, idx) => {
          const isCurrent = idx === value.length && !disabled
          const isFilled = Boolean(digit)

          return (
            <div
              key={idx}
              className={`pin-slot ${isFilled ? 'pin-slot--filled' : ''} ${isCurrent ? 'pin-slot--current' : ''}`}
            >
              {digit ? '•' : ''}
            </div>
          )
        })}
      </div>
    </div>
  )
}
