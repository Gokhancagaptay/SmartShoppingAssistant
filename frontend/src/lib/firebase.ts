import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

function getOrCreateApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApps()[0]!
  }
  return initializeApp(firebaseConfig)
}

// Guard: don't initialize Firebase at build time when env vars are absent
const app: FirebaseApp = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  ? getOrCreateApp()
  : (null as unknown as FirebaseApp)

const auth: Auth = app ? getAuth(app) : (null as unknown as Auth)

export { app, auth }
export default app
