import type { Metadata } from 'next'
import './globals.css'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import SessionProviderWrapper from '@/components/SessionProviderWrapper'
import NavBar from '@/components/NavBar'
import LanguageSelector from '@/components/LanguageSelector'

export const metadata: Metadata = {
  title: 'ร้านอาหาร Manager',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  return (
    <html lang="th">
      <body className="bg-slate-50 text-slate-900 min-h-screen font-sans antialiased">
        <SessionProviderWrapper session={session}>
          <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-slate-200">
            <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
              <span className="font-extrabold text-xl tracking-tight text-amber-600">🍜 ร้านอาหาร</span>
              <LanguageSelector />
            </div>
          </header>
          <main className="max-w-3xl mx-auto px-6 py-8 pb-32">
            {children}
          </main>
          <NavBar />
        </SessionProviderWrapper>
      </body>
    </html>
  )
}
