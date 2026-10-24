import { useEffect, useState, type FormEvent } from 'react'
import { useLang } from '@/shared/i18n/LangContext'
import { loadCatalog, loadSeasons, type CatalogItem, type SeasonRow } from '../api'
import { AdminFrame } from '../components/AdminFrame'
import { StepUpForm } from '../components/StepUpForm'
import { iso, problem } from '../text'
import { adminWrite } from '../write'

export function AllocationsPage() {
  const { t } = useLang()
  const [query, setQuery] = useState('')
  const [seasons, setSeasons] = useState<SeasonRow[]>([])
  const [seasonId, setSeasonId] = useState('')
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadSeasons()
      .then((page) => {
        if (cancelled) return
        setSeasons(page.items)
        const open = page.items.find((season) => season.status === 'open') ?? page.items[0]
        if (open) setSeasonId((current) => current || open.id)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(problem(err, t.errorGeneric))
      })
    return () => {
      cancelled = true
    }
  }, [t.errorGeneric])

  useEffect(() => {
    if (!seasonId) return
    let cancelled = false
    loadCatalog(seasonId)
      .then((rows) => {
        if (!cancelled) setCatalog(rows)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(problem(err, t.errorGeneric))
      })
    return () => {
      cancelled = true
    }
  }, [seasonId, t.errorGeneric])

  async function save(work: () => Promise<string | void>) {
    setError(null)
    setNote(null)
    try {
      setNote((await work()) || t.adminSaved)
    } catch (err) {
      setError(problem(err, t.errorGeneric))
    }
  }

  return (
    <AdminFrame
      eyebrow={t.adminEyebrow}
      title={t.adminAllocations}
      hint={t.adminAllocationsHint}
      query={query}
      onQuery={setQuery}
      extra={
        <label className="admin__season-wrap">
          {t.adminSeasons}
          <select className="admin__season" value={seasonId} onChange={(event) => setSeasonId(event.target.value)}>
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>{season.name}</option>
            ))}
          </select>
        </label>
      }
    >
      {error ? <p className="admin__error">{error}</p> : null}
      {note ? <p className="admin__note">{note}</p> : null}
      <section className="admin__card"><StepUpForm /></section>
      <div className="admin__split">
        <section className="admin__card">
          <form
            className="admin__form"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault()
              const form = new FormData(event.currentTarget)
              void save(async () => {
                const created = await adminWrite<{ id: string }>('/admin/allocation-rules', 'POST', {
                  seasonId,
                  inputId: String(form.get('inputId')),
                  regionId: String(form.get('regionId') ?? '').trim() || undefined,
                  rateKgPerHa: Number(form.get('rateKgPerHa')),
                  minKg: Number(form.get('minKg')),
                  maxHa: Number(form.get('maxHa')),
                  maxKgPerFarmer: Number(form.get('maxKgPerFarmer')),
                  cropFilter: String(form.get('cropFilter') ?? '').trim() || undefined,
                  effectiveFrom: iso(String(form.get('effectiveFrom') ?? '')),
                })
                return `${t.adminSaved} ${created.id}`
              })
            }}
          >
            <h2>{t.adminCreateRule}</h2>
            <label>
              {t.adminCreateInput}
              <select name="inputId" required defaultValue={catalog[0]?.id ?? ''}>
                {catalog.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}
              </select>
            </label>
            <label>{t.adminColRegion}<input name="regionId" /></label>
            <label>{t.adminRate}<input name="rateKgPerHa" type="number" min={0} required /></label>
            <label>{t.adminMinKg}<input name="minKg" type="number" min={0} required /></label>
            <label>{t.adminMaxHa}<input name="maxHa" type="number" min={0} step="0.0001" required /></label>
            <label>{t.adminMaxKg}<input name="maxKgPerFarmer" type="number" min={0} required /></label>
            <label>{t.adminCrop}<input name="cropFilter" /></label>
            <label>{t.adminFrom}<input name="effectiveFrom" type="datetime-local" required /></label>
            <button className="admin__submit" type="submit">{t.adminSave}</button>
          </form>
        </section>
        <section className="admin__card">
          <form className="admin__form" onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            const ruleId = String(new FormData(event.currentTarget).get('ruleId') ?? '').trim()
            void save(() => adminWrite(`/admin/allocation-rules/${ruleId}/approve`, 'POST', {}).then(() => undefined))
          }}>
            <h2>{t.adminApproveRule}</h2>
            <label>{t.adminRuleId}<input name="ruleId" required /></label>
            <button className="admin__submit" type="submit">{t.adminSave}</button>
          </form>
          <form className="admin__form" onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            const ruleId = String(new FormData(event.currentTarget).get('ruleId') ?? '').trim()
            void save(() => adminWrite('/admin/allocations/generate', 'POST', { ruleId }).then(() => undefined))
          }}>
            <h2>{t.adminGenerate}</h2>
            <label>{t.adminRuleId}<input name="ruleId" required /></label>
            <button className="admin__submit" type="submit">{t.adminSave}</button>
          </form>
          <form className="admin__form" onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            void save(() => adminWrite('/admin/allocations/adjustments', 'POST', {
              farmerId: String(form.get('farmerId') ?? '').trim(),
              seasonId,
              inputId: String(form.get('inputId')),
              entitledKg: Number(form.get('entitledKg')),
              reason: String(form.get('reason') ?? '').trim(),
            }).then(() => undefined))
          }}>
            <h2>{t.adminAdjust}</h2>
            <label>{t.adminFarmerId}<input name="farmerId" required /></label>
            <label>
              {t.adminCreateInput}
              <select name="inputId" required defaultValue={catalog[0]?.id ?? ''}>
                {catalog.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}
              </select>
            </label>
            <label>{t.adminEntitled}<input name="entitledKg" type="number" min={0} required /></label>
            <label>{t.adminReason}<input name="reason" required /></label>
            <button className="admin__submit" type="submit">{t.adminSave}</button>
          </form>
        </section>
      </div>
    </AdminFrame>
  )
}
