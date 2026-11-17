// frontend/src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './components/Dashboard/Dashboard';
import Consultation from './components/Consultation/Consultation';
import PatientsList from './components/Patients/PatientsList';
import PatientDetail from './components/Patients/PatientDetail';
import PatientForm from './components/Patients/PatientForm';
import History from './components/History/History';
import Profile from './components/Profile/Profile';
import Navbar from './components/Layout/Navbar';
import Footer from './components/Layout/Footer';
import AdminLogin from './components/Admin/AdminLogin';
import AdminDashboard from './components/Admin/AdminDashboard';
import PatientLogin from './components/Patient/PatientLogin';
import PatientRegister from './components/Patient/PatientRegister';
import PatientDashboard from './components/Patient/PatientDashboard';

// Route publique médecin : redirige vers dashboard si déjà connecté
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 bg-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return user ? <Navigate to={user.role === 'patient' ? '/patient/dashboard' : '/dashboard'} replace /> : children;
};

// Route privée médecin : redirige vers login si non connecté
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 bg-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return user?.role !== 'patient' ? (user ? children : <Navigate to="/login" replace />) : <Navigate to="/patient/dashboard" replace />;
};

// Route privée Admin
const AdminRoute = ({ children }) => {
  const adminToken = localStorage.getItem('admin_token');
  return adminToken ? children : <Navigate to="/admin/login" replace />;
};

const PatientRoute = ({ children }) => {
  return localStorage.getItem('patient_token') ? children : <Navigate to="/patient/login" replace />;
};

const AppContent = () => {
  const { user, loading, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  const location = useLocation();

  React.useEffect(() => {
    const isPatientSession = !!localStorage.getItem('patient_token');
    const isDashboardRoute = location.pathname === '/dashboard' || location.pathname === '/patient/dashboard';

    if (!user && !isPatientSession) return;
    if (!isDashboardRoute) return;

    const handlePopState = (event) => {
      event.preventDefault();

      const dashboardPath = isPatientSession || (user && user.role === 'patient') ? '/patient/dashboard' : '/dashboard';
      window.history.pushState(null, '', dashboardPath);
      setShowLogoutModal(true);
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [user, location.pathname]);

  const handleConfirmLogout = () => {
    const isPatientSession = !!localStorage.getItem('patient_token');

    if (isPatientSession) {
      localStorage.removeItem('patient_token');
      localStorage.removeItem('patient');
      window.location.href = '/patient/login';
      return;
    }

    logout();
  };

  const handleCancelLogout = () => {
    setShowLogoutModal(false);
    const isPatientSession = !!localStorage.getItem('patient_token');
    const dashboardPath = isPatientSession || (user && user.role === 'patient') ? '/patient/dashboard' : '/dashboard';
    window.history.pushState(null, '', dashboardPath);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-500">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-800">Déconnexion</h2>
            <p className="mt-3 text-sm text-slate-600">
              Vous êtes encore connecté. Voulez-vous vraiment vous déconnecter ?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelLogout}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutModal(false);
                  handleConfirmLogout();
                }}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      )}

      {user && <Navbar />}

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Routes>
          {/* Routes publiques Médecin */}
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />

          {/* Routes Admin */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

          {/* Routes Patient */}
          <Route path="/patient/login" element={<PatientLogin />} />
          <Route path="/patient/register" element={<PatientRegister />} />
          <Route path="/patient/dashboard" element={<PatientRoute><PatientDashboard /></PatientRoute>} />

          {/* Routes privées Médecin */}
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/consultation" element={<PrivateRoute><Consultation /></PrivateRoute>} />
          <Route path="/patients" element={<PrivateRoute><PatientsList /></PrivateRoute>} />
          <Route path="/patients/new" element={<PrivateRoute><PatientForm /></PrivateRoute>} />
          <Route path="/patients/:id" element={<PrivateRoute><PatientDetail /></PrivateRoute>} />
          <Route path="/patients/:id/edit" element={<PrivateRoute><PatientForm /></PrivateRoute>} />
          <Route path="/history" element={<PrivateRoute><History /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />

          {/* Redirections */}
          <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
          <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
        </Routes>
      </div>

      <Footer />
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;