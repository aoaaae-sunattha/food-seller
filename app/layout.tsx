import type { Metadata } from 'next'
import { Inter, Noto_Sans_Thai } from 'next/font/google'
import './globals.css'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import SessionProviderWrapper from '@/components/SessionProviderWrapper'
import NavBar from '@/components/NavBar'
import CommonDatalists from '@/components/CommonDatalists'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const notoThai = Noto_Sans_Thai({ subsets: ['thai'], variable: '--font-noto-thai' })

export const metadata: Metadata = {
  title: 'Siam Manager — Professional Kitchen OS',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  return (
    <html lang="th" className={`${inter.variable} ${notoThai.variable}`}>
      <body className="bg-background text-foreground min-h-screen font-sans antialiased flex overflow-x-hidden">
        <SessionProviderWrapper session={session}>
          <NavBar />
          <main className="flex-1 lg:ml-[240px] md:ml-[80px] p-6 lg:p-10 transition-all duration-300 min-h-screen">
            <div className="max-w-[1600px] mx-auto">
              {children}
            </div>
          </main>
          <CommonDatalists />
        </SessionProviderWrapper>
      </body>
    </html>
  )
}
