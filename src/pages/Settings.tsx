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
import {
  createEmptyFirebaseConfig,
  getFirestoreActivationUrl,
  getFirestoreDatabaseSetupUrl,
} from '@/lib/firebase';
import {
  ROLE_LABELS,
  type DeveloperSettings,
  type FirebaseConfig,
  type NotificationPreferences,
  type OrganizationSettings,
} from '@/types';

const sectionClassName = 'glass rounded-xl p-6 space-y-5';
const inputClassName = 'mt-1 w-full px-3 py-2 text-sm rounded-lg bg-secondary outline-none focus:ring-2 focus:ring-ring text-foreground';
const selectClassName = 'mt-1 w-full px-3 py-2 text-sm rounded-lg bg-secondary outline-none focus:ring-2 focus:ring-ring text-foreground';

const SettingsPage = () => {
  const {
    appData,
    firebaseConfig,
    firebaseStatus,
    connectFirebase,
    disconnectFirebase,
    pushCurrentDataToFirebase,
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
  const [firebaseForm, setFirebaseForm] = useState<FirebaseConfig>(
    firebaseConfig.apiKey ? firebaseConfig : createEmptyFirebaseConfig(),
  );
  const firestoreActivationUrl = firebaseForm.projectId
    ? getFirestoreActivationUrl(firebaseForm.projectId)
    : '';
  const firestoreDatabaseSetupUrl = firebaseForm.projectId
    ? getFirestoreDatabaseSetupUrl(firebaseForm.projectId)
    : '';

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
    setFirebaseForm(firebaseConfig.apiKey ? firebaseConfig : createEmptyFirebaseConfig());
  }, [firebaseConfig]);

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

  const handleFirebaseConnect = async () => {
    try {
      await connectFirebase(firebaseForm);
      toast.success('Firebase connected and Firestore sync is active.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Firebase connection failed.');
    }
  };

  const handleFirebaseDisconnect = async () => {
    await disconnectFirebase();
    toast.success('Firebase disconnected. Local cached data remains available.');
  };

  const handlePushData = async () => {
    try {
      await pushCurrentDataToFirebase();
      toast.success('All local data pushed to Firestore.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to push data to Firebase.');
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
                <p className="text-lg font-semibold text-foreground">{firebaseStatus.connected ? 'Connected' : 'Not connected'}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {firebaseStatus.connected
                ? firebaseStatus.projectId
                : 'Connect Firebase from below to store live data in Firestore.'}
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
                <p className="text-lg font-semibold text-foreground">{firebaseStatus.lastSync ?? 'Not synced yet'}</p>
              </div>
            </div>
            <button
              className="mt-2 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
              onClick={handlePushData}
              type="button"
              disabled={!firebaseStatus.connected}
            >
              Push Current Data to Firebase
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
                <p className="mt-3 text-sm text-foreground">{firebaseStatus.connected ? 'Firestore + local cache' : 'Local cache only'}</p>
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
              <h3 className="text-base font-semibold text-foreground">Firebase Connection</h3>
              <p className="text-sm text-muted-foreground">
                Paste your Firebase web app credentials here. Required fields are saved locally and used to connect Firestore.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">API Key</label>
              <input value={firebaseForm.apiKey} onChange={(event) => setFirebaseForm((prev) => ({ ...prev, apiKey: event.target.value }))} className={inputClassName} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Auth Domain</label>
              <input value={firebaseForm.authDomain} onChange={(event) => setFirebaseForm((prev) => ({ ...prev, authDomain: event.target.value }))} className={inputClassName} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Project ID</label>
              <input value={firebaseForm.projectId} onChange={(event) => setFirebaseForm((prev) => ({ ...prev, projectId: event.target.value }))} className={inputClassName} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Storage Bucket</label>
              <input value={firebaseForm.storageBucket} onChange={(event) => setFirebaseForm((prev) => ({ ...prev, storageBucket: event.target.value }))} className={inputClassName} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Messaging Sender ID</label>
              <input value={firebaseForm.messagingSenderId} onChange={(event) => setFirebaseForm((prev) => ({ ...prev, messagingSenderId: event.target.value }))} className={inputClassName} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">App ID</label>
              <input value={firebaseForm.appId} onChange={(event) => setFirebaseForm((prev) => ({ ...prev, appId: event.target.value }))} className={inputClassName} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Measurement ID</label>
              <input value={firebaseForm.measurementId ?? ''} onChange={(event) => setFirebaseForm((prev) => ({ ...prev, measurementId: event.target.value }))} className={inputClassName} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Database URL</label>
              <input value={firebaseForm.databaseURL ?? ''} onChange={(event) => setFirebaseForm((prev) => ({ ...prev, databaseURL: event.target.value }))} className={inputClassName} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Connection Status</label>
              <p className="mt-3 text-sm text-foreground">
                {firebaseStatus.connecting ? 'Connecting...' : firebaseStatus.connected ? 'Connected' : 'Disconnected'}
              </p>
              {firebaseStatus.error && <p className="mt-2 text-xs text-destructive">{firebaseStatus.error}</p>}
              {firebaseStatus.error?.includes('Cloud Firestore API is disabled') && firestoreActivationUrl && (
                <a
                  href={firestoreActivationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex text-xs font-medium text-primary underline underline-offset-4"
                >
                  Open Firestore API setup
                </a>
              )}
              {firebaseStatus.error?.includes('Firestore database is not created yet') && firestoreDatabaseSetupUrl && (
                <a
                  href={firestoreDatabaseSetupUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex text-xs font-medium text-primary underline underline-offset-4"
                >
                  Create Firestore database
                </a>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-70" onClick={handleFirebaseConnect} type="button" disabled={firebaseStatus.connecting}>
              {firebaseStatus.connecting ? <LoaderCircle className="w-4 h-4 inline mr-2 animate-spin" /> : <Cloud className="w-4 h-4 inline mr-2" />}
              {firebaseStatus.connected ? 'Reconnect Firebase' : 'Connect Firebase'}
            </button>
            <button className="px-4 py-2 text-sm rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-muted transition-colors disabled:opacity-70" onClick={handleFirebaseDisconnect} type="button" disabled={!firebaseStatus.connected}>
              <Unplug className="w-4 h-4 inline mr-2" />Disconnect
            </button>
            <button className="px-4 py-2 text-sm rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-muted transition-colors disabled:opacity-70" onClick={handlePushData} type="button" disabled={!firebaseStatus.connected}>
              <Database className="w-4 h-4 inline mr-2" />Push Data Now
            </button>
          </div>

          <div className="rounded-xl border border-dashed border-border bg-secondary/20 px-4 py-3 text-xs text-muted-foreground">
            Make sure Firestore Database is created in the selected Firebase project. If normal transport is blocked on your network or hosting, the app now retries automatically with long-polling.
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
                ['Realtime Sync', 'Keep Firestore-backed pages updated instantly.', developerForm.enableRealtimeSync, (checked: boolean) => setDeveloperForm((prev) => ({ ...prev, enableRealtimeSync: checked }))],
                ['Audit Logging', 'Record sensitive admin changes for review.', developerForm.enableAuditLog, (checked: boolean) => setDeveloperForm((prev) => ({ ...prev, enableAuditLog: checked }))],
                ['Allow Data Export', 'Enable CSV and data export actions.', developerForm.allowDataExport, (checked: boolean) => setDeveloperForm((prev) => ({ ...prev, allowDataExport: checked }))],
                ['Auto Seed Collections', 'Create missing Firestore docs automatically.', developerForm.autoSeedCollections, (checked: boolean) => setDeveloperForm((prev) => ({ ...prev, autoSeedCollections: checked }))],
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
