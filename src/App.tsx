import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';
import { ThemeProvider } from 'next-themes';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppDataProvider, useAppData } from '@/context/AppDataContext';
import { canLogin } from '@/lib/workflow';
import Index from './pages/Index.tsx';
import NotFound from './pages/NotFound.tsx';
import Notifications from './pages/Notifications.tsx';
import Projects from './pages/Projects.tsx';
import Sales from './pages/Sales.tsx';
import Services from './pages/Services.tsx';
import SettingsPage from './pages/Settings.tsx';
import Team from './pages/Team.tsx';

const queryClient = new QueryClient();

function AppRoutes() {
  const { appData } = useAppData();

  if (!canLogin(appData.currentUser)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="glass max-w-md rounded-2xl p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-foreground">Access blocked</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This member account is currently {appData.currentUser.status}. Disabled, banned, or removed members cannot
            continue into the ERP workspace.
          </p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/services" element={<Services />} />
        <Route path="/team" element={<Team />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <AppDataProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppRoutes />
        </TooltipProvider>
      </AppDataProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
