import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import AccessDenied from './components/AccessDenied.jsx';
import Layout from './components/Layout.jsx';
import { LoadingBlock } from './components/ui.jsx';
import { useAuth } from './context/AuthContext.jsx';
import AccessCheck from './pages/AccessCheck.jsx';
import ApprovalLevels from './pages/ApprovalLevels.jsx';
import AuditLogs from './pages/AuditLogs.jsx';
import Login from './pages/Login.jsx';
import NotFound from './pages/NotFound.jsx';
import PermissionMatrixPage from './pages/PermissionMatrixPage.jsx';
import Reports from './pages/Reports.jsx';
import RoleDetails from './pages/RoleDetails.jsx';
import RoleForm from './pages/RoleForm.jsx';
import RoleList from './pages/RoleList.jsx';
import Users from './pages/Users.jsx';

function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingBlock label="Signing you in..." />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

function RequireAdmin() {
  const { isAdmin } = useAuth();
  return isAdmin ? <Outlet /> : <AccessDenied />;
}

function Home() {
  const { isAdmin } = useAuth();
  return <Navigate to={isAdmin ? '/access-control/roles' : '/access-control/access-check'} replace />;
}

export default function App() {
  const { user, loading } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user && !loading ? <Navigate to="/" replace /> : <Login />} />

      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="access-control/access-check" element={<AccessCheck />} />

          <Route element={<RequireAdmin />}>
            <Route path="access-control/roles" element={<RoleList />} />
            <Route path="access-control/roles/new" element={<RoleForm />} />
            <Route path="access-control/roles/:id" element={<RoleDetails />} />
            <Route path="access-control/roles/:id/edit" element={<RoleForm />} />
            <Route path="access-control/permission-matrix" element={<PermissionMatrixPage />} />
            <Route path="access-control/approval-levels" element={<ApprovalLevels />} />
            <Route path="access-control/users" element={<Users />} />
            <Route path="access-control/reports" element={<Reports />} />
            <Route path="access-control/audit-logs" element={<AuditLogs />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
