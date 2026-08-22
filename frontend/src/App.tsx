import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { RemindersProvider } from '@/context/RemindersContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { RoleRoute } from '@/components/RoleRoute';
import { Layout } from '@/components/Layout';
import { LandingExperience } from '@/pages/LandingExperience';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { ForgotPassword } from '@/pages/ForgotPassword';
import { ResetPassword } from '@/pages/ResetPassword';
import { AuthCallback } from '@/pages/AuthCallback';
import { DashboardV2 } from '@/pages/DashboardV2';
import { Agenda } from '@/pages/Agenda';
import { PoolModels } from '@/pages/PoolModels';
import { ProjectsV2 } from '@/pages/ProjectsV2';
import { ProjectDetail } from '@/pages/ProjectDetail';
import { Settings } from '@/pages/Settings';
import { PublicTimeline } from '@/pages/PublicTimeline';
import { ClientLogin } from '@/pages/ClientLogin';
import CatalogManager from '@/pages/Admin/CatalogManager';
import EquipmentManager from '@/pages/Admin/EquipmentManager';
import { ProductsImageManager } from '@/pages/Admin/ProductsImageManager';
import { DocsManager } from '@/pages/Admin/DocsManager';
import { UsersManager } from '@/pages/Admin/UsersManager';
import { TenantsManager } from '@/pages/Admin/TenantsManager';
import { SorteosManager } from '@/pages/Admin/SorteosManager';
import { OpsManager } from '@/pages/Admin/OpsManager';
import { Installer } from '@/pages/Installer';
import { Chat } from '@/pages/Chat';
import { Ayuda } from '@/pages/Ayuda';

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

function App() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  const Router = BrowserRouter;

  return (
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
            <Route path="/timeline/:shareToken" element={<PublicTimeline />} />

            <Route element={<ProtectedRoute><RemindersProvider><Layout /></RemindersProvider></ProtectedRoute>}>
              <Route path="/dashboard" element={
                <RoleRoute disallowedRoles={['INSTALLER']} redirectTo="/installer">
                  <DashboardV2 />
                </RoleRoute>
              } />
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/pool-models" element={
                <RoleRoute disallowedRoles={['INSTALLER']} redirectTo="/installer">
                  <PoolModels />
                </RoleRoute>
              } />
              <Route path="/projects" element={<ProjectsV2 />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/settings" element={
                <RoleRoute disallowedRoles={['INSTALLER']} redirectTo="/installer">
                  <Settings />
                </RoleRoute>
              } />
              <Route path="/chat" element={<Chat />} />
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
              <Route path="/admin/sorteos" element={
                <RoleRoute allowedRoles={['SUPERADMIN']} redirectTo="/dashboard">
                  <SorteosManager />
                </RoleRoute>
              } />
              <Route path="/admin/catalogs" element={
                <RoleRoute allowedRoles={['ADMIN', 'SUPERADMIN']} redirectTo="/dashboard">
                  <CatalogManager />
                </RoleRoute>
              } />
              <Route path="/admin/equipment" element={
                <RoleRoute allowedRoles={['ADMIN', 'SUPERADMIN']} redirectTo="/dashboard">
                  <EquipmentManager />
                </RoleRoute>
              } />
              <Route path="/admin/products-images" element={
                <RoleRoute allowedRoles={['ADMIN', 'SUPERADMIN']} redirectTo="/dashboard">
                  <ProductsImageManager />
                </RoleRoute>
              } />
              <Route path="/installer" element={
                <RoleRoute allowedRoles={['INSTALLER']} redirectTo="/dashboard">
                  <Installer />
                </RoleRoute>
              } />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
