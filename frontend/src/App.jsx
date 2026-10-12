import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import { Spinner } from './components/ui.jsx';

import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Students from './pages/Students.jsx';
import StudentDetail from './pages/StudentDetail.jsx';
import Classes from './pages/Classes.jsx';
import AcademicYears from './pages/AcademicYears.jsx';
import Fees from './pages/Fees.jsx';
import Payments from './pages/Payments.jsx';
import Balances from './pages/Balances.jsx';
import Receipt from './pages/Receipt.jsx';
import Inventory from './pages/Inventory.jsx';
import Uniforms from './pages/Uniforms.jsx';
import UniformVerify from './pages/UniformVerify.jsx';
import Reports from './pages/Reports.jsx';
import Notifications from './pages/Notifications.jsx';
import AuditLog from './pages/AuditLog.jsx';
import Users from './pages/Users.jsx';
import Settings from './pages/Settings.jsx';
import Profile from './pages/Profile.jsx';
import Attendance from './pages/Attendance.jsx';
import Assessments from './pages/Assessments.jsx';
import AssessmentDetail from './pages/AssessmentDetail.jsx';
import PerformanceReport from './pages/PerformanceReport.jsx';

function Protected({ children, perm }) {
  const { user, loading, can } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Spinner />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (perm && !can(perm)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50 p-6 text-center">
        <p className="text-3xl text-gray-300"><i className="bi bi-shield-lock" /></p>
        <h1 className="text-lg font-semibold text-gray-800">Access denied</h1>
        <p className="max-w-sm text-sm text-gray-500">
          You do not have permission to view this page. Contact the Super Admin if you believe this is a mistake.
        </p>
        <a href="/app" className="mt-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
          Back to Dashboard
        </a>
      </div>
    );
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/app"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="students" element={<Protected perm="students:read"><Students /></Protected>} />
        <Route path="students/:id" element={<Protected perm="students:read"><StudentDetail /></Protected>} />
        <Route path="classes" element={<Protected perm="classes:read"><Classes /></Protected>} />
        <Route path="academic-years" element={<Protected perm="academicYears:read"><AcademicYears /></Protected>} />
        <Route path="attendance" element={<Protected perm="attendance:read"><Attendance /></Protected>} />
        <Route path="assessments" element={<Protected perm="assessments:read"><Assessments /></Protected>} />
        <Route path="assessments/report" element={<Protected perm="assessments:read"><PerformanceReport /></Protected>} />
        <Route path="assessments/:id" element={<Protected perm="assessments:read"><AssessmentDetail /></Protected>} />
        <Route path="fees" element={<Protected perm="fees:read"><Fees /></Protected>} />
        <Route path="payments" element={<Protected perm="payments:read"><Payments /></Protected>} />
        <Route path="payments/balances" element={<Protected perm="payments:read"><Balances /></Protected>} />
        <Route path="payments/:id/receipt" element={<Protected perm="payments:read"><Receipt /></Protected>} />
        <Route path="inventory" element={<Protected perm="inventory:read"><Inventory /></Protected>} />
        <Route path="uniforms" element={<Protected perm="uniforms:read"><Uniforms /></Protected>} />
        <Route path="uniforms/verify/:id" element={<Protected perm="uniforms:read"><UniformVerify /></Protected>} />
        <Route path="reports" element={<Protected perm="reports:read"><Reports /></Protected>} />
        <Route path="notifications" element={<Protected perm="notifications:read"><Notifications /></Protected>} />
        <Route path="audit" element={<Protected perm="audit:read"><AuditLog /></Protected>} />
        <Route path="users" element={<Protected perm="users:read"><Users /></Protected>} />
        <Route path="settings" element={<Protected perm="settings:read"><Settings /></Protected>} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
