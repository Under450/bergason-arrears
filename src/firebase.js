import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyBvkD-azpDQwUY8W5YpxwvsNWZ9rezpT1Y",
  authDomain: "bergason-block-management.firebaseapp.com",
  projectId: "bergason-block-management",
  storageBucket: "bergason-block-management.firebasestorage.app",
  messagingSenderId: "911922183470",
  appId: "1:911922183470:web:947d372c13cc3a2a1ecebf",
  measurementId: "G-2CSPY8P88D"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
