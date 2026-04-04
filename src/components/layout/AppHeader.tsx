import { Bell, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAppData } from '@/context/AppDataContext';

export function AppHeader({ title }: { title: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { appData, supabaseStatus } = useAppData();
  const unreadCount = appData.notifications.filter((notification) => !notification.read).length;
  const isDark = (theme === 'system' ? resolvedTheme : theme) === 'dark';

  return (
    <header className="h-16 border-b border-border flex items-center justify-between px-6 glass-subtle sticky top-0 z-20 gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {supabaseStatus.connected
            ? `Supabase connected${supabaseStatus.projectRef ? `: ${supabaseStatus.projectRef}` : ''}`
            : 'Using local cached data'}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="p-2.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
          type="button"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button className="p-2.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground relative" type="button">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />}
        </button>
      </div>
    </header>
  );
}
