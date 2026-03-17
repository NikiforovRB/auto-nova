import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { ProfilePage } from './pages/ProfilePage'
import { AdDetailsPage } from './pages/AdDetailsPage'
import { CreateAdPage } from './pages/CreateAdPage'
import { AdminLoginPage } from './pages/AdminLoginPage'
import { AdminBrandsPage } from './pages/AdminBrandsPage'
import { AdminModelsPage } from './pages/AdminModelsPage'
import { AdminAdsPage } from './pages/AdminAdsPage'
import { BrandPage } from './pages/BrandPage'
import { AuthProvider } from './auth/AuthContext'
import { ToastProvider } from './ui/toast/ToastContext'
import { Toasts } from './ui/toast/Toasts'
import { FavoritesProvider } from './favorites/FavoritesContext'
import { FavoritesPage } from './pages/FavoritesPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { PersonalDataPolicyPage } from './pages/PersonalDataPolicyPage'
import { AdminRegionsPage } from './pages/AdminRegionsPage'
import { AdminDocsPage } from './pages/AdminDocsPage'
import { RegisterPage } from './pages/RegisterPage'
import { EditAdPage } from './pages/EditAdPage'

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <FavoritesProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/brands/:id" element={<BrandPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/favorites" element={<FavoritesPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/personal-data" element={<PersonalDataPolicyPage />} />
              <Route path="/ads/:id" element={<AdDetailsPage />} />
              <Route path="/ads/:id/edit" element={<EditAdPage />} />
              <Route path="/ads/new" element={<CreateAdPage />} />
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/admin/brands" element={<AdminBrandsPage />} />
              <Route path="/admin/regions" element={<AdminRegionsPage />} />
              <Route path="/admin/docs" element={<AdminDocsPage />} />
              <Route path="/admin/models" element={<AdminModelsPage />} />
              <Route path="/admin/ads" element={<AdminAdsPage />} />
            </Routes>
            <Toasts />
          </BrowserRouter>
        </FavoritesProvider>
      </AuthProvider>
    </ToastProvider>
  )
}

export default App
