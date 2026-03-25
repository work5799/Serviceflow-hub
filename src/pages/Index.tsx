import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { ServiceBreakdown } from '@/components/dashboard/ServiceBreakdown';
import { RecentProjects } from '@/components/dashboard/RecentProjects';
import { DollarSign, FolderKanban, Users, TrendingUp } from 'lucide-react';

const Dashboard = () => {
  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Total Revenue" value="$94,900" change="18.2% from last month" changeType="up" icon={DollarSign} delay={0} />
          <StatsCard title="Active Projects" value="4" change="2 new this month" changeType="up" icon={FolderKanban} delay={0.05} />
          <StatsCard title="Team Members" value="12" change="3 added recently" changeType="up" icon={Users} delay={0.1} />
          <StatsCard title="Avg. Order Value" value="$628" change="5.4% increase" changeType="up" icon={TrendingUp} delay={0.15} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <RevenueChart />
          </div>
          <ServiceBreakdown />
        </div>

        {/* Recent */}
        <RecentProjects />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
