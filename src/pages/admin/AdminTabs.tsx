import { NavLink } from 'react-router-dom'

export function AdminTabs() {
  return (
    <div>
      <div className="admin-panel-label">Панель администратора</div>
      <div className="admin-tabs">
        <NavLink to="/admin/brands" className={({ isActive }) => `admin-tab ${isActive ? 'is-active' : ''}`}>
          Марки автомобилей
        </NavLink>
        <NavLink to="/admin/regions" className={({ isActive }) => `admin-tab ${isActive ? 'is-active' : ''}`}>
          Регионы
        </NavLink>
        <NavLink to="/admin/docs" className={({ isActive }) => `admin-tab ${isActive ? 'is-active' : ''}`}>
          Документы
        </NavLink>
      </div>
    </div>
  )
}

