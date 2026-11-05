import { useEffect, useState, type FormEvent } from 'react'
import { useLang } from '@/shared/i18n/LangContext'
import { Dialog } from '@/shared/ui/Dialog'
import { loadAssignments, loadCenters, loadSeasons, type AssignmentRow, type CenterRow, type DistributorRow, type SeasonRow } from '../api'
import { problem } from '../text'
import { adminWrite } from '../write'
import { StepUpForm } from './StepUpForm'

type DialogKind = 'create' | 'assign' | null

export function DistributorActions({
  editing,
  onCloseEdit,
  onSaved,
}: {
  editing: DistributorRow | null
  onCloseEdit: () => void
  onSaved: () => void
}) {
  const { t } = useLang()
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [seasons, setSeasons] = useState<SeasonRow[]>([])
  const [centers, setCenters] = useState<CenterRow[]>([])
  const [dialog, setDialog] = useState<DialogKind>(null)
  const [assignment, setAssignment] = useState<AssignmentRow | null>(null)
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

  function close() {
    setDialog(null)
    setAssignment(null)
    onCloseEdit()
    setError(null)
  }

  async function save(work: () => Promise<void>) {
    setError(null)
    setNote(null)
    try {
      await work()
      setNote(t.adminSaved)
      setTick((value) => value + 1)
      onSaved()
      close()
    } catch (err) {
      setError(problem(err, t.errorGeneric))
    }
  }

  const open = dialog ?? (editing ? 'edit' : null)

  return (
    <>
      {note ? <p className="admin__note">{note}</p> : null}
      <div className="admin__toolbar">
        <button type="button" className="admin__text-btn" onClick={() => setDialog('assign')}>
          {t.adminCreateAssignment}
        </button>
        <button type="button" className="admin__submit" onClick={() => setDialog('create')}>
          {t.adminAdd}
        </button>
      </div>
      <section className="admin__card">
        <h2>{t.adminAssignments}</h2>
        {assignments.length === 0 ? <p className="admin__empty">{t.adminEmpty}</p> : null}
        <ul className="admin__list">
          {assignments.map((row) => (
            <li key={row.id}>
              <div>
                <strong>{row.inputCategory}</strong>
                <small>
                  {t.adminPriority} {row.priority}
                </small>
              </div>
              <button type="button" className="admin__text-btn" onClick={() => setAssignment(row)}>
                {t.adminUpdate}
              </button>
            </li>
          ))}
        </ul>
      </section>
      {open === 'create' ? (
        <Dialog title={t.adminCreateDistributor} closeLabel={t.adminClose} onClose={close}>
          <StepUpForm />
          {error ? <p className="admin__error">{error}</p> : null}
          <form
            className="admin__form"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault()
              const form = new FormData(event.currentTarget)
              const code = String(form.get('code') ?? '').trim()
              void save(async () => {
                await adminWrite('/admin/distributors', 'POST', {
                  code,
                  name: String(form.get('name') ?? '').trim(),
                  type: String(form.get('type')),
                  licenceNo: code,
                  contact: { phone: String(form.get('phone') ?? '').trim() },
                  serviceRegionIds: [String(form.get('regionId') ?? '').trim()],
                  bankAccountRef: String(form.get('bankAccountRef') ?? '').trim(),
                  status: 'active',
                })
              })
            }}
          >
            <label>{t.adminCode}<input name="code" required /></label>
            <label>{t.adminDistributors}<input name="name" required /></label>
            <label>
              {t.adminType}
              <select name="type" defaultValue="private">
                <option value="private">{t.adminPrivate}</option>
                <option value="government">{t.adminGovernment}</option>
              </select>
            </label>
            <label>{t.adminPhone}<input name="phone" required /></label>
            <label>{t.adminBank}<input name="bankAccountRef" required /></label>
            <label>{t.adminColRegion}<input name="regionId" required /></label>
            <button className="admin__submit" type="submit">{t.adminSave}</button>
          </form>
        </Dialog>
      ) : null}
      {editing ? (
        <Dialog title={t.adminUpdateDistributor} closeLabel={t.adminClose} onClose={close}>
          {error ? <p className="admin__error">{error}</p> : null}
          <form
            className="admin__form"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault()
              const form = new FormData(event.currentTarget)
              void save(() =>
                adminWrite(`/admin/distributors/${editing.id}`, 'PATCH', {
                  name: String(form.get('name') ?? '').trim(),
                  bankAccountRef: String(form.get('bankAccountRef') ?? '').trim(),
                  status: String(form.get('status')),
                }).then(() => undefined),
              )
            }}
          >
            <label>{t.adminDistributors}<input name="name" required defaultValue={editing.name} /></label>
            <label>{t.adminBank}<input name="bankAccountRef" required defaultValue={editing.bankAccountRef} /></label>
            <label>
              {t.adminStatus}
              <select name="status" defaultValue={editing.status}>
                <option value="active">{t.adminActive}</option>
                <option value="suspended">{t.adminSuspended}</option>
              </select>
            </label>
            <button className="admin__submit" type="submit">{t.adminSave}</button>
          </form>
        </Dialog>
      ) : null}
      {dialog === 'assign' ? (
        <Dialog title={t.adminCreateAssignment} closeLabel={t.adminClose} onClose={close}>
          <StepUpForm />
          {error ? <p className="admin__error">{error}</p> : null}
          <form
            className="admin__form"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault()
              const form = new FormData(event.currentTarget)
              void save(() =>
                adminWrite('/admin/distributor-assignments', 'POST', {
                  seasonId: String(form.get('seasonId')),
                  localCenterId: String(form.get('localCenterId')),
                  inputCategory: 'fertilizer',
                  distributorId: String(form.get('distributorId')).trim(),
                  priority: 1,
                }).then(() => undefined),
              )
            }}
          >
            <label>
              {t.adminSeasons}
              <select name="seasonId" required defaultValue={seasons[0]?.id ?? ''}>
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>{season.name}</option>
                ))}
              </select>
            </label>
            <label>
              {t.adminCenters}
              <select name="localCenterId" required defaultValue={centers[0]?.id ?? ''}>
                {centers.map((center) => (
                  <option key={center.id} value={center.id}>{center.name}</option>
                ))}
              </select>
            </label>
            <label>{t.adminDistributors}<input name="distributorId" required /></label>
            <button className="admin__submit" type="submit">{t.adminSave}</button>
          </form>
        </Dialog>
      ) : null}
      {assignment ? (
        <Dialog title={t.adminUpdateAssignment} closeLabel={t.adminClose} onClose={close}>
          {error ? <p className="admin__error">{error}</p> : null}
          <form
            className="admin__form"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault()
              const form = new FormData(event.currentTarget)
              void save(() =>
                adminWrite(`/admin/distributor-assignments/${assignment.id}`, 'PATCH', {
                  distributorId: String(form.get('distributorId') ?? '').trim(),
                  priority: 1,
                }).then(() => undefined),
              )
            }}
          >
            <label>{t.adminDistributors}<input name="distributorId" required defaultValue={assignment.distributorId} /></label>
            <button className="admin__submit" type="submit">{t.adminSave}</button>
          </form>
        </Dialog>
      ) : null}
    </>
  )
}
