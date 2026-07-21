import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, getFirestore as getFirestoreWithDbId } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firestore with specific databaseId if provided
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestoreWithDbId(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export default app;
