import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { RemindersProvider } from '@/context/RemindersContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { RoleRoute } from '@/components/RoleRoute';
import { Layout } from '@/components/Layout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PageLoading } from '@/components/PageLoading';
import { NotFound } from '@/pages/NotFound';
const LandingExperience = lazy(() => import('@/pages/LandingExperience').then((module) => ({ default: module.LandingExperience })));
const Login = lazy(() => import('@/pages/Login').then((module) => ({ default: module.Login })));
const Register = lazy(() => import('@/pages/Register').then((module) => ({ default: module.Register })));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword').then((module) => ({ default: module.ForgotPassword })));
const ResetPassword = lazy(() => import('@/pages/ResetPassword').then((module) => ({ default: module.ResetPassword })));
const AuthCallback = lazy(() => import('@/pages/AuthCallback').then((module) => ({ default: module.AuthCallback })));
const DashboardV2 = lazy(() => import('@/pages/DashboardV2').then((module) => ({ default: module.DashboardV2 })));
const AgendaExperience = lazy(() => import('@/pages/AgendaExperience').then((module) => ({ default: module.AgendaExperience })));
const PoolModelsExperience = lazy(() => import('@/pages/PoolModelsExperience').then((module) => ({ default: module.PoolModelsExperience })));
const ProjectsV2 = lazy(() => import('@/pages/ProjectsV2').then((module) => ({ default: module.ProjectsV2 })));
const ProjectDetail = lazy(() => import('@/pages/ProjectDetail').then((module) => ({ default: module.ProjectDetail })));
const Settings = lazy(() => import('@/pages/Settings').then((module) => ({ default: module.Settings })));
const PublicTimeline = lazy(() => import('@/pages/PublicTimeline').then((module) => ({ default: module.PublicTimeline })));
const ClientStoryDemo = lazy(() => import('@/pages/ClientStoryDemo').then((module) => ({ default: module.ClientStoryDemo })));
const ClientLogin = lazy(() => import('@/pages/ClientLogin').then((module) => ({ default: module.ClientLogin })));
const CatalogManager = lazy(() => import('@/pages/Admin/CatalogManager'));
const EquipmentManager = lazy(() => import('@/pages/Admin/EquipmentManager'));
const ProductsImageManager = lazy(() => import('@/pages/Admin/ProductsImageManager').then((module) => ({ default: module.ProductsImageManager })));
const DocsManager = lazy(() => import('@/pages/Admin/DocsManager').then((module) => ({ default: module.DocsManager })));
const UsersManager = lazy(() => import('@/pages/Admin/UsersManager').then((module) => ({ default: module.UsersManager })));
const TenantsManager = lazy(() => import('@/pages/Admin/TenantsManager').then((module) => ({ default: module.TenantsManager })));

const OpsManager = lazy(() => import('@/pages/Admin/OpsManager').then((module) => ({ default: module.OpsManager })));
const InstallerV2 = lazy(() => import('@/pages/InstallerV2').then((module) => ({ default: module.InstallerV2 })));
const ChatExperience = lazy(() => import('@/pages/ChatExperience').then((module) => ({ default: module.ChatExperience })));
const Ayuda = lazy(() => import('@/pages/Ayuda').then((module) => ({ default: module.Ayuda })));

function GlobalSvgFilters() {
  return (
    <svg aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
      <defs>
        <filter id="hand-drawn-filter" x="-4%" y="-4%" width="108%" height="108%" colorInterpolationFilters="linearRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.028 0.048" numOctaves="3" seed="6" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="pcRough" x="-3%" y="-3%" width="106%" height="106%" colorInterpolationFilters="linearRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.014 0.02" numOctaves="3" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="4.4" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="pcRoughIcon" x="-8%" y="-8%" width="116%" height="116%" colorInterpolationFilters="linearRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.03 0.045" numOctaves="2" seed="4" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="1.7" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}

/** Aísla el estado de cada cuenta/empresa al cambiar la sesión activa. */
function AuthenticatedLayout() {
  const { user } = useAuth();
  return <RemindersProvider key={`${user?.id}:${user?.currentOrgId || 'personal'}`}><Layout /></RemindersProvider>;
}

function App() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  const Router = BrowserRouter;

  return (
    <ErrorBoundary>
    <ThemeProvider>
      <GlobalSvgFilters />
      <AuthProvider>
        <Router
          basename={basePath || undefined}
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Suspense fallback={<PageLoading />} >
          <Routes>
            {basePath === '' && <Route path="/PoolCalculator/*" element={<Navigate to="/" replace />} />}
            <Route path="/" element={<LandingExperience />} />
            <Route path="/landing" element={<LandingExperience />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            <Route path="/client-login" element={<ClientLogin />} />
            <Route path="/demo/historia" element={<ClientStoryDemo />} />
            <Route path="/timeline/:shareToken" element={<PublicTimeline />} />

            <Route element={<ProtectedRoute><AuthenticatedLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={
                <RoleRoute disallowedRoles={['INSTALLER']} redirectTo="/installer">
                  <DashboardV2 />
                </RoleRoute>
              } />
              <Route path="/agenda" element={<AgendaExperience />} />
              <Route path="/pool-models" element={
                <RoleRoute disallowedRoles={['INSTALLER']} redirectTo="/installer">
                  <PoolModelsExperience />
                </RoleRoute>
              } />
              <Route path="/projects" element={<ProjectsV2 />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/settings" element={
                <RoleRoute disallowedRoles={['INSTALLER']} redirectTo="/installer">
                  <Settings />
                </RoleRoute>
              } />
              <Route path="/chat" element={<ChatExperience />} />
              <Route path="/ayuda" element={<Ayuda />} />
              <Route path="/admin/docs" element={
                <RoleRoute allowedRoles={['SUPERADMIN']} redirectTo="/dashboard">
                  <DocsManager />
                </RoleRoute>
              } />
              <Route path="/admin/users" element={
                <RoleRoute disallowedRoles={['INSTALLER']} redirectTo="/installer">
                  <UsersManager />
                </RoleRoute>
              } />
              <Route path="/admin/tenants" element={
                <RoleRoute allowedRoles={['SUPERADMIN']} redirectTo="/dashboard">
                  <TenantsManager />
                </RoleRoute>
              } />
              <Route path="/admin/ops" element={
                <RoleRoute allowedRoles={['SUPERADMIN']} redirectTo="/dashboard">
                  <OpsManager />
                </RoleRoute>
              } />
              <Route path="/admin/catalogs" element={
                <RoleRoute allowedRoles={['SUPERADMIN']} redirectTo="/dashboard">
                  <CatalogManager />
                </RoleRoute>
              } />
              <Route path="/admin/equipment" element={
                <RoleRoute allowedRoles={['SUPERADMIN']} redirectTo="/dashboard">
                  <EquipmentManager />
                </RoleRoute>
              } />
              <Route path="/admin/products-images" element={
                <RoleRoute allowedRoles={['SUPERADMIN']} redirectTo="/dashboard">
                  <ProductsImageManager />
                </RoleRoute>
              } />
              <Route path="/installer" element={
                <RoleRoute allowedRoles={['INSTALLER']} redirectTo="/dashboard">
                  <InstallerV2 />
                </RoleRoute>
              } />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
