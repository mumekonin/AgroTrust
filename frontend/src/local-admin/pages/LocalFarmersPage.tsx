import { useEffect, useState, type FormEvent } from 'react'
import { useLang } from '@/shared/i18n/LangContext'
import { Dialog } from '@/shared/ui/Dialog'
import { createFarmer, loadCenterOptions, loadFarmers, verifyFarmer, type FarmerRow, type NamedOption } from '../api'
import { LocalFrame } from '../components/LocalFrame'
import { matches, problem } from '../text'

const FILTERS = ['', 'pending_verification', 'unlinked', 'verified', 'suspended'] as const

function statusLabel(status: string, t: ReturnType<typeof useLang>['t']): string {
  if (status === 'pending_verification') return t.localPending
  if (status === 'unlinked') return t.localUnlinked
  if (status === 'verified') return t.localVerified
  if (status === 'suspended') return t.localSuspended
  return status
}

function filterLabel(value: string, t: ReturnType<typeof useLang>['t']): string {
  return value ? statusLabel(value, t) : t.localAll
}

export function LocalFarmersPage() {
  const { t } = useLang()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('')
  const [rows, setRows] = useState<FarmerRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const [centers, setCenters] = useState<NamedOption[]>([])
  const [centerId, setCenterId] = useState('')
  const [formKey, setFormKey] = useState(0)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadFarmers(filter || undefined)
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
  }, [filter, tick, t.errorGeneric])

  useEffect(() => {
    void loadCenterOptions()
      .then((rows) => {
        setCenters(rows)
        setCenterId((current) => current || rows[0]?.id || '')
      })
      .catch(() => setCenters([]))
  }, [])

  const visible = (rows ?? []).filter((row) =>
    matches(query.trim().toLowerCase(), row.fullName, row.registryId, statusLabel(row.status, t)),
  )

  async function save(work: () => Promise<void>) {
    setError(null)
    setNote(null)
    try {
      await work()
      setNote(t.localSaved)
      setCreating(false)
      setTick((value) => value + 1)
    } catch (err) {
      setError(problem(err, t.errorGeneric))
    }
  }

  return (
    <LocalFrame
      title={t.localFarmers}
      hint={t.localFarmersHint}
      query={query}
      onQuery={setQuery}
      extra={
        <div className="admin__filters" role="group" aria-label={t.localStatus}>
          {FILTERS.map((value) => (
            <button
              key={value || 'all'}
              type="button"
              className={filter === value ? 'is-selected' : undefined}
              onClick={() => setFilter(value)}
            >
              {filterLabel(value, t)}
            </button>
          ))}
        </div>
      }
    >
      {error ? (
        <p className="admin__error" role="alert">
          {error}
        </p>
      ) : null}
      {note ? <p className="admin__note">{note}</p> : null}
      {rows === null ? <p className="admin__empty">{t.farmerLoading}</p> : null}
      <div className="admin__toolbar">
        <button type="button" className="admin__submit" onClick={() => setCreating(true)}>
          {t.adminAdd}
        </button>
      </div>
      <section className="admin__card">
        {rows?.length === 0 ? <p className="admin__empty">{t.localEmpty}</p> : null}
        <div className="admin__table-wrap">
          <table className="admin__table">
            <thead>
              <tr>
                <th>{t.localName}</th>
                <th>{t.localRegistry}</th>
                <th>{t.localStatus}</th>
                <th>{t.localLand}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id}>
                  <td className="admin__strong">{row.fullName}</td>
                  <td>{row.registryId}</td>
                  <td>{statusLabel(row.status, t)}</td>
                  <td>{row.landHoldingHa}</td>
                  <td>
                    {row.status === 'unlinked' || row.status === 'pending_verification' ? (
                      <button
                        type="button"
                        className="admin__text-btn"
                        onClick={() =>
                          void save(async () => {
                            await verifyFarmer(row.id)
                          })
                        }
                      >
                        {t.localVerify}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {creating ? (
        <Dialog title={t.localRegister} closeLabel={t.adminClose} onClose={() => setCreating(false)}>
        <form
          className="admin__form"
          key={formKey}
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            if (!centerId) {
              setError(t.adminChoosePlace)
              return
            }
            const form = new FormData(event.currentTarget)
            void save(async () => {
              await createFarmer({
                registryId: String(form.get('registryId') ?? '').trim(),
                fullName: String(form.get('fullName') ?? '').trim(),
                phone: String(form.get('phone') ?? '').trim(),
                localCenterId: centerId,
                landHoldingHa: Number(form.get('landHoldingHa')),
              })
              setFormKey((value) => value + 1)
            })
          }}
        >
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
            {t.adminCenters}
            <select value={centerId} onChange={(event) => setCenterId(event.target.value)} required>
              <option value="">{t.adminSelect}</option>
              {centers.map((center) => (
                <option key={center.id} value={center.id}>
                  {center.label}
                </option>
              ))}
            </select>
          </label>
          <button className="admin__submit" type="submit">
            {t.adminSave}
          </button>
        </form>
        </Dialog>
      ) : null}
    </LocalFrame>
  )
}
