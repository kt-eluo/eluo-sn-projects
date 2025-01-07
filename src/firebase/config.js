import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
    apiKey: "AIzaSyDjO2H3_eD9dZsRPsKhnEtJlfjwAi1UjVU",
    authDomain: "eluo-sn-project-dd82e.firebaseapp.com",
    projectId: "eluo-sn-project-dd82e",
    storageBucket: "eluo-sn-project-dd82e.firebasestorage.app",
    messagingSenderId: "182525558463",
    appId: "1:182525558463:web:b32a3a782cee89ec7ad00a",
    measurementId: "G-VPRB1NHJPB"
}

// Firebase 초기화
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0]
const auth = getAuth(app)
const db = getFirestore(app)
const storage = getStorage(app)

export { app, auth, db, storage } 