import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  doc,
  getDoc,
  initializeFirestore,
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
let activeTransportMode: 'auto' | 'long-polling' = 'auto';

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

export function getFirestoreActivationUrl(projectId: string) {
  return `https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=${projectId.trim()}`;
}

export function getFirestoreDatabaseSetupUrl(projectId: string) {
  return `https://console.cloud.google.com/datastore/setup?project=${projectId.trim()}`;
}

export function isFirestoreOfflineError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes('client is offline') ||
    message.includes('failed to get document because the client is offline') ||
    message.includes('offline')
  );
}

export function getFirebaseConnectionErrorMessage(error: unknown, retriedWithLongPolling = false) {
  if (!(error instanceof Error)) {
    return 'Unable to connect to Firebase.';
  }

  if (isFirestoreOfflineError(error)) {
    return retriedWithLongPolling
      ? 'Firestore is still unreachable after retrying with long-polling. Check your internet/firewall, and make sure a Firestore database has been created in this Firebase project.'
      : 'Firestore could not reach the server. Retrying with long-polling...';
  }

  return error.message;
}

export async function probeFirestoreAvailability(config: FirebaseConfig) {
  if (typeof fetch === 'undefined' || !config.projectId.trim() || !config.apiKey.trim()) {
    return null;
  }

  try {
    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${config.projectId.trim()}/databases/(default)/documents/${FIRESTORE_ROOT_COLLECTION}/settings?key=${config.apiKey.trim()}`,
    );

    if (response.ok) {
      return null;
    }

    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string; details?: Array<{ reason?: string }> } }
      | null;
    const errorMessage = payload?.error?.message?.toLowerCase() ?? '';

    const serviceDisabled =
      payload?.error?.details?.some((detail) => detail.reason === 'SERVICE_DISABLED') ||
      errorMessage.includes('cloud firestore api has not been used') ||
      errorMessage.includes('service_disabled');

    const databaseMissing =
      response.status === 404 &&
      (errorMessage.includes('database (default) does not exist') ||
        errorMessage.includes('please visit https://console.cloud.google.com/datastore/setup'));

    if (serviceDisabled) {
      return `Cloud Firestore API is disabled for project ${config.projectId.trim()}. Enable it here: ${getFirestoreActivationUrl(config.projectId)} . Wait a minute, then retry.`;
    }

    if (databaseMissing) {
      return `Firestore database is not created yet for project ${config.projectId.trim()}. Create it here: ${getFirestoreDatabaseSetupUrl(config.projectId)} . After the database is created, retry Firebase connect.`;
    }

    return null;
  } catch {
    return null;
  }
}

function getConfigKey(config: FirebaseConfig) {
  return FIREBASE_REQUIRED_FIELDS.map((field) => config[field]?.trim() ?? '').join('|');
}

export async function initializeFirebaseClient(
  config: FirebaseConfig,
  options?: { forceLongPolling?: boolean },
) {
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
  const nextTransportMode = options?.forceLongPolling ? 'long-polling' : 'auto';

  if (
    activeApp &&
    activeDb &&
    activeConfigKey === nextConfigKey &&
    activeTransportMode === nextTransportMode
  ) {
    return { app: activeApp, db: activeDb };
  }

  if (activeApp) {
    await deleteApp(activeApp).catch(() => undefined);
  }

  activeApp = initializeApp(normalizedConfig, `serviceflow-hub-${normalizedConfig.projectId}`);
  activeDb = initializeFirestore(activeApp, {
    experimentalAutoDetectLongPolling: nextTransportMode === 'auto',
    experimentalForceLongPolling: nextTransportMode === 'long-polling',
  });
  activeConfigKey = nextConfigKey;
  activeTransportMode = nextTransportMode;

  return { app: activeApp, db: activeDb };
}

export async function disconnectFirebaseClient() {
  if (activeApp) {
    await deleteApp(activeApp).catch(() => undefined);
  }

  activeApp = null;
  activeDb = null;
  activeConfigKey = '';
  activeTransportMode = 'auto';
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
