import {
  createClient,
  type RealtimeChannel,
  type SupabaseClient,
} from '@supabase/supabase-js';
import type { AppDataState, SupabaseConfig } from '@/types';

export const SUPABASE_REQUIRED_FIELDS: Array<keyof SupabaseConfig> = ['url', 'anonKey'];

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

interface SupabaseRow {
  section: AppDataSection;
  value: AppDataState[AppDataSection];
  updated_at?: string;
}

let activeClient: SupabaseClient | null = null;
let activeChannel: RealtimeChannel | null = null;
let activeConfigKey = '';

export function createEmptySupabaseConfig(): SupabaseConfig {
  return {
    url: '',
    anonKey: '',
    tableName: 'erp_app_state',
    schema: 'public',
  };
}

export function normalizeSupabaseConfig(config: SupabaseConfig): SupabaseConfig {
  return {
    url: config.url.trim(),
    anonKey: config.anonKey.trim(),
    tableName: config.tableName.trim() || 'erp_app_state',
    schema: config.schema.trim() || 'public',
  };
}

export function hasSupabaseCredentials(config: SupabaseConfig) {
  return SUPABASE_REQUIRED_FIELDS.every((field) => config[field]?.trim());
}

export function getMissingSupabaseFields(config: SupabaseConfig) {
  return SUPABASE_REQUIRED_FIELDS.filter((field) => !config[field]?.trim());
}

export function getSupabaseProjectRef(url: string) {
  try {
    return new URL(url).hostname.split('.')[0] ?? null;
  } catch {
    return null;
  }
}

export function getSupabaseTableSetupHint(config: SupabaseConfig) {
  const normalized = normalizeSupabaseConfig(config);
  return [
    `create table if not exists ${normalized.schema}.${normalized.tableName} (`,
    '  section text primary key,',
    '  value jsonb not null,',
    "  updated_at timestamptz not null default timezone('utc', now())",
    ');',
    '',
    `alter publication supabase_realtime add table ${normalized.schema}.${normalized.tableName};`,
  ].join('\n');
}

export function getSupabaseConnectionErrorMessage(error: unknown, config?: SupabaseConfig) {
  if (!(error instanceof Error)) {
    return 'Unable to connect to Supabase.';
  }

  const message = error.message.toLowerCase();
  const normalized = config ? normalizeSupabaseConfig(config) : null;

  if (message.includes('invalid api key') || message.includes('invalid jwt')) {
    return 'Supabase anon key is invalid. Check the project URL and anon key.';
  }

  if (
    normalized &&
    (message.includes('relation') && message.includes(normalized.tableName.toLowerCase()) && message.includes('does not exist'))
  ) {
    return `Supabase table ${normalized.schema}.${normalized.tableName} does not exist. Create it first, then retry.`;
  }

  if (message.includes('row-level security') || message.includes('permission denied')) {
    return 'Supabase rejected access to the sync table. Add insert/select/update policies for the anon role, then retry.';
  }

  return error.message;
}

function getConfigKey(config: SupabaseConfig) {
  const normalized = normalizeSupabaseConfig(config);
  return [normalized.url, normalized.anonKey, normalized.schema, normalized.tableName].join('|');
}

export async function initializeSupabaseClient(config: SupabaseConfig) {
  if (!hasSupabaseCredentials(config)) {
    throw new Error(`Missing Supabase fields: ${getMissingSupabaseFields(config).join(', ')}`);
  }

  const normalized = normalizeSupabaseConfig(config);
  const nextConfigKey = getConfigKey(normalized);

  if (activeClient && activeConfigKey === nextConfigKey) {
    return { client: activeClient, config: normalized };
  }

  activeClient = createClient(normalized.url, normalized.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  activeConfigKey = nextConfigKey;

  return { client: activeClient, config: normalized };
}

export async function disconnectSupabaseClient() {
  if (activeClient && activeChannel) {
    await activeClient.removeChannel(activeChannel);
  }

  activeChannel = null;
  activeClient = null;
  activeConfigKey = '';
}

export async function seedSupabaseSections(
  client: SupabaseClient,
  config: SupabaseConfig,
  data: AppDataState,
) {
  const normalized = normalizeSupabaseConfig(config);
  const { data: rows, error } = await client
    .from(normalized.tableName)
    .select('section, value')
    .order('section', { ascending: true });

  if (error) {
    throw error;
  }

  const typedRows = (rows ?? []) as SupabaseRow[];
  const rowMap = new Map<AppDataSection, AppDataState[AppDataSection]>(
    typedRows.map((row) => [row.section, row.value]),
  );

  const missingRows = APP_DATA_SECTIONS.filter((section) => !rowMap.has(section)).map((section) => ({
    section,
    value: data[section],
    updated_at: new Date().toISOString(),
  }));

  if (missingRows.length > 0) {
    const { error: upsertError } = await client
      .from(normalized.tableName)
      .upsert(missingRows, { onConflict: 'section' });

    if (upsertError) {
      throw upsertError;
    }

    missingRows.forEach((row) => {
      rowMap.set(row.section, row.value);
    });
  }

  return Object.fromEntries(
    APP_DATA_SECTIONS.map((section) => [section, rowMap.get(section) ?? data[section]]),
  ) as AppDataState;
}

export async function saveSupabaseSection<K extends AppDataSection>(
  client: SupabaseClient,
  config: SupabaseConfig,
  section: K,
  value: AppDataState[K],
) {
  const normalized = normalizeSupabaseConfig(config);
  const { error } = await client.from(normalized.tableName).upsert(
    {
      section,
      value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'section' },
  );

  if (error) {
    throw error;
  }
}

export function subscribeToSupabase(
  client: SupabaseClient,
  config: SupabaseConfig,
  onSectionChange: <K extends AppDataSection>(section: K, value: AppDataState[K]) => void,
) {
  const normalized = normalizeSupabaseConfig(config);

  activeChannel = client
    .channel(`serviceflow-hub-${normalized.schema}-${normalized.tableName}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: normalized.schema,
        table: normalized.tableName,
      },
      (payload) => {
        const row = (payload.new || payload.old) as Partial<SupabaseRow> | null;

        if (!row?.section || row.value === undefined) {
          return;
        }

        if (!APP_DATA_SECTIONS.includes(row.section as AppDataSection)) {
          return;
        }

        onSectionChange(row.section as AppDataSection, row.value as AppDataState[AppDataSection]);
      },
    )
    .subscribe();

  return async () => {
    if (activeChannel) {
      await client.removeChannel(activeChannel);
      activeChannel = null;
    }
  };
}
