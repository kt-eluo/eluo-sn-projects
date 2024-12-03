'use client'

import { ThemeProvider as NextThemeProvider } from 'next-themes'
import { FirebaseProvider } from '@/context/FirebaseContext'

export default function Providers({ children }) {
  return (
    <FirebaseProvider>
      <NextThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        {children}
      </NextThemeProvider>
    </FirebaseProvider>
  )
} 