import { useState, type FormEvent } from 'react'
import { useLang } from '@/shared/i18n/LangContext'
import { problem, splitIds } from '../text'
import { adminWrite } from '../write'
import { StepUpForm } from './StepUpForm'

export function CenterActions({ onSaved }: { onSaved: () => void }) {
  const { t } = useLang()
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  async function save(work: () => Promise<void>) {
    setError(null)
    setNote(null)
    try {
      await work()
      setNote(t.adminSaved)
      onSaved()
    } catch (err) {
      setError(problem(err, t.errorGeneric))
    }
  }

  return (
    <div className="admin__split">
      <section className="admin__card">
        <StepUpForm />
        {error ? <p className="admin__error">{error}</p> : null}
        {note ? <p className="admin__note">{note}</p> : null}
        <form className="admin__form" onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          void save(() => adminWrite('/admin/local-centers', 'POST', {
            code: String(form.get('code') ?? '').trim(),
            name: String(form.get('name') ?? '').trim(),
            geo: {
              regionId: String(form.get('regionId') ?? '').trim(),
              zoneId: String(form.get('zoneId') ?? '').trim(),
              woredaId: String(form.get('woredaId') ?? '').trim(),
              kebeleId: String(form.get('kebeleId') ?? '').trim(),
            },
            location: {
              type: 'Point',
              coordinates: [Number(form.get('lng')), Number(form.get('lat'))],
            },
            address: String(form.get('address') ?? '').trim(),
            openingHours: String(form.get('openingHours') ?? '').trim(),
            servesKebeleIds: splitIds(String(form.get('servesKebeleIds') ?? '')) ?? [],
            capacityKg: String(form.get('capacityKg') ?? '') ? Number(form.get('capacityKg')) : undefined,
            status: 'active',
          }).then(() => undefined))
        }}>
          <h2>{t.adminCreateCenter}</h2>
          <label>{t.adminCode}<input name="code" required /></label>
          <label>{t.adminCenters}<input name="name" required /></label>
          <label>{t.adminColRegion}<input name="regionId" required /></label>
          <label>{t.adminZone}<input name="zoneId" required /></label>
          <label>{t.adminWoreda}<input name="woredaId" required /></label>
          <label>{t.adminKebele}<input name="kebeleId" required /></label>
          <label>{t.adminLongitude}<input name="lng" type="number" step="any" required /></label>
          <label>{t.adminLatitude}<input name="lat" type="number" step="any" required /></label>
          <label>{t.adminAddress}<input name="address" required /></label>
          <label>{t.adminHours}<input name="openingHours" required /></label>
          <label>{t.adminKebelesIds}<input name="servesKebeleIds" required /></label>
          <label>{t.adminCapacity}<input name="capacityKg" type="number" min={1} /></label>
          <button className="admin__submit" type="submit">{t.adminSave}</button>
        </form>
      </section>
      <section className="admin__card">
        <form className="admin__form" onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          const id = String(form.get('id') ?? '').trim()
          void save(() => adminWrite(`/admin/local-centers/${id}`, 'PATCH', {
            name: String(form.get('name') ?? '').trim() || undefined,
            address: String(form.get('address') ?? '').trim() || undefined,
            openingHours: String(form.get('openingHours') ?? '').trim() || undefined,
            status: String(form.get('status')),
            capacityKg: String(form.get('capacityKg') ?? '') ? Number(form.get('capacityKg')) : undefined,
          }).then(() => undefined))
        }}>
          <h2>{t.adminUpdateCenter}</h2>
          <label>{t.adminRecord}<input name="id" required /></label>
          <label>{t.adminCenters}<input name="name" /></label>
          <label>{t.adminAddress}<input name="address" /></label>
          <label>{t.adminHours}<input name="openingHours" /></label>
          <label>{t.adminCapacity}<input name="capacityKg" type="number" min={1} /></label>
          <label>
            {t.adminStatus}
            <select name="status" defaultValue="active">
              <option value="active">{t.adminActive}</option>
              <option value="suspended">{t.adminSuspended}</option>
            </select>
          </label>
          <button className="admin__submit" type="submit">{t.adminSave}</button>
        </form>
      </section>
    </div>
  )
}
