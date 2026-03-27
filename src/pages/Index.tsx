import { DollarSign, FolderCheck, FolderKanban, OctagonAlert, ShoppingCart } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RecentProjects } from '@/components/dashboard/RecentProjects';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { ServiceBreakdown } from '@/components/dashboard/ServiceBreakdown';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { useAppData } from '@/context/AppDataContext';
import { useNow } from '@/hooks/use-now';
import { getProjectDisplayStatus, getVisibleProjects } from '@/lib/workflow';

const Dashboard = () => {
  const { appData } = useAppData();
  const now = useNow(1000);
  const visibleProjects = getVisibleProjects(appData.projects, appData.currentUser);
  const projectsWithStatus = visibleProjects.map((project) => ({
    ...project,
    displayStatus: getProjectDisplayStatus(project, now),
  }));

  const totalSales = appData.sales.length;
  const activeProjects = projectsWithStatus.filter((project) => project.displayStatus !== 'completed').length;
  const completedProjects = projectsWithStatus.filter((project) => project.displayStatus === 'completed').length;
  const lateProjects = projectsWithStatus.filter((project) => project.displayStatus === 'late').length;
  const revenueSummary = appData.sales
    .filter((sale) => sale.status !== 'refunded')
    .reduce((sum, sale) => sum + sale.revenueAmount, 0);

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatsCard title="Total Sales" value={String(totalSales)} change="Orders created in Sales" changeType="up" icon={ShoppingCart} delay={0} />
          <StatsCard title="Active Projects" value={String(activeProjects)} change="Operations in progress" changeType="up" icon={FolderKanban} delay={0.05} />
          <StatsCard title="Completed Projects" value={String(completedProjects)} change="Delivered via Operations" changeType="up" icon={FolderCheck} delay={0.1} />
          <StatsCard title="Late Projects" value={String(lateProjects)} change="Needs immediate follow-up" changeType={lateProjects > 0 ? 'down' : 'up'} icon={OctagonAlert} delay={0.15} />
          <StatsCard title="Revenue Summary" value={`$${revenueSummary.toLocaleString()}`} change="Combined booked sales value" changeType="up" icon={DollarSign} delay={0.2} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
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
