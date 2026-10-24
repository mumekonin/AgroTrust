import { useState, type FormEvent } from 'react'
import { useLang } from '@/shared/i18n/LangContext'
import type { CatalogItem, SeasonRow } from '../api'
import { iso, problem, santim } from '../text'
import { adminWrite } from '../write'
import { StepUpForm } from './StepUpForm'

export function SeasonActions({
  season,
  catalog,
  onSaved,
}: {
  season?: SeasonRow
  catalog: CatalogItem[]
  onSaved: () => void
}) {
  const { t } = useLang()
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function run(work: () => Promise<string | void>) {
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      const message = await work()
      setNote(message || t.adminSaved)
      onSaved()
    } catch (err) {
      setError(problem(err, t.errorGeneric))
    } finally {
      setBusy(false)
    }
  }

  function seasonBody(form: FormData, requirePolicy: boolean) {
    return {
      code: String(form.get('code') ?? '').trim(),
      name: String(form.get('name') ?? '').trim(),
      startsAt: iso(String(form.get('startsAt') ?? '')),
      endsAt: iso(String(form.get('endsAt') ?? '')),
      requestsOpenAt: iso(String(form.get('requestsOpenAt') ?? '')),
      requestsCloseAt: iso(String(form.get('requestsCloseAt') ?? '')),
      requisitionCutoffAt: iso(String(form.get('requisitionCutoffAt') ?? '')),
      paymentWindowDays: Number(form.get('paymentWindowDays')),
      pickupWindowDays: Number(form.get('pickupWindowDays')),
      priorityPolicy: String(form.get('priorityPolicy') || (requirePolicy ? 'FCFS' : 'FCFS')),
      status: String(form.get('status') || 'draft'),
    }
  }

  return (
    <div className="admin__split">
      <section className="admin__card">
        <StepUpForm />
        {error ? <p className="admin__error">{error}</p> : null}
        {note ? <p className="admin__note">{note}</p> : null}
        <form
          className="admin__form"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            void run(() => adminWrite('/admin/seasons', 'POST', seasonBody(form, false)).then(() => undefined))
          }}
        >
          <h2>{t.adminCreateSeason}</h2>
          <SeasonFields />
          <button className="admin__submit" type="submit" disabled={busy}>{t.adminSave}</button>
        </form>
        {season ? (
          <form
            className="admin__form"
            key={season.id}
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault()
              const form = new FormData(event.currentTarget)
              void run(() => adminWrite(`/admin/seasons/${season.id}`, 'PUT', seasonBody(form, true)).then(() => undefined))
            }}
          >
            <h2>{t.adminReplaceSeason}</h2>
            <SeasonFields season={season} />
            <button className="admin__submit" type="submit" disabled={busy}>{t.adminSave}</button>
          </form>
        ) : null}
      </section>
      <section className="admin__card">
        <form
          className="admin__form"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            void run(() =>
              adminWrite('/admin/inputs', 'POST', {
                code: String(form.get('code') ?? '').trim(),
                name: {
                  en: String(form.get('en') ?? '').trim(),
                  am: String(form.get('am') ?? '').trim(),
                  om: String(form.get('om') ?? '').trim(),
                },
                category: String(form.get('category')),
                packSizeKg: Number(form.get('packSizeKg')),
                active: true,
              }).then(() => undefined),
            )
          }}
        >
          <h2>{t.adminCreateInput}</h2>
          <label>
            {t.adminCode}
            <input name="code" required />
          </label>
          <label>
            English
            <input name="en" required />
          </label>
          <label>
            አማርኛ
            <input name="am" required />
          </label>
          <label>
            Afaan Oromo
            <input name="om" required />
          </label>
          <label>
            {t.adminType}
            <select name="category" defaultValue="fertilizer">
              <option value="fertilizer">fertilizer</option>
              <option value="seed">seed</option>
              <option value="agrochemical">agrochemical</option>
            </select>
          </label>
          <label>
            {t.adminPack}
            <input name="packSizeKg" type="number" min={1} required />
          </label>
          <button className="admin__submit" type="submit" disabled={busy}>{t.adminSave}</button>
        </form>
        <form
          className="admin__form"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            const id = String(form.get('id') ?? '').trim()
            void run(() =>
              adminWrite(`/admin/inputs/${id}`, 'PATCH', {
                packSizeKg: Number(form.get('packSizeKg')),
                active: String(form.get('active')) === 'true',
              }).then(() => undefined),
            )
          }}
        >
          <h2>{t.adminUpdateInput}</h2>
          <label>
            {t.adminRecord}
            <select name="id" required defaultValue={catalog[0]?.id ?? ''}>
              {catalog.map((item) => (
                <option key={item.id} value={item.id}>{item.code}</option>
              ))}
            </select>
          </label>
          <label>
            {t.adminPack}
            <input name="packSizeKg" type="number" min={1} required />
          </label>
          <label>
            {t.adminStatus}
            <select name="active" defaultValue="true">
              <option value="true">{t.adminActive}</option>
              <option value="false">{t.adminSuspended}</option>
            </select>
          </label>
          <button className="admin__submit" type="submit" disabled={busy}>{t.adminSave}</button>
        </form>
        {season ? (
          <>
            <form
              className="admin__form"
              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                event.preventDefault()
                const form = new FormData(event.currentTarget)
                void run(async () => {
                  const created = await adminWrite<{ id: string }>('/admin/prices', 'PUT', {
                    inputId: String(form.get('inputId')),
                    seasonId: season.id,
                    regionId: String(form.get('regionId') ?? '').trim() || undefined,
                    unitPriceSantimPerKg: santim(String(form.get('price') ?? '0')),
                    subsidySantimPerKg: santim(String(form.get('subsidy') ?? '0')),
                    effectiveFrom: iso(String(form.get('effectiveFrom') ?? '')),
                    effectiveTo: String(form.get('effectiveTo') ?? '') ? iso(String(form.get('effectiveTo') ?? '')) : undefined,
                    reason: String(form.get('reason') ?? '').trim(),
                  })
                  return `${t.adminSaved} ${created.id}`
                })
              }}
            >
              <h2>{t.adminSetPrice}</h2>
              <label>
                {t.adminCreateInput}
                <select name="inputId" required defaultValue={catalog[0]?.id ?? ''}>
                  {catalog.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t.adminColRegion}
                <input name="regionId" />
              </label>
              <label>
                {t.adminBirr}
                <input name="price" type="number" min={0} step="0.01" required />
              </label>
              <label>
                {t.adminSubsidy}
                <input name="subsidy" type="number" min={0} step="0.01" defaultValue={0} />
              </label>
              <label>
                {t.adminFrom}
                <input name="effectiveFrom" type="datetime-local" required />
              </label>
              <label>
                {t.adminTo}
                <input name="effectiveTo" type="datetime-local" />
              </label>
              <label>
                {t.adminReason}
                <input name="reason" required />
              </label>
              <button className="admin__submit" type="submit" disabled={busy}>{t.adminSave}</button>
            </form>
            <form
              className="admin__form"
              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                event.preventDefault()
                const priceId = String(new FormData(event.currentTarget).get('priceId') ?? '')
                void run(() => adminWrite(`/admin/prices/${priceId}/approve`, 'POST', {}).then(() => undefined))
              }}
            >
              <h2>{t.adminApprovePrice}</h2>
              <label>
                {t.adminPrices}
                <select name="priceId" required defaultValue={catalog.find((item) => item.priceId)?.priceId ?? ''}>
                  {catalog.filter((item) => item.priceId).map((item) => (
                    <option key={item.priceId} value={item.priceId}>
                      {item.code}
                    </option>
                  ))}
                </select>
              </label>
              <button className="admin__submit" type="submit" disabled={busy}>{t.adminSave}</button>
            </form>
          </>
        ) : null}
      </section>
    </div>
  )
}

