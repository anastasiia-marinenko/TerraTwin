import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import CosmicExplorer from './CosmicExplorer';
import NotFound from '@/pages/not-found';
import ExpeditionShell from './components/ExpeditionShell';
import MissionHome from './pages/MissionHome';
import BriefingPage from './pages/BriefingPage';
import FieldNotesPage from './pages/FieldNotesPage';
import MethodPage from './pages/MethodPage';

const queryClient = new QueryClient();

function MissionHomeRoute() {
  const [, navigate] = useLocation();
  const search = window.location.search;
  const params = new URLSearchParams(search);
  const legacyExplorerKeys = ['target', 'metric', 'view', 'site', 'novel', 'novelty-km', 'w-slopes', 'w-roughness', 'w-relief', 'w-curvature'];
  const hasLegacyExplorerState = legacyExplorerKeys.some((key) => params.has(key));

  useEffect(() => {
    if (hasLegacyExplorerState) navigate(`/explorer${search}`, { replace: true });
  }, [hasLegacyExplorerState, navigate, search]);

  if (hasLegacyExplorerState) {
    return <main className="story-page" aria-live="polite"><p className="story-eyebrow">Restoring your field comparison</p></main>;
  }

  return <MissionHome />;
}

function Router() {
  return (
    <ExpeditionShell>
      <Switch>
        <Route path="/" component={MissionHomeRoute} />
        <Route path="/briefing" component={BriefingPage} />
        <Route path="/explorer" component={CosmicExplorer} />
        <Route path="/field-notes" component={FieldNotesPage} />
        <Route path="/method" component={MethodPage} />
        <Route component={NotFound} />
      </Switch>
    </ExpeditionShell>
  );
}

function RoutedErrorBoundary({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

export default function Root() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <RoutedErrorBoundary><Router /></RoutedErrorBoundary>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
