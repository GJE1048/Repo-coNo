import { QueryClientProvider } from '@tanstack/react-query';
import { trpc, queryClient, trpcClient } from './lib/api';
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { Documents } from './pages/Documents';
import { Users } from './pages/Users';
import { AIShorthand } from './pages/AIShorthand';
import { Settings } from './pages/Settings';
import { Logs } from './pages/Logs';
import { Login } from './pages/Login';
import { AuthProvider } from './lib/auth';
import { RequireAuth } from './components/auth/RequireAuth';

const appChildren = [
  {
    index: true,
    element: <Navigate to="dashboard" replace />,
  },
  {
    path: 'dashboard',
    element: <Dashboard />,
  },
  {
    path: 'users',
    element: <Users />,
  },
  {
    path: 'documents',
    element: <Documents />,
  },
  {
    path: 'ai-shorthand',
    element: <AIShorthand />,
  },
  {
    path: 'settings',
    element: <Settings />,
  },
  {
    path: 'logs',
    element: <Logs />,
  },
];

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <MainLayout />
      </RequireAuth>
    ),
    children: appChildren,
  },
  {
    path: '/app',
    element: (
      <RequireAuth>
        <MainLayout />
      </RequireAuth>
    ),
    children: appChildren,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

function App() {
  return (
    <AuthProvider>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </trpc.Provider>
    </AuthProvider>
  );
}

export default App;