function SeasonFields({ season }: { season?: SeasonRow }) {
  const { t } = useLang()
  return (
    <>
      <label>
        {t.adminCode}
        <input name="code" required defaultValue={season?.code ?? ''} />
      </label>
      <label>
        {t.adminSeasons}
        <input name="name" required defaultValue={season?.name ?? ''} />
      </label>
      <label>
        {t.adminFrom}
        <input name="startsAt" type="datetime-local" required defaultValue={localValue(season?.startsAt)} />
      </label>
      <label>
        {t.adminTo}
        <input name="endsAt" type="datetime-local" required defaultValue={localValue(season?.endsAt)} />
      </label>
      <label>
        {t.adminRequestsOpen}
        <input name="requestsOpenAt" type="datetime-local" required defaultValue={localValue(season?.requestsOpenAt)} />
      </label>
      <label>
        {t.adminRequestsClose}
        <input name="requestsCloseAt" type="datetime-local" required defaultValue={localValue(season?.requestsCloseAt)} />
      </label>
      <label>
        {t.adminCutoff}
        <input name="requisitionCutoffAt" type="datetime-local" required defaultValue={localValue(season?.requisitionCutoffAt)} />
      </label>
      <label>
        {t.adminPaymentWindow}
        <input name="paymentWindowDays" type="number" min={1} required defaultValue={season?.paymentWindowDays ?? 7} />
      </label>
      <label>
        {t.adminPickupWindow}
        <input name="pickupWindowDays" type="number" min={1} required defaultValue={season?.pickupWindowDays ?? 7} />
      </label>
      <label>
        {t.adminPriority}
        <select name="priorityPolicy" defaultValue="FCFS">
          <option value="FCFS">FCFS</option>
          <option value="SMALLEST_LAND_FIRST">SMALLEST_LAND_FIRST</option>
        </select>
      </label>
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
