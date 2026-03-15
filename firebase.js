import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore'

// TODO: Replace with your Firebase project config
// Get this from Firebase Console → Project Settings → Your apps → Web app
const firebaseConfig = {
  apiKey: "AIzaSyC8ENluqmdz7bk42f8efVihB9-DiA62LJE",
  authDomain: "fluxy-website.firebaseapp.com",
  projectId: "fluxy-website",
  storageBucket: "fluxy-website.firebasestorage.app",
  messagingSenderId: "471803197342",
  appId: "1:471803197342:web:7d3f7280b16a1e65d3088f",
  measurementId: "G-531QF6VWXE"
};

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

export async function submitWaitlistEntry({ name, contactType, contactValue }) {
  const docRef = await addDoc(collection(db, 'waitlist'), {
    name: name.trim(),
    contactType,
    [contactType]: contactValue.trim(),
    createdAt: serverTimestamp(),
  })
  return docRef.id
}
