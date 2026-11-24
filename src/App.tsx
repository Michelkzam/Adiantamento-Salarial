import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { ToastProvider } from './components/Toast';
import { DashboardPage } from './pages/DashboardPage';
import { EmployeeDetailPage } from './pages/EmployeeDetailPage';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppProvider>
          <HashRouter>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/employee/:id" element={<EmployeeDetailPage />} />
            </Routes>
          </HashRouter>
        </AppProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
