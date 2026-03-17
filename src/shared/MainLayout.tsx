import type { ReactNode } from 'react'
import { Footer } from './Footer'

interface MainLayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="app-root">
      <div className="app-shell">
        {children}
        <Footer />
      </div>
    </div>
  )
}

