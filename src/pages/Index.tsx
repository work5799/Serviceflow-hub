import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { ServiceBreakdown } from '@/components/dashboard/ServiceBreakdown';
import { RecentProjects } from '@/components/dashboard/RecentProjects';
import { useAppData } from '@/context/AppDataContext';
import { DollarSign, FolderKanban, TrendingUp, Users } from 'lucide-react';

const Dashboard = () => {
  const { appData, firebaseStatus } = useAppData();
  const totalRevenue = appData.services.reduce((sum, service) => sum + service.revenue, 0);
  const activeProjects = appData.projects.filter((project) => project.status !== 'completed').length;
  const completedOrders = appData.sales.filter((sale) => sale.status === 'completed');
  const averageOrderValue = completedOrders.length
    ? Math.round(completedOrders.reduce((sum, sale) => sum + sale.amount, 0) / completedOrders.length)
    : 0;

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} change={`${appData.services.length} services tracked`} changeType="up" icon={DollarSign} delay={0} />
          <StatsCard title="Active Projects" value={String(activeProjects)} change={`${appData.projects.length} total projects`} changeType="up" icon={FolderKanban} delay={0.05} />
          <StatsCard title="Team Members" value={String(appData.teamMembers.length)} change={`${firebaseStatus.connected ? 'Live sync enabled' : 'Local mode active'}`} changeType="up" icon={Users} delay={0.1} />
          <StatsCard title="Avg. Order Value" value={`$${averageOrderValue.toLocaleString()}`} change={`${completedOrders.length} completed orders`} changeType="up" icon={TrendingUp} delay={0.15} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <RevenueChart />
          </div>
          <ServiceBreakdown />
        </div>

        <RecentProjects />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
