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
      <body className="bg-gray-50 min-h-screen">
        <SessionProviderWrapper session={session}>
          <header className="flex items-center justify-between px-4 py-3 bg-white border-b">
            <span className="font-bold text-lg">🍜 ร้านอาหาร</span>
            <LanguageSelector />
          </header>
          <main className="pb-24 px-4 py-4 max-w-2xl mx-auto">
            {children}
          </main>
          <NavBar />
        </SessionProviderWrapper>
      </body>
    </html>
  )
}
