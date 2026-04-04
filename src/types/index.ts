export type UserRole =
  | 'developer'
  | 'agm'
  | 'project_manager'
  | 'team_leader'
  | 'call_leader'
  | 'team_member';
export type MemberStatus = 'active' | 'disabled' | 'banned' | 'removed';
export type ProjectStatus = 'pending' | 'in_progress' | 'completed' | 'late';
export type SaleStatus = 'pending' | 'in_progress' | 'delivered' | 'late' | 'refunded';

export interface User {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: UserRole;
  status: MemberStatus;
  serviceId: string | null;
  serviceName: string | null;
  teamId: string | null;
  teamName: string | null;
  bio: string;
  workSummary: string;
  department: string;
  clerkUserId?: string | null;
  avatar?: string;
  lastMovedAt?: string | null;
}

export interface Project {
  id: string;
  projectId: string;
  orderId: string;
  name: string;
  projectName: string;
  client: string;
  clientName: string;
  service: string;
  serviceType: string;
  assignedService: string;
  assignedServiceId: string | null;
  marketplace: string;
  assignedTeam: string;
  assignedTeamId: string | null;
  teamLeader: string;
  members: string[];
  startDate: string;
  deadline: string;
  deliveryDeadline: string;
  status: ProjectStatus;
  revenue: number;
  createdFromSaleId: string | null;
  sourceModule: 'sales';
}

export interface Sale {
  id: string;
  orderId: string;
  projectName: string;
  clientName: string;
  serviceType: string;
  service: string;
  marketplace: string;
  incomingDate: string;
  date: string;
  deliveryDeadline: string;
  revenueAmount: number;
  amount: number;
  status: SaleStatus;
  projectId: string | null;
  movedToOperationsAt: string | null;
}

export interface Service {
  id: string;
  name: string;
  manager: string;
  managerId: string | null;
  description: string;
  teamCount: number;
  projectCount: number;
  revenue: number;
  color: string;
  isActive: boolean;
}

export interface Team {
  id: string;
  name: string;
  serviceId: string;
  serviceName: string;
  description: string;
  projectManagerId: string | null;
  projectManagerName: string;
  teamLeaderId: string | null;
  teamLeaderName: string;
  callerIds: string[];
  memberCount: number;
  isActive: boolean;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  read: boolean;
  date: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  tableName: string;
  schema: string;
}

export interface OrganizationSettings {
  companyName: string;
  supportEmail: string;
  currency: string;
  timezone: string;
  locale: string;
  fiscalYearStart: string;
}

export interface DeveloperSettings {
  maintenanceMode: boolean;
  allowUserInvites: boolean;
  enableRealtimeSync: boolean;
  enableAuditLog: boolean;
  allowDataExport: boolean;
  autoSeedCollections: boolean;
  maxUploadSizeMb: number;
  rateLimitPerMinute: number;
  defaultNewUserRole: UserRole;
}

export interface NotificationPreferences {
  emailReports: boolean;
  pushAlerts: boolean;
  deadlineWarnings: boolean;
  salesDigest: boolean;
}

export interface AppSettings {
  organization: OrganizationSettings;
  developer: DeveloperSettings;
  notificationPreferences: NotificationPreferences;
}

export interface AppDataState {
  currentUser: User;
  teamMembers: User[];
  projects: Project[];
  sales: Sale[];
  services: Service[];
  teams: Team[];
  notifications: Notification[];
  settings: AppSettings;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  developer: 'Developer (Super Admin)',
  agm: 'AGM',
  project_manager: 'Project Manager',
  team_leader: 'Team Leader',
  call_leader: 'Co-Leader',
  team_member: 'Member',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  developer: 'bg-primary text-primary-foreground',
  agm: 'bg-accent text-accent-foreground',
  project_manager: 'bg-info text-info-foreground',
  team_leader: 'bg-warning text-warning-foreground',
  call_leader: 'bg-violet-500/15 text-violet-300',
  team_member: 'bg-success text-success-foreground',
};

export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  active: 'Active',
  disabled: 'Disabled',
  banned: 'Banned',
  removed: 'Removed',
};

export const MEMBER_STATUS_COLORS: Record<MemberStatus, string> = {
  active: 'bg-success/10 text-success',
  disabled: 'bg-warning/10 text-warning',
  banned: 'bg-destructive/10 text-destructive',
  removed: 'bg-muted text-muted-foreground',
};
