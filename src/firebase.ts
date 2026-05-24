import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

let db: any;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
  }, (firebaseConfig as any).firestoreDatabaseId);
} catch (error) {
  console.warn("Failed to initialize Firestore with persistentLocalCache, falling back to standard client:", error);
  db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
}

export { db };
