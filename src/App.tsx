import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useStore } from './store/useStore';
import { syncService } from './services/syncService';
import { apiService } from './services/apiService';
import { offlineService } from './services/offlineService';

// Pages
import { Login } from './pages/Login';
import { Menu } from './pages/Menu';
import { Products } from './pages/Products';
import { ProductDetail } from './pages/ProductDetail';
import { Separation } from './pages/Separation';
import { Conference } from './pages/Conference';
import { InventoryManagement } from './pages/InventoryManagement';
import { InventoryDetail } from './pages/InventoryDetail';
import { KitLampadas } from './pages/KitLampadas';
import { Stock } from './pages/Stock';

function App() {
  const { currentUser, setIsOnline, isOnline, setProducts, products } = useStore();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setIsOnline]);

  useEffect(() => {
    if (isOnline) {
      syncService.processQueue();
      offlineService.syncQueue();
    }
  }, [isOnline]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={currentUser ? <Navigate to="/menu" /> : <Login />} />
        <Route path="/menu" element={currentUser ? <Menu /> : <Navigate to="/" />} />
        <Route path="/produtos" element={currentUser ? <Products /> : <Navigate to="/" />} />
        <Route path="/produtos/:id" element={currentUser ? <ProductDetail /> : <Navigate to="/" />} />
        <Route path="/separacao" element={currentUser ? <Separation /> : <Navigate to="/" />} />
        <Route path="/conferencia" element={currentUser ? <Conference /> : <Navigate to="/" />} />
        <Route path="/inventario" element={currentUser ? <InventoryManagement /> : <Navigate to="/" />} />
        <Route path="/inventario/:id" element={currentUser ? <InventoryDetail /> : <Navigate to="/" />} />
        <Route path="/kit-lampadas" element={currentUser ? <KitLampadas /> : <Navigate to="/" />} />
        <Route path="/estoque" element={currentUser ? <Stock /> : <Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
