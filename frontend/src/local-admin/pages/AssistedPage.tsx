import { useEffect, useState, type FormEvent } from 'react'
import { useLang } from '@/shared/i18n/LangContext'
import { loadFarmers, loadInputOptions, loadSeasonOptions, localWrite, type FarmerRow, type NamedOption } from '../api'
import { LocalFrame } from '../components/LocalFrame'
import { problem } from '../text'

export function AssistedPage() {
  const { t } = useLang()
  const [query, setQuery] = useState('')
  const [farmers, setFarmers] = useState<FarmerRow[]>([])
  const [seasons, setSeasons] = useState<NamedOption[]>([])
  const [inputs, setInputs] = useState<NamedOption[]>([])
  const [farmerId, setFarmerId] = useState('')
  const [seasonId, setSeasonId] = useState('')
  const [inputId, setInputId] = useState('')
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [pending, setPending] = useState<{ farmerId: string; seasonId: string; inputId: string; qtyKg: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    void Promise.all([loadFarmers('verified').catch(() => ({ items: [] as FarmerRow[] })), loadSeasonOptions().catch(() => [])]).then(
      ([farmerPage, seasonRows]) => {
        const verified = farmerPage.items.filter((row) => row.status === 'verified')
        setFarmers(verified)
        setFarmerId(verified[0]?.id ?? '')
        setSeasons(seasonRows)
        setSeasonId(seasonRows[0]?.id ?? '')
      },
    )
  }, [])

  useEffect(() => {
    if (!seasonId) return
    void loadInputOptions(seasonId)
      .then((rows) => {
        setInputs(rows)
        setInputId(rows[0]?.id ?? '')
      })
      .catch(() => {
        setInputs([])
        setInputId('')
      })
  }, [seasonId])

  async function run(work: () => Promise<void>) {
    setError(null)
    setNote(null)
    try {
      await work()
    } catch (err) {
      setError(problem(err, t.errorGeneric))
    }
  }

  return (
    <LocalFrame title={t.localAssisted} hint={t.localAssistedHint} query={query} onQuery={setQuery}>
      {error ? <p className="admin__error" role="alert">{error}</p> : null}
      {note ? <p className="admin__note">{note}</p> : null}
      <section className="admin__card">
        <form
          className="admin__form"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            const qtyKg = Number(new FormData(event.currentTarget).get('qtyKg'))
            const body = {
              farmerId,
              seasonId,
              items: [{ inputId, qtyKg }],
            }
            void run(async () => {
              const started = await localWrite<{ id: string }>('/local-admin/input-requests', 'POST', body)
              setChallengeId(started.id)
              setPending({ farmerId: body.farmerId, seasonId, inputId: body.items[0].inputId, qtyKg: body.items[0].qtyKg })
              setNote(t.localSmsCode)
            })
          }}
        >
          <label>
            {t.localFarmer}
            <select required value={farmerId} onChange={(event) => setFarmerId(event.target.value)}>
              {farmers.map((row) => (
                <option key={row.id} value={row.id}>{row.fullName}</option>
              ))}
            </select>
          </label>
          <label>
            {t.adminSeasons}
            <select required value={seasonId} onChange={(event) => setSeasonId(event.target.value)}>
              {seasons.map((row) => (
                <option key={row.id} value={row.id}>{row.label}</option>
              ))}
            </select>
          </label>
          <label>
            {t.localInput}
            <select required value={inputId} onChange={(event) => setInputId(event.target.value)}>
              {inputs.map((row) => (
                <option key={row.id} value={row.id}>{row.label}</option>
              ))}
            </select>
          </label>
          <label>
            {t.localQty}
            <input name="qtyKg" type="number" min={1} required />
          </label>
          <button className="admin__submit" type="submit">{t.adminSave}</button>
        </form>
        {challengeId && pending ? (
          <form
            className="admin__form"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault()
              const code = String(new FormData(event.currentTarget).get('code') ?? '').trim()
              void run(async () => {
                await localWrite(`/local-admin/input-requests/${challengeId}/confirm`, 'POST', {
                  farmerId: pending.farmerId,
                  seasonId: pending.seasonId,
                  items: [{ inputId: pending.inputId, qtyKg: pending.qtyKg }],
                  code,
                })
                setChallengeId(null)
                setPending(null)
                setNote(t.localSaved)
              })
            }}
          >
            <label>
              {t.localSmsCode}
              <input name="code" inputMode="numeric" autoComplete="one-time-code" minLength={6} maxLength={6} required />
            </label>
            <button className="admin__submit" type="submit">{t.localVerifyPickup}</button>
          </form>
        ) : null}
      </section>
    </LocalFrame>
  )
}
