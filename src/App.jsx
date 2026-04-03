import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Login from './components/auth/Login.jsx';
import Layout from './components/layout/Layout.jsx';
import MandateCalculator from './components/mandates/MandateCalculator.jsx';
import WantedPersons from './components/wanted/WantedPersons.jsx';
import WantedVehicles from './components/wanted/WantedVehicles.jsx';
import CollectedLicenses from './components/licenses/CollectedLicenses.jsx';
import AdminPanel from './components/admin/AdminPanel.jsx';
import CVForm from './components/cv/CVForm.jsx';
import Promotions from './components/promotions/Promotions.jsx';
import LoadingSpinner from './components/common/LoadingSpinner.jsx';

// Route wymagający autoryzacji
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner fullScreen />;
  return user ? children : <Navigate to="/panel" replace />;
};

// Route tylko dla adminów (SZEF / SUPERADMIN)
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner fullScreen />;
  if (!user) return <Navigate to="/panel" replace />;
  if (!['SZEF', 'SUPERADMIN'].includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

// Route dla zastępcy szefa i wyżej (ZASTEPCA, SZEF, SUPERADMIN)
const ZastepcaRoute = ({ children }) => {
  const { user, loading, hasRole } = useAuth();
  if (loading) return <LoadingSpinner fullScreen />;
  if (!user) return <Navigate to="/panel" replace />;
  if (!hasRole('ZASTEPCA')) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  return (
    <Routes>
      {/* Strona publiczna – formularz CV (bez logowania) */}
      <Route path="/cv" element={<CVForm />} />
      {/* Panel logowania – ukryty adres */}
      <Route path="/panel" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/mandates" replace />} />
        <Route path="mandates" element={<MandateCalculator />} />
        <Route path="wanted-persons" element={<WantedPersons />} />
        <Route path="wanted-vehicles" element={<WantedVehicles />} />
        <Route path="licenses" element={<CollectedLicenses />} />
        <Route path="promotions" element={<Promotions />} />
        <Route
          path="admin"
          element={
            <AdminRoute>
              <AdminPanel />
            </AdminRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
