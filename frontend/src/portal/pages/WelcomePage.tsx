import { useLang } from '@/shared/i18n/LangContext'
import { LanguageSwitch } from '@/shared/ui/LanguageSwitch'
import { Icon } from '@/shared/ui/Icon'
import { FactBadge } from '../components/FactBadge'
import { PortalCard } from '../components/PortalCard'
import './WelcomePage.css'

export function WelcomePage() {
  const { t, locale } = useLang()

  const portals = [
    {
      id: 'portal-farmer',
      icon: 'agriculture',
      title: t.portalFarmerTitle,
      desc: t.portalFarmerDesc,
      to: '/auth/farmer',
    },
    {
      id: 'portal-local-admin',
      icon: 'person',
      title: t.portalLocalAdminTitle,
      desc: t.portalLocalAdminDesc,
      to: '/auth/staff',
    },
    {
      id: 'portal-distributor',
      icon: 'local_shipping',
      title: t.portalDistributorTitle,
      desc: t.portalDistributorDesc,
      to: '/auth/staff',
    },
    {
      id: 'portal-national-admin',
      icon: 'account_balance',
      title: t.portalAdminTitle,
      desc: t.portalAdminDesc,
      to: '/auth/staff',
    },
  ]

  return (
    <div className="welcome" lang={locale}>
      <section className="welcome__brand" aria-labelledby="welcome-headline">
        <div className="welcome__brand-top">
          <span className="welcome__mark" aria-hidden="true">
            <Icon name="eco" size="md" fill />
          </span>
          <span className="welcome__name">{t.appName}</span>
        </div>

        <div className="welcome__brand-copy">
          <h1 id="welcome-headline" className="welcome__headline">
            {t.headline}
          </h1>
          <p className="welcome__tagline">{t.tagline}</p>
          <div className="welcome__facts" role="list">
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
        </div>

        <p className="welcome__pilot">
          <Icon name="radio_button_unchecked" size="sm" />
          <span>{t.pilotLine}</span>
        </p>
      </section>

      <section className="welcome__chooser" aria-labelledby="portal-heading">
        <div className="welcome__chooser-bar">
          <LanguageSwitch tone="light" />
        </div>

        <div className="welcome__chooser-body">
          <p className="welcome__eyebrow">{t.welcomeEyebrow}</p>
          <h2 id="portal-heading" className="welcome__section-heading">
            {t.choosePortal}
          </h2>
          <p className="welcome__hint">{t.signInHint}</p>

          <div className="welcome__portal-list">
            {portals.map((portal) => (
              <PortalCard
                key={portal.id}
                id={portal.id}
                icon={portal.icon}
                title={portal.title}
                description={portal.desc}
                to={portal.to}
                tone="light"
              />
            ))}
          </div>

          <p className="welcome__note">{t.newFarmerNote}</p>
        </div>
      </section>
    </div>
  )
}
