import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { RemindersProvider } from '@/context/RemindersContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { RoleRoute } from '@/components/RoleRoute';
import { Layout } from '@/components/Layout';
import { Landing } from '@/pages/Landing';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { ForgotPassword } from '@/pages/ForgotPassword';
import { ResetPassword } from '@/pages/ResetPassword';
import { AuthCallback } from '@/pages/AuthCallback';
import { Dashboard } from '@/pages/Dashboard';
import { Agenda } from '@/pages/Agenda';
import { PoolModels } from '@/pages/PoolModels';
import { Projects } from '@/pages/Projects';
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
import { OpsManager } from '@/pages/Admin/OpsManager';
import { Installer } from '@/pages/Installer';

// Siempre mostrar landing page en la raíz
function HomeRedirect() {
  return <Landing />;
}

function App() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  return (
    <AuthProvider>
      <Router basename={basePath}>
        <Routes>
          {basePath === '' && <Route path="/PoolCalculator/*" element={<Navigate to="/" replace />} />}
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Rutas públicas para clientes */}
          <Route path="/client-login" element={<ClientLogin />} />
          <Route path="/timeline/:shareToken" element={<PublicTimeline />} />

          <Route element={<ProtectedRoute><RemindersProvider><Layout /></RemindersProvider></ProtectedRoute>}>
            <Route path="/dashboard" element={
              <RoleRoute disallowedRoles={['INSTALLER']} redirectTo="/installer">
                <Dashboard />
              </RoleRoute>
            } />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/pool-models" element={
              <RoleRoute disallowedRoles={['INSTALLER']} redirectTo="/installer">
                <PoolModels />
              </RoleRoute>
            } />
            <Route path="/projects" element={
              <RoleRoute disallowedRoles={['INSTALLER']} redirectTo="/installer">
                <Projects />
              </RoleRoute>
            } />
            <Route path="/projects/:id" element={
              <RoleRoute disallowedRoles={['INSTALLER']} redirectTo="/installer">
                <ProjectDetail />
              </RoleRoute>
            } />
            <Route path="/settings" element={
              <RoleRoute disallowedRoles={['INSTALLER']} redirectTo="/installer">
                <Settings />
              </RoleRoute>
            } />
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
              <RoleRoute disallowedRoles={['INSTALLER']} redirectTo="/installer">
                <CatalogManager />
              </RoleRoute>
            } />
            <Route path="/admin/equipment" element={
              <RoleRoute disallowedRoles={['INSTALLER']} redirectTo="/installer">
                <EquipmentManager />
              </RoleRoute>
            } />
            <Route path="/admin/products-images" element={
              <RoleRoute disallowedRoles={['INSTALLER']} redirectTo="/installer">
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
  );
}

export default App;
