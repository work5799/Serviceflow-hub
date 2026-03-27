import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import type { AppDataState, FirebaseConfig } from '@/types';

export const FIREBASE_REQUIRED_FIELDS: Array<keyof FirebaseConfig> = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
];

export const APP_DATA_SECTIONS = [
  'currentUser',
  'teamMembers',
  'projects',
  'sales',
  'services',
  'teams',
  'notifications',
  'settings',
] as const;

export type AppDataSection = typeof APP_DATA_SECTIONS[number];

const FIRESTORE_ROOT_COLLECTION = 'serviceflowHub';

let activeApp: FirebaseApp | null = null;
let activeDb: Firestore | null = null;
let activeConfigKey = '';

export function createEmptyFirebaseConfig(): FirebaseConfig {
  return {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
    measurementId: '',
    databaseURL: '',
  };
}

export function hasFirebaseCredentials(config: FirebaseConfig) {
  return FIREBASE_REQUIRED_FIELDS.every((field) => config[field]?.trim());
}

export function getMissingFirebaseFields(config: FirebaseConfig) {
  return FIREBASE_REQUIRED_FIELDS.filter((field) => !config[field]?.trim());
}

function getConfigKey(config: FirebaseConfig) {
  return FIREBASE_REQUIRED_FIELDS.map((field) => config[field]?.trim() ?? '').join('|');
}

export async function initializeFirebaseClient(config: FirebaseConfig) {
  if (!hasFirebaseCredentials(config)) {
    throw new Error(`Missing Firebase fields: ${getMissingFirebaseFields(config).join(', ')}`);
  }

  const normalizedConfig = {
    apiKey: config.apiKey.trim(),
    authDomain: config.authDomain.trim(),
    projectId: config.projectId.trim(),
    storageBucket: config.storageBucket.trim(),
    messagingSenderId: config.messagingSenderId.trim(),
    appId: config.appId.trim(),
    measurementId: config.measurementId?.trim() || undefined,
    databaseURL: config.databaseURL?.trim() || undefined,
  };

  const nextConfigKey = getConfigKey(normalizedConfig);

  if (activeApp && activeDb && activeConfigKey === nextConfigKey) {
    return { app: activeApp, db: activeDb };
  }

  if (activeApp) {
    await deleteApp(activeApp).catch(() => undefined);
  }

  activeApp = initializeApp(normalizedConfig, `serviceflow-hub-${normalizedConfig.projectId}`);
  activeDb = getFirestore(activeApp);
  activeConfigKey = nextConfigKey;

  return { app: activeApp, db: activeDb };
}

export async function disconnectFirebaseClient() {
  if (activeApp) {
    await deleteApp(activeApp).catch(() => undefined);
  }

  activeApp = null;
  activeDb = null;
  activeConfigKey = '';
}

export async function seedFirestoreCollections(db: Firestore, data: AppDataState) {
  const seededState = {} as AppDataState;

  for (const section of APP_DATA_SECTIONS) {
    const sectionRef = doc(db, FIRESTORE_ROOT_COLLECTION, section);
    const snapshot = await getDoc(sectionRef);

    if (snapshot.exists() && snapshot.data()?.value !== undefined) {
      seededState[section] = snapshot.data().value as AppDataState[typeof section];
      continue;
    }

    await setDoc(sectionRef, {
      value: data[section],
      updatedAt: serverTimestamp(),
    });

    seededState[section] = data[section];
  }

  return seededState;
}

export async function saveFirestoreSection<K extends AppDataSection>(db: Firestore, section: K, value: AppDataState[K]) {
  await setDoc(
    doc(db, FIRESTORE_ROOT_COLLECTION, section),
    {
      value,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export function subscribeToFirestore(
  db: Firestore,
  onSectionChange: <K extends AppDataSection>(section: K, value: AppDataState[K]) => void,
) {
  const unsubscribers = APP_DATA_SECTIONS.map((section) =>
    onSnapshot(doc(db, FIRESTORE_ROOT_COLLECTION, section), (snapshot) => {
      const value = snapshot.data()?.value;

      if (value !== undefined) {
        onSectionChange(section, value as AppDataState[typeof section]);
      }
    }),
  );

  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
}
