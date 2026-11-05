import { useState, type FormEvent } from 'react'
import { useLang } from '@/shared/i18n/LangContext'
import { Dialog } from '@/shared/ui/Dialog'
import type { AdminPrice, CatalogItem, SeasonRow } from '../api'
import { iso, problem, santim } from '../text'
import { adminWrite } from '../write'
import { StepUpForm } from './StepUpForm'

type DialogKind = 'season' | 'season-edit' | 'input' | 'price' | 'approve' | null

export function SeasonActions({
  season,
  catalog,
  prices,
  onSaved,
}: {
  season?: SeasonRow
  catalog: CatalogItem[]
  prices: AdminPrice[]
  onSaved: () => void
}) {
  const { t } = useLang()
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [dialog, setDialog] = useState<DialogKind>(null)

  async function run(work: () => Promise<string | void>) {
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      const message = await work()
      setNote(message || t.adminSaved)
      setDialog(null)
      onSaved()
    } catch (err) {
      setError(problem(err, t.errorGeneric))
    } finally {
      setBusy(false)
    }
  }

  function seasonBody(form: FormData) {
    const startsAt = iso(String(form.get('startsAt') ?? ''))
    const endsAt = iso(String(form.get('endsAt') ?? ''))
    return {
      code: String(form.get('code') ?? '').trim(),
      name: String(form.get('name') ?? '').trim(),
      startsAt,
      endsAt,
      requestsOpenAt: startsAt,
      requestsCloseAt: endsAt,
      requisitionCutoffAt: endsAt,
      paymentWindowDays: 7,
      pickupWindowDays: 7,
      priorityPolicy: 'FCFS',
      status: String(form.get('status') || 'draft'),
    }
  }

  const pending = prices.filter((item) => !item.approved)

  return (
    <>
      {note ? <p className="admin__note">{note}</p> : null}
      <div className="admin__toolbar">
        <button type="button" className="admin__text-btn" onClick={() => setDialog('input')}>{t.adminCreateInput}</button>
        <button type="button" className="admin__text-btn" onClick={() => setDialog('price')} disabled={!season}>{t.adminSetPrice}</button>
        <button type="button" className="admin__text-btn" onClick={() => setDialog('approve')} disabled={pending.length === 0}>{t.adminApprovePrice}</button>
        {season ? (
          <button type="button" className="admin__text-btn" onClick={() => setDialog('season-edit')}>{t.adminUpdate}</button>
        ) : null}
        <button type="button" className="admin__submit" onClick={() => setDialog('season')}>{t.adminAdd}</button>
      </div>
      {dialog === 'season' || dialog === 'season-edit' ? (
        <Dialog title={dialog === 'season' ? t.adminCreateSeason : t.adminReplaceSeason} closeLabel={t.adminClose} onClose={() => setDialog(null)}>
          <StepUpForm />
          {error ? <p className="admin__error">{error}</p> : null}
          <form
            className="admin__form"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault()
              const form = new FormData(event.currentTarget)
              const body = seasonBody(form)
              void run(() =>
                dialog === 'season'
                  ? adminWrite('/admin/seasons', 'POST', body).then(() => undefined)
                  : adminWrite(`/admin/seasons/${season?.id}`, 'PUT', body).then(() => undefined),
              )
            }}
          >
            <SeasonFields season={dialog === 'season-edit' ? season : undefined} />
            <button className="admin__submit" type="submit" disabled={busy}>{t.adminSave}</button>
          </form>
        </Dialog>
      ) : null}
      {dialog === 'input' ? (
        <Dialog title={t.adminCreateInput} closeLabel={t.adminClose} onClose={() => setDialog(null)}>
          {error ? <p className="admin__error">{error}</p> : null}
          <form
            className="admin__form"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault()
              const form = new FormData(event.currentTarget)
              const name = String(form.get('en') ?? '').trim()
              void run(() =>
                adminWrite('/admin/inputs', 'POST', {
                  code: String(form.get('code') ?? '').trim(),
                  name: { en: name, am: name, om: name },
                  category: 'fertilizer',
                  packSizeKg: 50,
                  active: true,
                }).then(() => undefined),
              )
            }}
          >
            <label>{t.adminCode}<input name="code" required /></label>
            <label>{t.adminNameEn}<input name="en" required /></label>
            <button className="admin__submit" type="submit" disabled={busy}>{t.adminSave}</button>
          </form>
        </Dialog>
      ) : null}
      {dialog === 'price' && season ? (
        <Dialog title={t.adminSetPrice} closeLabel={t.adminClose} onClose={() => setDialog(null)}>
          <StepUpForm />
          {error ? <p className="admin__error">{error}</p> : null}
          <form
            className="admin__form"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault()
              const form = new FormData(event.currentTarget)
              void run(() =>
                adminWrite('/admin/prices', 'PUT', {
                  inputId: String(form.get('inputId')),
                  seasonId: season.id,
                  unitPriceSantimPerKg: santim(String(form.get('price') ?? '0')),
                  subsidySantimPerKg: santim(String(form.get('subsidy') ?? '0')),
                  effectiveFrom: iso(String(form.get('effectiveFrom') ?? '')),
                  reason: 'Official price',
                }).then(() => undefined),
              )
            }}
          >
            <label>
              {t.adminCreateInput}
              <select name="inputId" required defaultValue={catalog[0]?.id ?? ''}>
                {catalog.map((item) => (
                  <option key={item.id} value={item.id}>{item.code}</option>
                ))}
              </select>
            </label>
            <label>{t.adminBirr}<input name="price" type="number" min={0} step="0.01" required /></label>
            <label>{t.adminSubsidy}<input name="subsidy" type="number" min={0} step="0.01" defaultValue={0} /></label>
            <label>{t.adminFrom}<input name="effectiveFrom" type="datetime-local" required /></label>
            <button className="admin__submit" type="submit" disabled={busy}>{t.adminSave}</button>
          </form>
        </Dialog>
      ) : null}
      {dialog === 'approve' ? (
        <Dialog title={t.adminApprovePrice} closeLabel={t.adminClose} onClose={() => setDialog(null)}>
          {error ? <p className="admin__error">{error}</p> : null}
          <form
            className="admin__form"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault()
              const priceId = String(new FormData(event.currentTarget).get('priceId') ?? '')
              void run(() => adminWrite(`/admin/prices/${priceId}/approve`, 'POST', {}).then(() => undefined))
            }}
          >
            <label>
              {t.adminPrices}
              <select name="priceId" required defaultValue={pending[0]?.id ?? ''}>
                {pending.map((item) => (
                  <option key={item.id} value={item.id}>{item.code}</option>
                ))}
              </select>
            </label>
            <button className="admin__submit" type="submit" disabled={busy}>{t.adminSave}</button>
          </form>
        </Dialog>
      ) : null}
    </>
  )
}

function SeasonFields({ season }: { season?: SeasonRow }) {
  const { t } = useLang()
  return (
    <>
      <label>{t.adminCode}<input name="code" required defaultValue={season?.code ?? ''} /></label>
      <label>{t.adminSeasons}<input name="name" required defaultValue={season?.name ?? ''} /></label>
      <label>{t.adminFrom}<input name="startsAt" type="datetime-local" required defaultValue={localValue(season?.startsAt)} /></label>
      <label>{t.adminTo}<input name="endsAt" type="datetime-local" required defaultValue={localValue(season?.endsAt)} /></label>
      <label>
        {t.adminStatus}
        <select name="status" defaultValue={season?.status ?? 'draft'}>
          <option value="draft">{t.adminDraft}</option>
          <option value="open">{t.adminOpen}</option>
          <option value="closed">{t.adminClosed}</option>
        </select>
      </label>
    </>
  )
}

function localValue(value?: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
