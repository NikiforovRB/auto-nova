import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <span>{t('footer.copyright')}</span>
        <Link to="/privacy" className="footer-link">
          {t('footer.privacy')}
        </Link>
        <Link to="/personal-data" className="footer-link">
          {t('footer.personalData')}
        </Link>
        <a
          href="https://ansara.ru/"
          className="footer-link footer-link-right"
          target="_blank"
          rel="noreferrer"
        >
          {t('footer.madeBy')}
        </a>
      </div>
    </footer>
  )
}

