export type UserRole = 'developer' | 'agm' | 'project_manager' | 'team_leader' | 'team_member';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  service: string;
  teamLeader: string;
  members: string[];
  startDate: string;
  deadline: string;
  status: 'pending' | 'ongoing' | 'completed';
  revenue: number;
}

export interface Sale {
  id: string;
  orderId: string;
  service: string;
  date: string;
  amount: number;
  status: 'completed' | 'pending' | 'refunded';
}

export interface Service {
  id: string;
  name: string;
  manager: string;
  teamCount: number;
  projectCount: number;
  revenue: number;
  color: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  read: boolean;
  date: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  developer: 'Developer (Super Admin)',
  agm: 'Admin Manager',
  project_manager: 'Project Manager',
  team_leader: 'Team Leader',
  team_member: 'Team Member',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  developer: 'bg-primary text-primary-foreground',
  agm: 'bg-accent text-accent-foreground',
  project_manager: 'bg-info text-info-foreground',
  team_leader: 'bg-warning text-warning-foreground',
  team_member: 'bg-success text-success-foreground',
};
