import Providers from "./providers"
import './globals.css'
import { ThemeProvider } from '@/context/ThemeContext'

export default function RootLayout({ children }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head />
      <body>
        <ThemeProvider>
          <Providers>
            <main className="min-h-screen">
              {children}
            </main>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
} 