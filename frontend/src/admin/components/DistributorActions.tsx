import { useEffect, useState, type FormEvent } from 'react'
import { useLang } from '@/shared/i18n/LangContext'
import { loadAssignments, loadCenters, loadSeasons, type AssignmentRow, type CenterRow, type SeasonRow } from '../api'
import { problem, splitIds } from '../text'
import { adminWrite } from '../write'
import { StepUpForm } from './StepUpForm'

export function DistributorActions({ onSaved }: { onSaved: () => void }) {
  const { t } = useLang()
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [seasons, setSeasons] = useState<SeasonRow[]>([])
  const [centers, setCenters] = useState<CenterRow[]>([])
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.allSettled([loadAssignments(), loadSeasons(), loadCenters()]).then(([assignmentPage, seasonPage, centerPage]) => {
      if (cancelled) return
      if (assignmentPage.status === 'fulfilled') setAssignments(assignmentPage.value.items)
      if (seasonPage.status === 'fulfilled') setSeasons(seasonPage.value.items)
      if (centerPage.status === 'fulfilled') setCenters(centerPage.value.items)
    })
    return () => {
      cancelled = true
    }
  }, [tick])

  async function save(work: () => Promise<void>) {
    setError(null)
    setNote(null)
    try {
      await work()
      setNote(t.adminSaved)
      setTick((value) => value + 1)
      onSaved()
    } catch (err) {
      setError(problem(err, t.errorGeneric))
    }
  }

  return (
    <>
      {error ? <p className="admin__error">{error}</p> : null}
      {note ? <p className="admin__note">{note}</p> : null}
      <section className="admin__card">
        <h2>{t.adminAssignments}</h2>
        {assignments.length === 0 ? <p className="admin__empty">{t.adminEmpty}</p> : null}
        <ul className="admin__list">
          {assignments.map((row) => (
            <li key={row.id}>
              <div>
                <strong>{row.inputCategory}</strong>
                <small>
                  {row.id} · {t.adminPriority} {row.priority}
                </small>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <div className="admin__split">
        <section className="admin__card">
          <StepUpForm />
          <form className="admin__form" onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            const regions = splitIds(String(form.get('serviceRegionIds') ?? '')) ?? []
            void save(() => adminWrite('/admin/distributors', 'POST', {
              code: String(form.get('code') ?? '').trim(),
              name: String(form.get('name') ?? '').trim(),
              type: String(form.get('type')),
              licenceNo: String(form.get('licenceNo') ?? '').trim(),
              contact: { phone: String(form.get('phone') ?? '').trim(), email: String(form.get('email') ?? '').trim() || undefined },
              serviceRegionIds: regions,
              status: String(form.get('status') || 'active'),
            }).then(() => undefined))
          }}>
            <h2>{t.adminCreateDistributor}</h2>
            <label>{t.adminCode}<input name="code" required /></label>
            <label>{t.adminDistributors}<input name="name" required /></label>
            <label>
              {t.adminType}
              <select name="type" defaultValue="private">
                <option value="private">{t.adminPrivate}</option>
                <option value="government">{t.adminGovernment}</option>
              </select>
            </label>
            <label>{t.adminLicence}<input name="licenceNo" required /></label>
            <label>{t.adminPhone}<input name="phone" required /></label>
            <label>{t.adminEmail}<input name="email" type="email" /></label>
            <label>{t.adminRegionsServed}<input name="serviceRegionIds" required /></label>
            <button className="admin__submit" type="submit">{t.adminSave}</button>
          </form>
        </section>
        <section className="admin__card">
          <form className="admin__form" onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            const id = String(form.get('id') ?? '').trim()
            void save(() => adminWrite(`/admin/distributors/${id}`, 'PATCH', {
              name: String(form.get('name') ?? '').trim() || undefined,
              licenceNo: String(form.get('licenceNo') ?? '').trim() || undefined,
              status: String(form.get('status') || undefined),
            }).then(() => undefined))
          }}>
            <h2>{t.adminUpdateDistributor}</h2>
            <label>{t.adminRecord}<input name="id" required /></label>
            <label>{t.adminDistributors}<input name="name" /></label>
            <label>{t.adminLicence}<input name="licenceNo" /></label>
            <label>
              {t.adminStatus}
              <select name="status" defaultValue="active">
                <option value="active">{t.adminActive}</option>
                <option value="suspended">{t.adminSuspended}</option>
              </select>
            </label>
            <button className="admin__submit" type="submit">{t.adminSave}</button>
          </form>
          <form className="admin__form" onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            void save(() => adminWrite('/admin/distributor-assignments', 'POST', {
              seasonId: String(form.get('seasonId')),
              localCenterId: String(form.get('localCenterId')),
              inputCategory: String(form.get('inputCategory')),
              distributorId: String(form.get('distributorId')),
              priority: Number(form.get('priority')),
            }).then(() => undefined))
          }}>
            <h2>{t.adminCreateAssignment}</h2>
            <label>
              {t.adminSeasons}
              <select name="seasonId" required defaultValue={seasons[0]?.id ?? ''}>
                {seasons.map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}
              </select>
            </label>
            <label>
              {t.adminCenters}
              <select name="localCenterId" required defaultValue={centers[0]?.id ?? ''}>
                {centers.map((center) => <option key={center.id} value={center.id}>{center.name}</option>)}
              </select>
            </label>
            <label>
              {t.adminType}
              <select name="inputCategory" defaultValue="fertilizer">
                <option value="fertilizer">fertilizer</option>
                <option value="seed">seed</option>
                <option value="agrochemical">agrochemical</option>
              </select>
            </label>
            <label>{t.adminDistributors}<input name="distributorId" required /></label>
            <label>{t.adminPriority}<input name="priority" type="number" min={1} required /></label>
            <button className="admin__submit" type="submit">{t.adminSave}</button>
          </form>
          <form className="admin__form" onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            const id = String(form.get('id') ?? '').trim()
            void save(() => adminWrite(`/admin/distributor-assignments/${id}`, 'PATCH', {
              distributorId: String(form.get('distributorId') ?? '').trim() || undefined,
              priority: Number(form.get('priority')),
            }).then(() => undefined))
          }}>
            <h2>{t.adminUpdateAssignment}</h2>
            <label>{t.adminRecord}<input name="id" required /></label>
            <label>{t.adminDistributors}<input name="distributorId" /></label>
            <label>{t.adminPriority}<input name="priority" type="number" min={1} required /></label>
            <button className="admin__submit" type="submit">{t.adminSave}</button>
          </form>
        </section>
      </div>
    </>
  )
}
