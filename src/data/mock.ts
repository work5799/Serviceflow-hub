import { User, Project, Sale, Service, Notification } from '@/types';

export const currentUser: User = {
  id: '1',
  name: 'Alex Morgan',
  email: 'alex@agency.com',
  role: 'developer',
};

export const mockProjects: Project[] = [
  { id: 'P001', name: 'E-Commerce Redesign', client: 'TechCorp', service: 'WordPress', teamLeader: 'Sarah K.', members: ['John D.', 'Mike R.'], startDate: '2026-02-01', deadline: '2026-04-15', status: 'ongoing', revenue: 4500 },
  { id: 'P002', name: 'Brand Identity Suite', client: 'StartupXYZ', service: 'Design', teamLeader: 'Lisa M.', members: ['Tom W.'], startDate: '2026-03-01', deadline: '2026-03-30', status: 'completed', revenue: 2800 },
  { id: 'P003', name: 'Shopify Migration', client: 'FashionHub', service: 'Shopify', teamLeader: 'David L.', members: ['Emma S.', 'Chris P.'], startDate: '2026-03-10', deadline: '2026-05-01', status: 'ongoing', revenue: 6200 },
  { id: 'P004', name: 'SEO Campaign Q2', client: 'GreenLeaf', service: 'Marketing', teamLeader: 'Sarah K.', members: ['Anna B.'], startDate: '2026-04-01', deadline: '2026-06-30', status: 'pending', revenue: 3100 },
  { id: 'P005', name: 'Custom Plugin Dev', client: 'MediaFlow', service: 'WordPress', teamLeader: 'David L.', members: ['John D.'], startDate: '2026-01-15', deadline: '2026-03-01', status: 'completed', revenue: 5000 },
  { id: 'P006', name: 'Landing Page Bundle', client: 'FinanceApp', service: 'Design', teamLeader: 'Lisa M.', members: ['Tom W.', 'Mike R.'], startDate: '2026-03-20', deadline: '2026-04-20', status: 'ongoing', revenue: 1800 },
];

export const mockSales: Sale[] = [
  { id: 'S001', orderId: 'FO-29481', service: 'WordPress', date: '2026-03-24', amount: 450, status: 'completed' },
  { id: 'S002', orderId: 'FO-29482', service: 'Shopify', date: '2026-03-23', amount: 1200, status: 'completed' },
  { id: 'S003', orderId: 'FO-29483', service: 'Design', date: '2026-03-23', amount: 350, status: 'pending' },
  { id: 'S004', orderId: 'FO-29484', service: 'Marketing', date: '2026-03-22', amount: 800, status: 'completed' },
  { id: 'S005', orderId: 'FO-29485', service: 'WordPress', date: '2026-03-21', amount: 550, status: 'completed' },
  { id: 'S006', orderId: 'FO-29486', service: 'Shopify', date: '2026-03-20', amount: 950, status: 'refunded' },
  { id: 'S007', orderId: 'FO-29487', service: 'Design', date: '2026-03-19', amount: 280, status: 'completed' },
  { id: 'S008', orderId: 'FO-29488', service: 'Marketing', date: '2026-03-18', amount: 620, status: 'completed' },
];

export const mockServices: Service[] = [
  { id: 'SV1', name: 'WordPress Development', manager: 'Sarah K.', teamCount: 3, projectCount: 12, revenue: 34500, color: 'hsl(175 80% 45%)' },
  { id: 'SV2', name: 'Shopify Development', manager: 'David L.', teamCount: 2, projectCount: 8, revenue: 28200, color: 'hsl(260 60% 60%)' },
  { id: 'SV3', name: 'Graphic Design', manager: 'Lisa M.', teamCount: 2, projectCount: 15, revenue: 19800, color: 'hsl(38 92% 55%)' },
  { id: 'SV4', name: 'Digital Marketing', manager: 'Emma R.', teamCount: 1, projectCount: 6, revenue: 12400, color: 'hsl(152 60% 42%)' },
];

export const mockNotifications: Notification[] = [
  { id: 'N1', title: 'New Project Assigned', message: 'E-Commerce Redesign has been assigned to your team.', type: 'info', read: false, date: '2026-03-25' },
  { id: 'N2', title: 'Deadline Approaching', message: 'Brand Identity Suite deadline is in 5 days.', type: 'warning', read: false, date: '2026-03-25' },
  { id: 'N3', title: 'Project Completed', message: 'Custom Plugin Dev marked as completed.', type: 'success', read: true, date: '2026-03-24' },
];

export const revenueChartData = [
  { month: 'Oct', revenue: 12400 },
  { month: 'Nov', revenue: 15800 },
  { month: 'Dec', revenue: 14200 },
  { month: 'Jan', revenue: 18500 },
  { month: 'Feb', revenue: 21300 },
  { month: 'Mar', revenue: 24800 },
];

export const serviceChartData = [
  { name: 'WordPress', value: 34500, fill: 'hsl(175 80% 45%)' },
  { name: 'Shopify', value: 28200, fill: 'hsl(260 60% 60%)' },
  { name: 'Design', value: 19800, fill: 'hsl(38 92% 55%)' },
  { name: 'Marketing', value: 12400, fill: 'hsl(152 60% 42%)' },
];
