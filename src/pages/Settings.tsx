import { useEffect, useState } from 'react';
import {
  Building2,
  Cloud,
  Database,
  LoaderCircle,
  RefreshCcw,
  Save,
  Shield,
  Unplug,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { toast } from '@/components/ui/sonner';
import { Switch } from '@/components/ui/switch';
import { useAppData } from '@/context/AppDataContext';
import { createEmptySupabaseConfig, getSupabaseTableSetupHint } from '@/lib/supabase';
import {
  ROLE_LABELS,
  type DeveloperSettings,
  type NotificationPreferences,
  type OrganizationSettings,
  type SupabaseConfig,
} from '@/types';

const sectionClassName = 'glass rounded-xl p-6 space-y-5';
const inputClassName = 'mt-1 w-full px-3 py-2 text-sm rounded-lg bg-secondary outline-none focus:ring-2 focus:ring-ring text-foreground';
const selectClassName = 'mt-1 w-full px-3 py-2 text-sm rounded-lg bg-secondary outline-none focus:ring-2 focus:ring-ring text-foreground';

const SettingsPage = () => {
  const {
    appData,
    supabaseConfig,
    supabaseStatus,
    connectSupabase,
    disconnectSupabase,
    pushCurrentDataToSupabase,
    updateCurrentUser,
    updateSettings,
  } = useAppData();

  const [profileForm, setProfileForm] = useState({
    name: appData.currentUser.name,
    email: appData.currentUser.email,
  });
  const [organizationForm, setOrganizationForm] = useState<OrganizationSettings>(appData.settings.organization);
  const [developerForm, setDeveloperForm] = useState<DeveloperSettings>(appData.settings.developer);
  const [notificationForm, setNotificationForm] = useState<NotificationPreferences>(appData.settings.notificationPreferences);
  const [supabaseForm, setSupabaseForm] = useState<SupabaseConfig>(
    supabaseConfig.url ? supabaseConfig : createEmptySupabaseConfig(),
  );
  const supabaseTableSetupHint = getSupabaseTableSetupHint(supabaseForm);

  useEffect(() => {
    setProfileForm({
      name: appData.currentUser.name,
      email: appData.currentUser.email,
    });
  }, [appData.currentUser]);

  useEffect(() => {
    setOrganizationForm(appData.settings.organization);
    setDeveloperForm(appData.settings.developer);
    setNotificationForm(appData.settings.notificationPreferences);
  }, [appData.settings]);

  useEffect(() => {
    setSupabaseForm(supabaseConfig.url ? supabaseConfig : createEmptySupabaseConfig());
  }, [supabaseConfig]);

  const handleProfileSave = async () => {
    await updateCurrentUser(profileForm);
    toast.success('Profile updated successfully.');
  };

  const handleOrganizationSave = async () => {
    await updateSettings({ organization: organizationForm });
    toast.success('Organization settings saved.');
  };

  const handleDeveloperSave = async () => {
    await updateSettings({ developer: developerForm });
    toast.success('Developer and super admin controls saved.');
  };

  const handleNotificationSave = async () => {
    await updateSettings({ notificationPreferences: notificationForm });
    toast.success('Notification preferences saved.');
  };

  const handleSupabaseConnect = async () => {
    try {
      await connectSupabase(supabaseForm);
      toast.success('Supabase connected and realtime sync is active.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Supabase connection failed.');
    }
  };

  const handleSupabaseDisconnect = async () => {
    await disconnectSupabase();
    toast.success('Supabase disconnected. Local cached data remains available.');
  };

  const handlePushData = async () => {
    try {
      await pushCurrentDataToSupabase();
      toast.success('All local data pushed to Supabase.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to push data to Supabase.');
    }
  };

  return (
    <DashboardLayout title="Settings">
      <div className="space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sync Status</p>
                <p className="text-lg font-semibold text-foreground">{supabaseStatus.connected ? 'Connected' : 'Not connected'}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {supabaseStatus.connected
                ? supabaseStatus.projectRef
                : 'Connect Supabase from below to store live ERP data.'}
            </p>
          </div>
          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center text-info">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Collections Ready</p>
                <p className="text-lg font-semibold text-foreground">8 synced sections</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Profile, members, projects, sales, services, teams, notifications and settings are all backed by one shared store.
            </p>
          </div>
          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center text-warning">
                <RefreshCcw className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Sync</p>
                <p className="text-lg font-semibold text-foreground">{supabaseStatus.lastSync ?? 'Not synced yet'}</p>
              </div>
            </div>
            <button
              className="mt-2 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
              onClick={handlePushData}
              type="button"
              disabled={!supabaseStatus.connected}
            >
              Push Current Data to Supabase
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section className={sectionClassName}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Profile</h3>
                <p className="text-sm text-muted-foreground">Developer / super admin account details.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">Name</label>
                <input
                  value={profileForm.name}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Email</label>
                <input
                  value={profileForm.email}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Current Role</label>
                <p className="mt-3 text-sm text-foreground">{ROLE_LABELS[appData.currentUser.role]}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Storage Mode</label>
                <p className="mt-3 text-sm text-foreground">{supabaseStatus.connected ? 'Supabase + local cache' : 'Local cache only'}</p>
              </div>
            </div>
            <button className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity" onClick={handleProfileSave} type="button">
              <Save className="w-4 h-4 inline mr-2" />Save Profile
            </button>
          </section>

          <section className={sectionClassName}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Organization</h3>
                <p className="text-sm text-muted-foreground">Core business settings used across the dashboard.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">Company Name</label>
                <input
                  value={organizationForm.companyName}
                  onChange={(event) => setOrganizationForm((prev) => ({ ...prev, companyName: event.target.value }))}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Support Email</label>
                <input
                  value={organizationForm.supportEmail}
                  onChange={(event) => setOrganizationForm((prev) => ({ ...prev, supportEmail: event.target.value }))}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Currency</label>
                <input
                  value={organizationForm.currency}
                  onChange={(event) => setOrganizationForm((prev) => ({ ...prev, currency: event.target.value }))}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Timezone</label>
                <input
                  value={organizationForm.timezone}
                  onChange={(event) => setOrganizationForm((prev) => ({ ...prev, timezone: event.target.value }))}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Locale</label>
                <input
                  value={organizationForm.locale}
                  onChange={(event) => setOrganizationForm((prev) => ({ ...prev, locale: event.target.value }))}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Fiscal Year Start</label>
                <input
                  value={organizationForm.fiscalYearStart}
                  onChange={(event) => setOrganizationForm((prev) => ({ ...prev, fiscalYearStart: event.target.value }))}
                  className={inputClassName}
                />
              </div>
            </div>
            <button className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity" onClick={handleOrganizationSave} type="button">
              <Save className="w-4 h-4 inline mr-2" />Save Organization
            </button>
          </section>
        </div>

        <section className={sectionClassName}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center text-info">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Supabase Connection</h3>
              <p className="text-sm text-muted-foreground">
                Paste your Supabase project URL and anon key here. The app syncs all ERP sections through one shared table.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Project URL</label>
              <input value={supabaseForm.url} onChange={(event) => setSupabaseForm((prev) => ({ ...prev, url: event.target.value }))} className={inputClassName} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Anon Key</label>
              <input value={supabaseForm.anonKey} onChange={(event) => setSupabaseForm((prev) => ({ ...prev, anonKey: event.target.value }))} className={inputClassName} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Table Name</label>
              <input value={supabaseForm.tableName} onChange={(event) => setSupabaseForm((prev) => ({ ...prev, tableName: event.target.value }))} className={inputClassName} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Schema</label>
              <input value={supabaseForm.schema} onChange={(event) => setSupabaseForm((prev) => ({ ...prev, schema: event.target.value }))} className={inputClassName} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Realtime Table Hint</label>
              <p className="mt-3 text-sm text-foreground">{`${supabaseForm.schema}.${supabaseForm.tableName}`}</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Connection Status</label>
              <p className="mt-3 text-sm text-foreground">
                {supabaseStatus.connecting ? 'Connecting...' : supabaseStatus.connected ? 'Connected' : 'Disconnected'}
              </p>
              {supabaseStatus.error && <p className="mt-2 text-xs text-destructive">{supabaseStatus.error}</p>}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-70" onClick={handleSupabaseConnect} type="button" disabled={supabaseStatus.connecting}>
              {supabaseStatus.connecting ? <LoaderCircle className="w-4 h-4 inline mr-2 animate-spin" /> : <Cloud className="w-4 h-4 inline mr-2" />}
              {supabaseStatus.connected ? 'Reconnect Supabase' : 'Connect Supabase'}
            </button>
            <button className="px-4 py-2 text-sm rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-muted transition-colors disabled:opacity-70" onClick={handleSupabaseDisconnect} type="button" disabled={!supabaseStatus.connected}>
              <Unplug className="w-4 h-4 inline mr-2" />Disconnect
            </button>
            <button className="px-4 py-2 text-sm rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-muted transition-colors disabled:opacity-70" onClick={handlePushData} type="button" disabled={!supabaseStatus.connected}>
              <Database className="w-4 h-4 inline mr-2" />Push Data Now
            </button>
          </div>

          <div className="rounded-xl border border-dashed border-border bg-secondary/20 px-4 py-3 text-xs text-muted-foreground space-y-3">
            <p>Create this table in Supabase before connecting, and enable realtime for it if you want instant cross-tab sync:</p>
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-background/60 p-3 text-[11px] text-foreground">{supabaseTableSetupHint}</pre>
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section className={sectionClassName}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center text-warning">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Developer & Super Admin Controls</h3>
                <p className="text-sm text-muted-foreground">Operational switches for system safety, sync and governance.</p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                ['Maintenance Mode', 'Temporarily lock down non-admin activity.', developerForm.maintenanceMode, (checked: boolean) => setDeveloperForm((prev) => ({ ...prev, maintenanceMode: checked }))],
                ['Allow User Invites', 'Let admins invite new team members.', developerForm.allowUserInvites, (checked: boolean) => setDeveloperForm((prev) => ({ ...prev, allowUserInvites: checked }))],
                ['Realtime Sync', 'Keep Supabase-backed pages updated instantly.', developerForm.enableRealtimeSync, (checked: boolean) => setDeveloperForm((prev) => ({ ...prev, enableRealtimeSync: checked }))],
                ['Audit Logging', 'Record sensitive admin changes for review.', developerForm.enableAuditLog, (checked: boolean) => setDeveloperForm((prev) => ({ ...prev, enableAuditLog: checked }))],
                ['Allow Data Export', 'Enable CSV and data export actions.', developerForm.allowDataExport, (checked: boolean) => setDeveloperForm((prev) => ({ ...prev, allowDataExport: checked }))],
                ['Auto Seed Collections', 'Create missing Supabase rows automatically.', developerForm.autoSeedCollections, (checked: boolean) => setDeveloperForm((prev) => ({ ...prev, autoSeedCollections: checked }))],
              ].map(([title, description, checked, onCheckedChange]) => (
                <div key={String(title)} className="flex items-center justify-between gap-4 border border-border/60 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{description}</p>
                  </div>
                  <Switch checked={checked as boolean} onCheckedChange={onCheckedChange as (checked: boolean) => void} />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">Max Upload Size (MB)</label>
                <input type="number" value={developerForm.maxUploadSizeMb} onChange={(event) => setDeveloperForm((prev) => ({ ...prev, maxUploadSizeMb: Number(event.target.value) }))} className={inputClassName} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Rate Limit / min</label>
                <input type="number" value={developerForm.rateLimitPerMinute} onChange={(event) => setDeveloperForm((prev) => ({ ...prev, rateLimitPerMinute: Number(event.target.value) }))} className={inputClassName} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Default New User Role</label>
                <select value={developerForm.defaultNewUserRole} onChange={(event) => setDeveloperForm((prev) => ({ ...prev, defaultNewUserRole: event.target.value as DeveloperSettings['defaultNewUserRole'] }))} className={selectClassName}>
                  {Object.entries(ROLE_LABELS).map(([role, label]) => (
                    <option key={role} value={role}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <button className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity" onClick={handleDeveloperSave} type="button">
              <Save className="w-4 h-4 inline mr-2" />Save Admin Controls
            </button>
          </section>

          <section className={sectionClassName}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center text-success">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Notification Preferences</h3>
                <p className="text-sm text-muted-foreground">Choose which admin alerts should stay active.</p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                ['Email Reports', 'Receive summary emails for business performance.', notificationForm.emailReports, (checked: boolean) => setNotificationForm((prev) => ({ ...prev, emailReports: checked }))],
                ['Push Alerts', 'Show high-priority alerts directly in the dashboard.', notificationForm.pushAlerts, (checked: boolean) => setNotificationForm((prev) => ({ ...prev, pushAlerts: checked }))],
                ['Deadline Warnings', 'Warn project owners before deadlines.', notificationForm.deadlineWarnings, (checked: boolean) => setNotificationForm((prev) => ({ ...prev, deadlineWarnings: checked }))],
                ['Sales Digest', 'Generate revenue summaries for the sales team.', notificationForm.salesDigest, (checked: boolean) => setNotificationForm((prev) => ({ ...prev, salesDigest: checked }))],
              ].map(([title, description, checked, onCheckedChange]) => (
                <div key={String(title)} className="flex items-center justify-between gap-4 border border-border/60 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{description}</p>
                  </div>
                  <Switch checked={checked as boolean} onCheckedChange={onCheckedChange as (checked: boolean) => void} />
                </div>
              ))}
            </div>

            <button className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity" onClick={handleNotificationSave} type="button">
              <Save className="w-4 h-4 inline mr-2" />Save Notification Settings
            </button>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
