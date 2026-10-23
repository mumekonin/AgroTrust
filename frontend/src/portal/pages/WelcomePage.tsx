import { useLang } from '@/shared/i18n/LangContext'
import { FactBadge } from '../components/FactBadge'
import { PortalCard } from '../components/PortalCard'
import './WelcomePage.css'

export function WelcomePage() {
  const { t } = useLang()

  const portals = [
    {
      id: 'portal-farmer',
      icon: '🌱',
      title: t.portalFarmerTitle,
      desc: t.portalFarmerDesc,
      accent: 'var(--color-farmer)',
    },
    {
      id: 'portal-local-admin',
      icon: '🏛️',
      title: t.portalLocalAdminTitle,
      desc: t.portalLocalAdminDesc,
      accent: 'var(--color-local-admin)',
    },
    {
      id: 'portal-distributor',
      icon: '🚛',
      title: t.portalDistributorTitle,
      desc: t.portalDistributorDesc,
      accent: 'var(--color-distributor)',
    },
    {
      id: 'portal-national-admin',
      icon: '📊',
      title: t.portalAdminTitle,
      desc: t.portalAdminDesc,
      accent: 'var(--color-national-admin)',
    },
  ]

  return (
    <div className="welcome">
      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="welcome__hero" aria-labelledby="welcome-headline">
        <div className="welcome__hero-badge">
          <span className="welcome__leaf" aria-hidden="true">🌿</span>
          <span>{t.pilotLine}</span>
        </div>

        <h1 id="welcome-headline" className="welcome__headline">
          {t.headline}
        </h1>

        <p className="welcome__tagline">{t.tagline}</p>

        {/* ── Three facts ──────────────────────────────────────── */}
        <div className="welcome__facts" role="list" aria-label="Pilot statistics">
          <div role="listitem">
            <FactBadge value={t.fact1Value} label={t.fact1Label} />
          </div>
          <div role="listitem">
            <FactBadge value={t.fact2Value} label={t.fact2Label} />
          </div>
          <div role="listitem">
            <FactBadge value={t.fact3Value} label={t.fact3Label} />
          </div>
        </div>
      </section>

      {/* ── Portal chooser ─────────────────────────────────────── */}
      <section className="welcome__portals" aria-labelledby="portal-heading">
        <h2 id="portal-heading" className="welcome__section-heading">
          {t.choosePortal}
        </h2>

        <div className="welcome__portal-grid">
          {portals.map((p) => (
            <PortalCard
              key={p.id}
              id={p.id}
              icon={p.icon}
              title={p.title}
              description={p.desc}
              accent={p.accent}
            />
          ))}
        </div>

        <p className="welcome__note">
          <span className="welcome__note-icon" aria-hidden="true">ℹ️</span>
          {t.newFarmerNote}
        </p>
      </section>
    </div>
  )
}
