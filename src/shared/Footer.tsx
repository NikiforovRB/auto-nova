import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <span>©2026, Autonova</span>
        <Link to="/privacy" className="footer-link">
          Политика конфиденциальности
        </Link>
        <Link to="/personal-data" className="footer-link">
          Политика обработки персональных данных
        </Link>
        <a
          href="https://ansara.ru/"
          className="footer-link footer-link-right"
          target="_blank"
          rel="noreferrer"
        >
          Сделано в студии ANSARA
        </a>
      </div>
    </footer>
  )
}

