import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Firestore } from 'firebase/firestore';
import { defaultAppData } from '@/data/mock';
import {
  type AppDataSection,
  createEmptyFirebaseConfig,
  disconnectFirebaseClient,
  hasFirebaseCredentials,
  initializeFirebaseClient,
  saveFirestoreSection,
  seedFirestoreCollections,
  subscribeToFirestore,
} from '@/lib/firebase';
import { normalizeAppData } from '@/lib/workflow';
import type { AppDataState, AppSettings, FirebaseConfig, User } from '@/types';

interface FirebaseStatus {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  lastSync: string | null;
  projectId: string | null;
}

interface AppDataContextValue {
  appData: AppDataState;
  firebaseConfig: FirebaseConfig;
  firebaseStatus: FirebaseStatus;
  updateCurrentUser: (updates: Partial<User>) => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  replaceSection: <K extends AppDataSection>(section: K, value: AppDataState[K]) => Promise<void>;
  connectFirebase: (config: FirebaseConfig) => Promise<void>;
  disconnectFirebase: () => Promise<void>;
  pushCurrentDataToFirebase: () => Promise<void>;
}

const LOCAL_DATA_STORAGE_KEY = 'serviceflow-hub-app-data-v3';
const FIREBASE_CONFIG_STORAGE_KEY = 'serviceflow-hub-firebase-config-v2';

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

function safeParse<T>(value: string | null, fallback: T) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function loadStoredAppData() {
  if (typeof window === 'undefined') {
    return normalizeAppData(defaultAppData);
  }

  return normalizeAppData(
    safeParse<AppDataState>(window.localStorage.getItem(LOCAL_DATA_STORAGE_KEY), defaultAppData),
  );
}

function loadStoredFirebaseConfig() {
  if (typeof window === 'undefined') {
    return createEmptyFirebaseConfig();
  }

  return safeParse<FirebaseConfig>(
    window.localStorage.getItem(FIREBASE_CONFIG_STORAGE_KEY),
    createEmptyFirebaseConfig(),
  );
}

function createSyncTimestamp() {
  return new Date().toLocaleString();
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [appData, setAppData] = useState<AppDataState>(loadStoredAppData);
  const [firebaseConfig, setFirebaseConfig] = useState<FirebaseConfig>(loadStoredFirebaseConfig);
  const [firebaseStatus, setFirebaseStatus] = useState<FirebaseStatus>({
    connected: false,
    connecting: false,
    error: null,
    lastSync: null,
    projectId: null,
  });

  const firestoreRef = useRef<Firestore | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LOCAL_DATA_STORAGE_KEY, JSON.stringify(appData));
    }
  }, [appData]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(FIREBASE_CONFIG_STORAGE_KEY, JSON.stringify(firebaseConfig));
    }
  }, [firebaseConfig]);

  useEffect(() => {
    if (!hasFirebaseCredentials(firebaseConfig)) {
      return;
    }

    void connectFirebase(firebaseConfig, true);

    return () => {
      unsubscribeRef.current?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function writeRemoteSection<K extends AppDataSection>(section: K, value: AppDataState[K]) {
    if (!firestoreRef.current) {
      return;
    }

    await saveFirestoreSection(firestoreRef.current, section, value);
    setFirebaseStatus((prev) => ({
      ...prev,
      error: null,
      lastSync: createSyncTimestamp(),
    }));
  }

  async function replaceSection<K extends AppDataSection>(section: K, value: AppDataState[K]) {
    setAppData((prev) => ({
      ...prev,
      [section]: value,
    }));

    await writeRemoteSection(section, value);
  }

  async function updateCurrentUser(updates: Partial<User>) {
    const nextCurrentUser = {
      ...appData.currentUser,
      ...updates,
    };

    const nextTeamMembers = appData.teamMembers.map((member) =>
      member.id === nextCurrentUser.id ? { ...member, ...updates } : member,
    );

    setAppData((prev) => ({
      ...prev,
      currentUser: nextCurrentUser,
      teamMembers: nextTeamMembers,
    }));

    await Promise.all([
      writeRemoteSection('currentUser', nextCurrentUser),
      writeRemoteSection('teamMembers', nextTeamMembers),
    ]);
  }

  async function updateSettings(updates: Partial<AppSettings>) {
    const nextSettings = {
      ...appData.settings,
      ...updates,
    };

    await replaceSection('settings', nextSettings);
  }

  async function connectFirebase(nextConfig: FirebaseConfig, silent = false) {
    setFirebaseStatus((prev) => ({
      ...prev,
      connecting: true,
      error: null,
    }));

    try {
      unsubscribeRef.current?.();

      const { db } = await initializeFirebaseClient(nextConfig);
      const seededData = await seedFirestoreCollections(db, appData);
      const normalizedSeededData = normalizeAppData(seededData);

      firestoreRef.current = db;
      setAppData(normalizedSeededData);
      setFirebaseConfig(nextConfig);

      unsubscribeRef.current = subscribeToFirestore(db, (section, value) => {
        setAppData((prev) =>
          normalizeAppData({
            ...prev,
            [section]: value,
          }),
        );

        setFirebaseStatus((prev) => ({
          ...prev,
          lastSync: createSyncTimestamp(),
        }));
      });

      setFirebaseStatus({
        connected: true,
        connecting: false,
        error: null,
        lastSync: createSyncTimestamp(),
        projectId: nextConfig.projectId.trim(),
      });
    } catch (error) {
      firestoreRef.current = null;
      unsubscribeRef.current = null;

      setFirebaseStatus({
        connected: false,
        connecting: false,
        error: error instanceof Error ? error.message : 'Unable to connect to Firebase.',
        lastSync: null,
        projectId: null,
      });

      if (!silent) {
        throw error;
      }
    }
  }

  async function disconnectFirebase() {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    firestoreRef.current = null;
    await disconnectFirebaseClient();

    setFirebaseStatus({
      connected: false,
      connecting: false,
      error: null,
      lastSync: null,
      projectId: null,
    });
  }

  async function pushCurrentDataToFirebase() {
    if (!firestoreRef.current) {
      throw new Error('Firebase is not connected yet.');
    }

    const sections: AppDataSection[] = [
      'currentUser',
      'teamMembers',
      'projects',
      'sales',
      'services',
      'teams',
      'notifications',
      'settings',
    ];

    for (const section of sections) {
      await saveFirestoreSection(firestoreRef.current, section, appData[section]);
    }

    setFirebaseStatus((prev) => ({
      ...prev,
      error: null,
      lastSync: createSyncTimestamp(),
    }));
  }

  return (
    <AppDataContext.Provider
      value={{
        appData,
        firebaseConfig,
        firebaseStatus,
        updateCurrentUser,
        updateSettings,
        replaceSection,
        connectFirebase,
        disconnectFirebase,
        pushCurrentDataToFirebase,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);

  if (!context) {
    throw new Error('useAppData must be used within AppDataProvider');
  }

  return context;
}
