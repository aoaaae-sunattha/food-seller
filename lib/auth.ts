import GoogleProvider from 'next-auth/providers/google'
import type { NextAuthOptions } from 'next-auth'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at // Unix seconds
        return token
      }

      // Still valid (with 60s buffer)
      if (Date.now() < ((token.expiresAt as number) * 1000 - 60_000)) {
        return token
      }

      // Refresh expired token
      try {
        if (!token.refreshToken) {
          console.warn('--- Auth Debug: No refresh token available! User must sign out and sign in again. ---')
          throw new Error('No refresh token')
        }

        console.log('--- Auth Debug: Attempting token refresh ---')
        const res = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            grant_type: 'refresh_token',
            refresh_token: token.refreshToken as string,
          }),
        })
        
        const refreshed = await res.json()
        if (!res.ok) {
          console.error('--- Auth Debug: Google Token Refresh Error ---', JSON.stringify(refreshed, null, 2))
          throw refreshed
        }

        console.log('--- Auth Debug: Token refreshed successfully ---')
        return {
          ...token,
          accessToken: refreshed.access_token,
          expiresAt: Math.floor(Date.now() / 1000) + refreshed.expires_in,
        }
      } catch (err: any) {
        console.error('Token refresh failed detailed:', err.message || err.error || JSON.stringify(err))
        return { ...token, error: 'RefreshAccessTokenError' }
      }
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken
      if (token.error) (session as any).error = token.error
      return session
    },
  },
}
