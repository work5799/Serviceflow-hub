import { Bell, Search, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { mockNotifications } from '@/data/mock';

export function AppHeader({ title }: { title: string }) {
  const [dark, setDark] = useState(true);
  const unreadCount = mockNotifications.filter(n => !n.read).length;

  const toggleTheme = () => {
    setDark(!dark);
    document.documentElement.classList.toggle('dark');
  };

  // Set dark mode on mount
  if (typeof window !== 'undefined' && !document.documentElement.classList.contains('dark') && dark) {
    document.documentElement.classList.add('dark');
  }

  return (
    <header className="h-16 border-b border-border flex items-center justify-between px-6 glass-subtle sticky top-0 z-20">
      <h1 className="text-xl font-bold text-foreground">{title}</h1>
      <div className="flex items-center gap-2">
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text"
            placeholder="Search..."
            className="pl-9 pr-4 py-2 text-sm rounded-lg bg-secondary border-none outline-none focus:ring-2 focus:ring-ring w-56 text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <button onClick={toggleTheme} className="p-2.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground">
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button className="p-2.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground relative">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
          )}
        </button>
      </div>
    </header>
  );
}
