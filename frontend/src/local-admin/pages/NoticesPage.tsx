import { useEffect, useState } from 'react'
import { useLang } from '@/shared/i18n/LangContext'
import { loadInPerson, type InPersonNote } from '../api'
import { LocalFrame } from '../components/LocalFrame'
import { matches, problem } from '../text'

export function NoticesPage() {
  const { t } = useLang()
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<InPersonNote[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadInPerson()
      .then((items) => {
        if (!cancelled) setRows(items)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(problem(err, t.errorGeneric))
        setRows([])
      })
    return () => {
      cancelled = true
    }
  }, [t.errorGeneric])

  const visible = (rows ?? []).filter((row) => matches(query.trim().toLowerCase(), row.event, row.body))

  return (
    <LocalFrame title={t.localNotices} hint={t.localNoticesHint} query={query} onQuery={setQuery}>
      {error ? <p className="admin__error" role="alert">{error}</p> : null}
      <section className="admin__card">
        {rows?.length === 0 ? <p className="admin__empty">{t.localEmpty}</p> : null}
        <ul className="admin__list">
          {visible.map((row) => (
            <li key={row.id}>
              <strong>{row.event}</strong>
              <small>{row.status}</small>
              {row.body ? <p>{row.body}</p> : null}
            </li>
          ))}
        </ul>
      </section>
    </LocalFrame>
  )
}
