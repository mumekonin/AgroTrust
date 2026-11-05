import { useState, type FormEvent } from 'react'
import { useLang } from '@/shared/i18n/LangContext'
import { Dialog } from '@/shared/ui/Dialog'
import type { CenterRow } from '../api'
import { problem } from '../text'
import { adminWrite } from '../write'
import { StepUpForm } from './StepUpForm'

export function CenterActions({
  creating,
  editing,
  onClose,
  onSaved,
}: {
  creating: boolean
  editing: CenterRow | null
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useLang()
  const [error, setError] = useState<string | null>(null)

  async function save(work: () => Promise<void>) {
    setError(null)
    try {
      await work()
      onSaved()
      onClose()
    } catch (err) {
      setError(problem(err, t.errorGeneric))
    }
  }

  if (!creating && !editing) return null

  return (
    <Dialog title={editing ? t.adminUpdateCenter : t.adminCreateCenter} closeLabel={t.adminClose} onClose={onClose}>
      {creating ? <StepUpForm /> : null}
      {error ? <p className="admin__error">{error}</p> : null}
      {creating ? (
        <form
          className="admin__form"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            const kebeleId = String(form.get('kebeleId') ?? '').trim()
            void save(async () => {
              await adminWrite('/admin/local-centers', 'POST', {
                code: String(form.get('code') ?? '').trim(),
                name: String(form.get('name') ?? '').trim(),
                geo: {
                  regionId: String(form.get('regionId') ?? '').trim(),
                  zoneId: String(form.get('zoneId') ?? '').trim(),
                  woredaId: String(form.get('woredaId') ?? '').trim(),
                  kebeleId,
                },
                location: { type: 'Point', coordinates: [38.74, 9.03] },
                address: String(form.get('address') ?? '').trim(),
                openingHours: String(form.get('openingHours') ?? '').trim(),
                servesKebeleIds: [kebeleId],
                status: 'active',
              })
            })
          }}
        >
          <label>{t.adminCode}<input name="code" required /></label>
          <label>{t.adminCenters}<input name="name" required /></label>
          <label>{t.adminColRegion}<input name="regionId" required /></label>
          <label>{t.adminZone}<input name="zoneId" required /></label>
          <label>{t.adminWoreda}<input name="woredaId" required /></label>
          <label>{t.adminKebele}<input name="kebeleId" required /></label>
          <label>{t.adminAddress}<input name="address" required /></label>
          <label>{t.adminHours}<input name="openingHours" required /></label>
          <button className="admin__submit" type="submit">{t.adminSave}</button>
        </form>
      ) : null}
      {editing ? (
        <form
          className="admin__form"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            void save(() =>
              adminWrite(`/admin/local-centers/${editing.id}`, 'PATCH', {
                name: String(form.get('name') ?? '').trim(),
                address: String(form.get('address') ?? '').trim(),
                openingHours: String(form.get('openingHours') ?? '').trim(),
                status: String(form.get('status')),
              }).then(() => undefined),
            )
          }}
        >
          <label>{t.adminCenters}<input name="name" required defaultValue={editing.name} /></label>
          <label>{t.adminAddress}<input name="address" required defaultValue={editing.address} /></label>
          <label>{t.adminHours}<input name="openingHours" required defaultValue={editing.openingHours} /></label>
          <label>
            {t.adminStatus}
            <select name="status" defaultValue={editing.status}>
              <option value="active">{t.adminActive}</option>
              <option value="suspended">{t.adminSuspended}</option>
            </select>
          </label>
          <button className="admin__submit" type="submit">{t.adminSave}</button>
        </form>
      ) : null}
    </Dialog>
  )
}
