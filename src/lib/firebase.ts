import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

export const firebaseConfig = {
  apiKey: "AIzaSyCwQwhDSWovCW-014xIqh8w61XMxTU5Fzk",
  authDomain: "pomo-f1093.firebaseapp.com",
  projectId: "pomo-f1093",
  storageBucket: "pomo-f1093.firebasestorage.app",
  messagingSenderId: "1072582087109",
  appId: "1:1072582087109:web:466d89293400be2161fbac"
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
