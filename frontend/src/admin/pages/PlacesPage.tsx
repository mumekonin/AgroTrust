import { useEffect, useState, type FormEvent } from 'react'
import { useLang } from '@/shared/i18n/LangContext'
import { loadGeo } from '../api'
import { StepUpForm } from '../components/StepUpForm'
import { localized, matches, problem } from '../text'
import { adminWrite } from '../write'
import { AdminFrame } from '../components/AdminFrame'

interface Place {
  id: string
  type: string
  code: string
  name: { en: string; am: string; om: string }
  parentId?: string
}

export function PlacesPage() {
  const { locale, t } = useLang()
  const [query, setQuery] = useState('')
  const [parentId, setParentId] = useState('')
  const [rows, setRows] = useState<Place[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [saved, setSaved] = useState<Place[]>([])
  const [draftParent, setDraftParent] = useState('')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    loadGeo(parentId || undefined)
      .then((page) => {
        if (!cancelled) setRows(page.items)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(problem(err, t.errorGeneric))
        setRows([])
      })
    return () => {
      cancelled = true
    }
  }, [parentId, tick, t.errorGeneric])

  const visible = (rows ?? []).filter((row) => matches(query.trim().toLowerCase(), row.code, row.type, localized(row.name, locale)))

  async function save(work: () => Promise<unknown>) {
    setError(null)
    setNote(null)
    try {
      const created = await work()
      if (isPlace(created)) {
        setSaved((items) => [created, ...items.filter((item) => item.id !== created.id)])
        setDraftParent(created.id)
        setParentId(created.parentId ?? '')
      }
      setNote(t.adminSaved)
      setTick((value) => value + 1)
    } catch (err) {
      setError(problem(err, t.errorGeneric))
    }
  }

  return (
    <AdminFrame eyebrow={t.adminEyebrow} title={t.adminPlaces} hint={t.adminPlacesHint} query={query} onQuery={setQuery}>
      {error ? <p className="admin__error">{error}</p> : null}
      {note ? <p className="admin__note">{note}</p> : null}
      {saved.length > 0 ? (
        <section className="admin__card">
          <h2>{t.adminCopyId}</h2>
          <ul className="admin__list">
            {saved.map((row) => (
              <li key={row.id}>
                <div>
                  <strong>{localized(row.name, locale)}</strong>
                  <small>
                    {row.type} · {row.code}
                  </small>
                  <strong>{row.id}</strong>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <label className="admin__season-wrap">
        {t.adminParent}
        <input className="admin__season" value={parentId} onChange={(event) => setParentId(event.target.value.trim())} />
      </label>
      <section className="admin__card">
        {rows?.length === 0 ? <p className="admin__empty">{t.adminEmpty}</p> : null}
        <ul className="admin__list">
          {visible.map((row) => (
            <li key={row.id}>
              <div>
                <strong>{localized(row.name, locale)}</strong>
                <small>
                  {row.type} · {row.code} · {row.id}
                </small>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <div className="admin__split">
        <section className="admin__card">
          <StepUpForm />
          <form
            className="admin__form"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault()
              const form = new FormData(event.currentTarget)
              const parent = String(form.get('parentId') ?? '').trim()
              void save(() =>
                adminWrite<Place>('/admin/geo', 'POST', {
                  type: String(form.get('type')),
                  code: String(form.get('code') ?? '').trim(),
                  name: names(form),
                  parentId: parent || undefined,
                }),
              )
            }}
          >
            <h2>{t.adminCreatePlace}</h2>
            <PlaceFields parent={draftParent} onParent={setDraftParent} />
            <button className="admin__submit" type="submit">{t.adminSave}</button>
          </form>
        </section>
        <section className="admin__card">
          <form
            className="admin__form"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault()
              const form = new FormData(event.currentTarget)
              const id = String(form.get('id') ?? '').trim()
              void save(() => adminWrite(`/admin/geo/${id}`, 'PATCH', { code: String(form.get('code') ?? '').trim(), name: names(form) }))
            }}
          >
            <h2>{t.adminUpdatePlace}</h2>
            <label>
              {t.adminRecord}
              <input name="id" required />
            </label>
            <PlaceFields />
            <button className="admin__submit" type="submit">{t.adminSave}</button>
          </form>
        </section>
      </div>
    </AdminFrame>
  )
}

function isPlace(value: unknown): value is Place {
  if (!value || typeof value !== 'object') return false
  const row = value as Place
  return typeof row.id === 'string' && typeof row.type === 'string' && typeof row.code === 'string'
}

function names(form: FormData) {
  return {
    en: String(form.get('en') ?? '').trim(),
    am: String(form.get('am') ?? '').trim(),
    om: String(form.get('om') ?? '').trim(),
  }
}

function PlaceFields({ parent, onParent }: { parent?: string; onParent?: (value: string) => void }) {
  const { t } = useLang()
  return (
    <>
      <label>
        {t.adminPlaceType}
        <select name="type" defaultValue="region">
          <option value="region">region</option>
          <option value="zone">zone</option>
          <option value="woreda">woreda</option>
          <option value="kebele">kebele</option>
        </select>
      </label>
      <label>
        {t.adminCode}
        <input name="code" required />
      </label>
      <label>
        {t.adminNameEn}
        <input name="en" required />
      </label>
      <label>
        {t.adminNameAm}
        <input name="am" required />
      </label>
      <label>
        {t.adminNameOm}
        <input name="om" required />
      </label>
      <label>
        {t.adminParent}
        <input
          name="parentId"
          value={onParent ? parent ?? '' : undefined}
          onChange={onParent ? (event) => onParent(event.target.value.trim()) : undefined}
        />
      </label>
    </>
  )
}
