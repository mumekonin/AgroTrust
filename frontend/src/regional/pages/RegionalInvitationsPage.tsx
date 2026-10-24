import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '@/shared/i18n/LangContext'
import type { Locale } from '@/shared/i18n'
import { StepUpForm } from '@/admin/components/StepUpForm'
import { problem, splitIds } from '@/admin/text'
import { adminWrite } from '@/admin/write'
import { Icon } from '@/shared/ui/Icon'
import { LanguageSwitch } from '@/shared/ui/LanguageSwitch'
import { loadCenterOptions, loadDistributorOptions, loadRegionOptions, type CenterOption, type DistributorOption, type RegionOption } from '../api'
import '@/admin/pages/NationalAdminPage.css'

function placeName(name: { en: string; am: string; om: string }, locale: Locale): string {
  return name[locale] || name.en
}

export function RegionalInvitationsPage() {
  const { locale, t } = useLang()
  const [regions, setRegions] = useState<RegionOption[]>([])
  const [centers, setCenters] = useState<CenterOption[]>([])
  const [distributors, setDistributors] = useState<DistributorOption[]>([])
  const [role, setRole] = useState('local_admin')
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [smsCode, setSmsCode] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      loadRegionOptions().catch(() => [] as RegionOption[]),
      loadCenterOptions().catch(() => [] as CenterOption[]),
      loadDistributorOptions().catch(() => [] as DistributorOption[]),
    ]).then(([regionRows, centerRows, distributorRows]) => {
      if (cancelled) return
      setRegions(regionRows)
      setCenters(centerRows)
      setDistributors(distributorRows)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function save(work: () => Promise<void>) {
    setError(null)
    setNote(null)
    setToken(null)
    setSmsCode(null)
    try {
      await work()
      setNote(t.adminSaved)
    } catch (err) {
      setError(problem(err, t.errorGeneric))
    }
  }

  return (
    <main className="admin__main">
      <div className="admin__top">
        <span />
        <LanguageSwitch tone="light" />
        <div className="admin__who">
          <span className="admin__avatar" aria-hidden>RA</span>
          <span>
            <strong>{t.regionalRoleLabel}</strong>
            <small>{t.regionalOversight}</small>
          </span>
        </div>
      </div>
      <header className="admin__head">
        <div>
          <p className="admin__eyebrow">{t.regionalEyebrow}</p>
          <h1 className="admin__title">{t.regionalTitle}</h1>
          <p className="admin__hint">{t.regionalHint}</p>
        </div>
      </header>
      {error ? <p className="admin__error" role="alert">{error}</p> : null}
      {note ? <p className="admin__note">{note}</p> : null}
      {token ? (
        <p className="admin__note">
          {t.adminCodeOnce} <strong>{token}</strong>
        </p>
      ) : null}
      {smsCode ? (
        <p className="admin__note">
          {t.inviteCodeShown} <strong>{smsCode}</strong>
        </p>
      ) : null}
      {regions.length === 0 || (role === 'local_admin' && centers.length === 0) ? (
        <p className="admin__empty">{t.regionalEmptyPlaces}</p>
      ) : null}
      <section className="admin__card">
        <StepUpForm />
        <form
          className="admin__form"
          key={`${regions[0]?.id ?? ''}:${centers[0]?.id ?? ''}:${distributors[0]?.id ?? ''}`}
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            const picked = String(form.get('role'))
            void save(async () => {
              const created = await adminWrite<{ token?: string; code?: string }>('/admin/invitations', 'POST', {
                role: picked,
                email: String(form.get('email') ?? '').trim() || undefined,
                phone: String(form.get('phone') ?? '').trim(),
                regionIds: splitIds(String(form.get('regionId') ?? '')),
                localCenterIds: picked === 'local_admin' ? splitIds(String(form.get('localCenterId') ?? '')) : undefined,
                distributorId: picked === 'distributor_staff' ? String(form.get('distributorId') ?? '').trim() || undefined : undefined,
              })
              if (created.token) setToken(created.token)
              if (created.code) setSmsCode(created.code)
            })
          }}
        >
          <h2>{t.adminInvite}</h2>
          <label>
            {t.adminRole}
            <select name="role" value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="local_admin">local_admin</option>
              <option value="distributor_staff">distributor_staff</option>
            </select>
          </label>
          <label>
            {t.adminEmail}
            <input name="email" type="email" required={role === 'distributor_staff'} />
          </label>
          <label>
            {t.adminPhone}
            <input name="phone" required />
          </label>
          <label>
            {t.regionalRegion}
            <select name="regionId" required defaultValue={regions[0]?.id ?? ''}>
              {regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.code} · {placeName(region.name, locale)}
                </option>
              ))}
            </select>
          </label>
          {role === 'local_admin' ? (
            <label>
              {t.regionalCenter}
              <select name="localCenterId" required defaultValue={centers[0]?.id ?? ''}>
                {centers.map((center) => (
                  <option key={center.id} value={center.id}>
                    {center.code} · {center.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label>
              {t.regionalDistributor}
              <select name="distributorId" required defaultValue={distributors[0]?.id ?? ''}>
                {distributors.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.code} · {row.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button className="admin__submit" type="submit">{t.adminSave}</button>
        </form>
      </section>
      <p className="admin__hint">
        <Icon name="sms" size="sm" /> {t.inviteHave} <Link to="/auth/accept">{t.inviteAcceptTitle}</Link>
      </p>
    </main>
  )
}
