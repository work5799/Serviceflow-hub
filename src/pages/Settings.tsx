import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { currentUser } from '@/data/mock';
import { ROLE_LABELS } from '@/types';

const SettingsPage = () => {
  return (
    <DashboardLayout title="Settings">
      <div className="max-w-xl space-y-6">
        <div className="glass rounded-xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Profile</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground">Name</label>
              <input defaultValue={currentUser.name} className="mt-1 w-full px-3 py-2 text-sm rounded-lg bg-secondary outline-none focus:ring-2 focus:ring-ring text-foreground" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Email</label>
              <input defaultValue={currentUser.email} className="mt-1 w-full px-3 py-2 text-sm rounded-lg bg-secondary outline-none focus:ring-2 focus:ring-ring text-foreground" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Role</label>
              <p className="mt-1 text-sm text-foreground">{ROLE_LABELS[currentUser.role]}</p>
            </div>
          </div>
        </div>
        <button className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity">
          Save Changes
        </button>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
