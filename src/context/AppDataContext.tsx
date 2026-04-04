import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { defaultAppData } from '@/data/mock';
import {
  type AppDataSection,
  createEmptySupabaseConfig,
  disconnectSupabaseClient,
  getSupabaseConnectionErrorMessage,
  getSupabaseProjectRef,
  hasSupabaseCredentials,
  initializeSupabaseClient,
  saveSupabaseSection,
  seedSupabaseSections,
  subscribeToSupabase,
} from '@/lib/supabase';
import { normalizeAppData } from '@/lib/workflow';
import type { AppDataState, AppSettings, SupabaseConfig, User } from '@/types';

interface SupabaseStatus {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  lastSync: string | null;
  projectRef: string | null;
}

interface AppDataContextValue {
  appData: AppDataState;
  supabaseConfig: SupabaseConfig;
  supabaseStatus: SupabaseStatus;
  updateCurrentUser: (updates: Partial<User>) => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  replaceSection: <K extends AppDataSection>(section: K, value: AppDataState[K]) => Promise<void>;
  connectSupabase: (config: SupabaseConfig) => Promise<void>;
  disconnectSupabase: () => Promise<void>;
  pushCurrentDataToSupabase: () => Promise<void>;
}

const LOCAL_DATA_STORAGE_KEY = 'serviceflow-hub-app-data-v3';
const SUPABASE_CONFIG_STORAGE_KEY = 'serviceflow-hub-supabase-config-v1';

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

function loadStoredSupabaseConfig() {
  if (typeof window === 'undefined') {
    return createEmptySupabaseConfig();
  }

  return safeParse<SupabaseConfig>(
    window.localStorage.getItem(SUPABASE_CONFIG_STORAGE_KEY),
    createEmptySupabaseConfig(),
  );
}

function createSyncTimestamp() {
  return new Date().toLocaleString();
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [appData, setAppData] = useState<AppDataState>(loadStoredAppData);
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(loadStoredSupabaseConfig);
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseStatus>({
    connected: false,
    connecting: false,
    error: null,
    lastSync: null,
    projectRef: null,
  });

  const supabaseRef = useRef<SupabaseClient | null>(null);
  const unsubscribeRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LOCAL_DATA_STORAGE_KEY, JSON.stringify(appData));
    }
  }, [appData]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SUPABASE_CONFIG_STORAGE_KEY, JSON.stringify(supabaseConfig));
    }
  }, [supabaseConfig]);

  useEffect(() => {
    if (!hasSupabaseCredentials(supabaseConfig)) {
      return;
    }

    void connectSupabase(supabaseConfig, true);

    return () => {
      void unsubscribeRef.current?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function writeRemoteSection<K extends AppDataSection>(section: K, value: AppDataState[K]) {
    if (!supabaseRef.current) {
      return;
    }

    await saveSupabaseSection(supabaseRef.current, supabaseConfig, section, value);
    setSupabaseStatus((prev) => ({
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

  async function connectSupabase(nextConfig: SupabaseConfig, silent = false) {
    setSupabaseStatus((prev) => ({
      ...prev,
      connecting: true,
      error: null,
    }));

    try {
      await unsubscribeRef.current?.();

      const { client, config } = await initializeSupabaseClient(nextConfig);
      const seededData = await seedSupabaseSections(client, config, appData);
      const normalizedSeededData = normalizeAppData(seededData);

      supabaseRef.current = client;
      setAppData(normalizedSeededData);
      setSupabaseConfig(config);

      unsubscribeRef.current = subscribeToSupabase(client, config, (section, value) => {
        setAppData((prev) =>
          normalizeAppData({
            ...prev,
            [section]: value,
          }),
        );

        setSupabaseStatus((prev) => ({
          ...prev,
          lastSync: createSyncTimestamp(),
        }));
      });

      setSupabaseStatus({
        connected: true,
        connecting: false,
        error: null,
        lastSync: createSyncTimestamp(),
        projectRef: getSupabaseProjectRef(config.url),
      });
    } catch (error) {
      supabaseRef.current = null;
      unsubscribeRef.current = null;

      setSupabaseStatus({
        connected: false,
        connecting: false,
        error: getSupabaseConnectionErrorMessage(error, nextConfig),
        lastSync: null,
        projectRef: null,
      });

      if (!silent) {
        throw new Error(getSupabaseConnectionErrorMessage(error, nextConfig));
      }
    }
  }

  async function disconnectSupabase() {
    await unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    supabaseRef.current = null;
    await disconnectSupabaseClient();

    setSupabaseStatus({
      connected: false,
      connecting: false,
      error: null,
      lastSync: null,
      projectRef: null,
    });
  }

  async function pushCurrentDataToSupabase() {
    if (!supabaseRef.current) {
      throw new Error('Supabase is not connected yet.');
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
      await saveSupabaseSection(supabaseRef.current, supabaseConfig, section, appData[section]);
    }

    setSupabaseStatus((prev) => ({
      ...prev,
      error: null,
      lastSync: createSyncTimestamp(),
    }));
  }

  return (
    <AppDataContext.Provider
      value={{
        appData,
        supabaseConfig,
        supabaseStatus,
        updateCurrentUser,
        updateSettings,
        replaceSection,
        connectSupabase,
        disconnectSupabase,
        pushCurrentDataToSupabase,
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
