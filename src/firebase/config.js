import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
    apiKey: "AIzaSyDNVAbkDLcnQ59QcocuMBX0-bSPDZTx5l8",
    authDomain: "eluo-sn-project.firebaseapp.com",
    projectId: "eluo-sn-project",
    storageBucket: "eluo-sn-project.firebasestorage.app",
    messagingSenderId: "859923593463",
    appId: "1:859923593463:web:0983eeb7b0826ff0f3fbf2",
    measurementId: "G-DCFFF91S5M"
}

// Firebase 초기화
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0]
const auth = getAuth(app)
const db = getFirestore(app)
const storage = getStorage(app)

export { app, auth, db, storage } 