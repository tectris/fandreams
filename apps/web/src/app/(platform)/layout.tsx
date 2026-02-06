import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { BottomNav } from '@/components/layout/bottom-nav'

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex max-w-7xl mx-auto">
        <Sidebar />
        <main className="flex-1 min-w-0 pb-20 md:pb-0">{children}</main>
      </div>
      <BottomNav />
    </div>
  )
}
