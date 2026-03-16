import type { ReactNode } from 'react'

interface MainLayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="app-root">
      <div className="app-shell">{children}</div>
    </div>
  )
}

