import {
  Bell,
  ChevronLeft,
  DollarSign,
  FolderKanban,
  Layers,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
  Zap,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAppData } from '@/context/AppDataContext';
import { cn } from '@/lib/utils';
import { ROLE_COLORS, ROLE_LABELS } from '@/types';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Projects', icon: FolderKanban, path: '/projects' },
  { label: 'Sales', icon: DollarSign, path: '/sales' },
  { label: 'Services', icon: Layers, path: '/services' },
  { label: 'Team', icon: Users, path: '/team' },
  { label: 'Notifications', icon: Bell, path: '/notifications' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { appData } = useAppData();
  const unreadCount = appData.notifications.filter((notification) => !notification.read).length;

  return (
    <aside
      className={cn(
        'h-screen sticky top-0 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 z-30',
        collapsed ? 'w-[68px]' : 'w-64',
      )}
    >
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0 glow-primary">
          <Zap className="w-4 h-4 text-primary-foreground" />
        </div>
        {!collapsed && <span className="font-bold text-sidebar-accent-foreground text-lg tracking-tight">AgencyOS</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'ml-auto p-1.5 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors',
            collapsed && 'ml-0',
          )}
          type="button"
        >
          <ChevronLeft className={cn('w-4 h-4 transition-transform', collapsed && 'rotate-180')} />
        </button>
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && item.label === 'Notifications' && unreadCount > 0 && (
                <span className="ml-auto text-xs bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center shrink-0 text-sm font-semibold text-sidebar-primary">
            {appData.currentUser.name
              .split(' ')
              .map((part) => part[0])
              .join('')}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-accent-foreground truncate">{appData.currentUser.name}</p>
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', ROLE_COLORS[appData.currentUser.role])}>
                {ROLE_LABELS[appData.currentUser.role].split(' ')[0]}
              </span>
            </div>
          )}
          {!collapsed && (
            <button className="p-1.5 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors" type="button">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
