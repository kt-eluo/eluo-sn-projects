'use client'

import { createContext, useContext } from 'react'
import { auth, db, storage } from '@/firebase/config'

const FirebaseContext = createContext({
  auth: null,
  db: null,
  storage: null,
})

export function FirebaseProvider({ children }) {
  return (
    <FirebaseContext.Provider value={{ auth, db, storage }}>
      {children}
    </FirebaseContext.Provider>
  )
}

export const useFirebase = () => useContext(FirebaseContext) 