import { useState, type FormEvent } from 'react'
import { useLang } from '@/shared/i18n/LangContext'
import { AdminFrame } from '../components/AdminFrame'
import { StepUpForm } from '../components/StepUpForm'
import { problem, splitIds } from '../text'
import { adminWrite } from '../write'

export function InvitationsPage() {
  const { t } = useLang()
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)

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
    <AdminFrame eyebrow={t.adminEyebrow} title={t.adminInvitations} hint={t.adminInvitationsHint} query={query} onQuery={setQuery}>
      {error ? <p className="admin__error">{error}</p> : null}
      {note ? <p className="admin__note">{note}</p> : null}
      {token ? (
        <p className="admin__note">
          {t.adminCodeOnce} <strong>{token}</strong>
        </p>
      ) : null}
      <div className="admin__split">
        <section className="admin__card">
          <StepUpForm />
          <form
            className="admin__form"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault()
              const form = new FormData(event.currentTarget)
              void save(async () => {
                const created = await adminWrite<{ id: string; status: string; token?: string }>('/admin/invitations', 'POST', {
                  role: String(form.get('role')),
                  email: String(form.get('email') ?? '').trim() || undefined,
                  phone: String(form.get('phone') ?? '').trim() || undefined,
                  regionIds: splitIds(String(form.get('regionIds') ?? '')),
                  localCenterIds: splitIds(String(form.get('localCenterIds') ?? '')),
                  distributorId: String(form.get('distributorId') ?? '').trim() || undefined,
                })
                if (created.token) setToken(created.token)
                return `${t.adminSaved} ${created.id} · ${created.status}`
              })
            }}
          >
            <h2>{t.adminInvite}</h2>
            <label>
              {t.adminRole}
              <select name="role" defaultValue="local_admin">
                <option value="local_admin">local_admin</option>
                <option value="distributor_staff">distributor_staff</option>
                <option value="regional_admin">regional_admin</option>
                <option value="national_admin">national_admin</option>
                <option value="auditor">auditor</option>
              </select>
            </label>
            <label>{t.adminEmail}<input name="email" type="email" /></label>
            <label>{t.adminPhone}<input name="phone" required /></label>
            <label>{t.adminRegionsServed}<input name="regionIds" /></label>
            <label>{t.adminCenters}<input name="localCenterIds" /></label>
            <label>{t.adminDistributors}<input name="distributorId" /></label>
            <button className="admin__submit" type="submit">{t.adminSave}</button>
          </form>
        </section>
        <section className="admin__card">
          <form className="admin__form" onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            const id = String(new FormData(event.currentTarget).get('id') ?? '').trim()
            void save(async () => {
              const approved = await adminWrite<{ token?: string }>(`/admin/invitations/${id}/approve`, 'POST', {})
              if (approved.token) setToken(approved.token)
            })
          }}>
            <h2>{t.adminApproveInvite}</h2>
            <label>{t.adminInvitationId}<input name="id" required /></label>
            <button className="admin__submit" type="submit">{t.adminSave}</button>
          </form>
          <form className="admin__form" onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault()
            const id = String(new FormData(event.currentTarget).get('id') ?? '').trim()
            void save(() => adminWrite(`/admin/invitations/${id}/revoke`, 'POST', {}).then(() => undefined))
          }}>
            <h2>{t.adminRevokeInvite}</h2>
            <label>{t.adminInvitationId}<input name="id" required /></label>
            <button className="admin__submit" type="submit">{t.adminSave}</button>
          </form>
        </section>
      </div>
    </AdminFrame>
  )
}
