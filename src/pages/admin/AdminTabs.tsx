import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function AdminTabs() {
  const { t } = useTranslation()
  return (
    <div>
      <div className="admin-panel-label">{t('admin.panelLabel')}</div>
      <div className="admin-tabs">
        <NavLink to="/admin/brands" className={({ isActive }) => `admin-tab ${isActive ? 'is-active' : ''}`}>
          {t('admin.brandsTab')}
        </NavLink>
        <NavLink to="/admin/regions" className={({ isActive }) => `admin-tab ${isActive ? 'is-active' : ''}`}>
          {t('admin.regionsTab')}
        </NavLink>
        <NavLink to="/admin/docs" className={({ isActive }) => `admin-tab ${isActive ? 'is-active' : ''}`}>
          {t('admin.docsTab')}
        </NavLink>
      </div>
    </div>
  )
}

