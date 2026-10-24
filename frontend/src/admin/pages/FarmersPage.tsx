import { useEffect, useState, type FormEvent } from 'react'
import { useLang } from '@/shared/i18n/LangContext'
import { loadCenters, loadFarmers, loadGeo, loadRegions, type CenterRow, type FarmerRow, type GeoRow } from '../api'
import { AdminFrame } from '../components/AdminFrame'
import { StepUpForm } from '../components/StepUpForm'
import { localized, matches, problem } from '../text'
import { adminWrite } from '../write'

export function FarmersPage() {
  const { locale, t } = useLang()
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<FarmerRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [code, setCode] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const [regions, setRegions] = useState<GeoRow[]>([])
  const [zones, setZones] = useState<GeoRow[]>([])
  const [woredas, setWoredas] = useState<GeoRow[]>([])
  const [kebeles, setKebeles] = useState<GeoRow[]>([])
  const [centers, setCenters] = useState<CenterRow[]>([])
  const [regionId, setRegionId] = useState('')
  const [zoneId, setZoneId] = useState('')
  const [woredaId, setWoredaId] = useState('')
  const [kebeleId, setKebeleId] = useState('')
  const [centerId, setCenterId] = useState('')
  const [formKey, setFormKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    loadFarmers()
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
  }, [tick, t.errorGeneric])

  useEffect(() => {
    void Promise.all([loadRegions().catch(() => ({ items: [] as GeoRow[] })), loadCenters().catch(() => ({ items: [] as CenterRow[] }))]).then(
      ([placePage, centerPage]) => {
        setRegions(placePage.items)
        setCenters(centerPage.items)
      },
    )
  }, [])

  useEffect(() => {
    if (!regionId) return
    let cancelled = false
    loadGeo(regionId)
      .then((page) => {
        if (cancelled) return
        setZones(page.items)
        if (page.items.length === 1) setZoneId(page.items[0].id)
      })
      .catch(() => {
        if (!cancelled) setZones([])
      })
    return () => {
      cancelled = true
    }
  }, [regionId])

  useEffect(() => {
    if (!zoneId) return
    let cancelled = false
    loadGeo(zoneId)
      .then((page) => {
        if (cancelled) return
        setWoredas(page.items)
        if (page.items.length === 1) setWoredaId(page.items[0].id)
      })
      .catch(() => {
        if (!cancelled) setWoredas([])
      })
    return () => {
      cancelled = true
    }
  }, [zoneId])

  useEffect(() => {
    if (!woredaId) return
    let cancelled = false
    loadGeo(woredaId)
      .then((page) => {
        if (cancelled) return
        setKebeles(page.items)
        if (page.items.length === 1) setKebeleId(page.items[0].id)
      })
      .catch(() => {
        if (!cancelled) setKebeles([])
      })
    return () => {
      cancelled = true
    }
  }, [woredaId])

  const visible = (rows ?? []).filter((row) => matches(query.trim().toLowerCase(), row.fullName, row.registryId, row.status))
  const centerChoices = centers.filter((center) => !regionId || center.regionId === regionId)
  const centerValue = centerChoices.some((center) => center.id === centerId)
    ? centerId
    : centerChoices.length === 1
      ? centerChoices[0].id
      : ''

  function chooseRegion(id: string) {
    setRegionId(id)
    setZoneId('')
    setWoredaId('')
    setKebeleId('')
    setCenterId('')
    setZones([])
    setWoredas([])
    setKebeles([])
  }

  function chooseZone(id: string) {
    setZoneId(id)
    setWoredaId('')
    setKebeleId('')
    setWoredas([])
    setKebeles([])
  }

  function chooseWoreda(id: string) {
    setWoredaId(id)
    setKebeleId('')
    setKebeles([])
  }

  async function save(work: () => Promise<string | void>) {
    setError(null)
    setNote(null)
    try {
      setNote((await work()) || t.adminSaved)
      setTick((value) => value + 1)
    } catch (err) {
      setError(problem(err, t.errorGeneric))
    }
  }

  return (
    <AdminFrame eyebrow={t.adminEyebrow} title={t.adminFarmers} hint={t.adminFarmersHint} query={query} onQuery={setQuery}>
      {error ? <p className="admin__error">{error}</p> : null}
      {note ? <p className="admin__note">{note}</p> : null}
      {code ? (
        <p className="admin__note">
          {t.adminCodeOnce} <strong>{code}</strong>
        </p>
      ) : null}
      <section className="admin__card">
        {rows?.length === 0 ? <p className="admin__empty">{t.adminEmpty}</p> : null}
        <div className="admin__table-wrap">
          <table className="admin__table">
            <thead>
              <tr>
                <th>{t.adminFarmers}</th>
                <th>{t.adminId}</th>
                <th>{t.adminCode}</th>
                <th>{t.adminStatus}</th>
                <th>{t.adminLand}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id}>
                  <td className="admin__strong">{row.fullName}</td>
                  <td>{row.id}</td>
                  <td>{row.registryId}</td>
                  <td>{row.status}</td>
                  <td>{row.landHoldingHa}</td>
                  <td>
                    <button type="button" className="admin__text-btn" onClick={() => void save(() => adminWrite(`/local-admin/farmers/${row.id}/verify`, 'PATCH').then(() => undefined))}>
                      {t.adminVerify}
                    </button>
                    {row.status === 'verified' && !row.hasAccount ? (
                      <button
                        type="button"
                        className="admin__text-btn"
                        onClick={() =>
                          void save(async () => {
                            const issued = await adminWrite<{ activationCode: string }>(`/local-admin/farmers/${row.id}/activation-code`, 'POST', {})
                            setCode(issued.activationCode)
                          })
                        }
                      >
                        {t.adminIssueCode}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="admin__card">
        <StepUpForm />
        <form
          className="admin__form"
          key={formKey}
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            if (!regionId || !zoneId || !woredaId || !kebeleId || !centerValue) {
              setError(t.adminChoosePlace)
              return
            }
            const form = new FormData(event.currentTarget)
            const crop = String(form.get('crop') ?? '').trim()
            void save(async () => {
              const report = await adminWrite<{ accepted: number; errors: { message: string }[] }>('/admin/farmers/import', 'POST', {
                dryRun: false,
                farmers: [
                  {
                    registryId: String(form.get('registryId') ?? '').trim(),
                    fullName: String(form.get('fullName') ?? '').trim(),
                    phone: String(form.get('phone') ?? '').trim(),
                    geo: { regionId, zoneId, woredaId, kebeleId },
                    localCenterId: centerValue,
                    landHoldingHa: Number(form.get('landHoldingHa')),
                    crops: crop ? [crop] : undefined,
                  },
                ],
              })
              setFormKey((value) => value + 1)
              const detail = report.errors.map((item) => item.message).join('; ')
              return detail ? `${t.adminSaved} ${report.accepted} · ${detail}` : `${t.adminSaved} ${report.accepted}`
            })
          }}
        >
          <h2>{t.adminImport}</h2>
          <div className="admin__split">
            <div>
              <label>
                {t.adminFullName}
                <input name="fullName" required />
              </label>
              <label>
                {t.adminRegistryNo}
                <input name="registryId" required />
              </label>
              <label>
                {t.adminPhone}
                <input name="phone" type="tel" required />
              </label>
              <label>
                {t.adminLand}
                <input name="landHoldingHa" type="number" min={0} step="0.01" required />
              </label>
              <label>
                {t.adminCropName}
                <input name="crop" />
              </label>
            </div>
            <div>
              <label>
                {t.adminColRegion}
                <select value={regionId} onChange={(event) => chooseRegion(event.target.value)} required>
                  <option value="">{t.adminSelect}</option>
                  {regions.map((place) => (
                    <option key={place.id} value={place.id}>
                      {place.code} · {localized(place.name, locale)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t.adminPlaceZone}
                <select value={zoneId} onChange={(event) => chooseZone(event.target.value)} required>
                  <option value="">{t.adminSelect}</option>
                  {zones.map((place) => (
                    <option key={place.id} value={place.id}>
                      {place.code} · {localized(place.name, locale)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t.adminPlaceWoreda}
                <select value={woredaId} onChange={(event) => chooseWoreda(event.target.value)} required>
                  <option value="">{t.adminSelect}</option>
                  {woredas.map((place) => (
                    <option key={place.id} value={place.id}>
                      {place.code} · {localized(place.name, locale)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t.adminPlaceKebele}
                <select value={kebeleId} onChange={(event) => setKebeleId(event.target.value)} required>
                  <option value="">{t.adminSelect}</option>
                  {kebeles.map((place) => (
                    <option key={place.id} value={place.id}>
                      {place.code} · {localized(place.name, locale)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t.adminCenters}
                <select value={centerValue} onChange={(event) => setCenterId(event.target.value)} required>
                  <option value="">{t.adminSelect}</option>
                  {centerChoices.map((center) => (
                    <option key={center.id} value={center.id}>
                      {center.code} · {center.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <button className="admin__submit" type="submit">{t.adminSave}</button>
        </form>
      </section>
    </AdminFrame>
  )
}
