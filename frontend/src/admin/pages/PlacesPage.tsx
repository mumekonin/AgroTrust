import { useEffect, useState, type FormEvent } from 'react'
import { useLang } from '@/shared/i18n/LangContext'
import { Dialog } from '@/shared/ui/Dialog'
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
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Place | null>(null)
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
      if (isPlace(created)) setParentId(created.parentId ?? '')
      setNote(t.adminSaved)
      setCreating(false)
      setEditing(null)
      setTick((value) => value + 1)
    } catch (err) {
      setError(problem(err, t.errorGeneric))
    }
  }

  return (
    <AdminFrame eyebrow={t.adminEyebrow} title={t.adminPlaces} hint={t.adminPlacesHint} query={query} onQuery={setQuery}>
      {error ? <p className="admin__error">{error}</p> : null}
      {note ? <p className="admin__note">{note}</p> : null}
      <div className="admin__toolbar">
        <button type="button" className="admin__submit" onClick={() => setCreating(true)}>
          {t.adminAdd}
        </button>
      </div>
      <section className="admin__card">
        {rows?.length === 0 ? <p className="admin__empty">{t.adminEmpty}</p> : null}
        <ul className="admin__list">
          {visible.map((row) => (
            <li key={row.id}>
              <div>
                <strong>{localized(row.name, locale)}</strong>
                <small>
                  {row.type} · {row.code}
                </small>
              </div>
              <button type="button" className="admin__text-btn" onClick={() => setEditing(row)}>
                {t.adminUpdate}
              </button>
            </li>
          ))}
        </ul>
      </section>
      {creating ? (
        <Dialog title={t.adminCreatePlace} closeLabel={t.adminClose} onClose={() => setCreating(false)}>
          <StepUpForm />
          <form
            className="admin__form"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault()
              const form = new FormData(event.currentTarget)
              const parent = String(form.get('parentId') ?? '').trim()
              const name = String(form.get('en') ?? '').trim()
              void save(() =>
                adminWrite<Place>('/admin/geo', 'POST', {
                  type: String(form.get('type')),
                  code: String(form.get('code') ?? '').trim(),
                  name: { en: name, am: name, om: name },
                  parentId: parent || undefined,
                }),
              )
            }}
          >
            <PlaceFields />
            <button className="admin__submit" type="submit">{t.adminSave}</button>
          </form>
        </Dialog>
      ) : null}
      {editing ? (
        <Dialog title={t.adminUpdatePlace} closeLabel={t.adminClose} onClose={() => setEditing(null)}>
          <form
            className="admin__form"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault()
              const form = new FormData(event.currentTarget)
              const name = String(form.get('en') ?? '').trim()
              void save(() =>
                adminWrite(`/admin/geo/${editing.id}`, 'PATCH', {
                  code: String(form.get('code') ?? '').trim(),
                  name: { en: name, am: name, om: name },
                }),
              )
            }}
          >
            <label>
              {t.adminCode}
              <input name="code" required defaultValue={editing.code} />
            </label>
            <label>
              {t.adminNameEn}
              <input name="en" required defaultValue={editing.name.en} />
            </label>
            <button className="admin__submit" type="submit">{t.adminSave}</button>
          </form>
        </Dialog>
      ) : null}
    </AdminFrame>
  )
}

function isPlace(value: unknown): value is Place {
  if (!value || typeof value !== 'object') return false
  const row = value as Place
  return typeof row.id === 'string' && typeof row.type === 'string' && typeof row.code === 'string'
}

function PlaceFields() {
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
        {t.adminParent}
        <input name="parentId" />
      </label>
    </>
  )
}
