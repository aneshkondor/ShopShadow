import { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { SignupPage } from './components/SignupPage';
import { ConnectionPage } from './components/ConnectionPage';
import { Dashboard } from './components/Dashboard';
import { CheckoutPage } from './components/CheckoutPage';
import { OrdersHistory } from './components/OrdersHistory';
import { ProductCatalog } from './components/ProductCatalog';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminOverview } from './components/admin/AdminOverview';
import { AdminOrders } from './components/admin/AdminOrders';
import { AdminProducts } from './components/admin/AdminProducts';
import { AdminUsers } from './components/admin/AdminUsers';
import { Toaster, toast } from 'sonner@2.0.3';
import { login as apiLogin, signup as apiSignup, storeAuthData, getAuthToken, getUser, clearAuthData, type User, type Device } from './utils/api';

type AppScreen = 
  | 'landing' 
  | 'login' 
  | 'signup' 
  | 'connection' 
  | 'dashboard' 
  | 'checkout' 
  | 'orders'
  | 'products'
  | 'admin';

type AdminPage = 'overview' | 'orders' | 'products' | 'users';

interface BasketItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

// Hardcoded test credentials (for demo mode only)
const TEST_CREDENTIALS = {
  email: 'demo@email.com',
  password: '1234',
};

// Admin credentials
const ADMIN_CREDENTIALS = {
  email: 'admin@email.com',
  password: '1111',
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('landing');
  const [adminPage, setAdminPage] = useState<AdminPage>('overview');
  const [isDemo, setIsDemo] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkoutData, setCheckoutData] = useState<{ items: BasketItem[]; total: number } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);

  // Check for existing auth on mount
  useEffect(() => {
    const token = getAuthToken();
    const savedUser = getUser();

    if (token && savedUser) {
      setAuthToken(token);
      setUser(savedUser);
      setIsAdmin(savedUser.role === 'admin');

      // If user was logged in, redirect to appropriate screen
      if (savedUser.role === 'admin') {
        setCurrentScreen('admin');
      } else {
        setCurrentScreen('connection');
      }
    }
  }, []);

  // Handler for login
  const handleLogin = async (email: string, password: string) => {
    try {
      // Call real login API
      const response = await apiLogin(email, password);

      // Store auth data
      storeAuthData(response.token, response.refreshToken, response.user);
      setAuthToken(response.token);
      setUser(response.user);

      // Check if admin
      if (response.user.role === 'admin') {
        toast.success('Admin login successful!', {
          duration: 2000,
          position: 'bottom-right',
          style: {
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(52, 211, 153, 0.3)',
            color: '#1e293b',
          },
        });
        setIsAdmin(true);
        setIsDemo(false);
        setCurrentScreen('admin');
        setAdminPage('overview');
      } else {
        toast.success('Successfully logged in!', {
          duration: 2000,
          position: 'bottom-right',
          style: {
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(52, 211, 153, 0.3)',
            color: '#1e293b',
          },
        });
        setIsDemo(false);
        setIsAdmin(false);
        setCurrentScreen('connection');
      }
    } catch (error: any) {
      toast.error(error.message || 'Login failed. Please try again.', {
        duration: 5000,
        position: 'bottom-right',
        style: {
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(248, 113, 113, 0.3)',
          color: '#1e293b',
        },
      });
    }
  };

  // Handler for signup
  const handleSignup = async (email: string, password: string, name: string) => {
    try {
      // Call real signup API
      const response = await apiSignup(name, email, password);

      // Store auth data
      storeAuthData(response.token, response.refreshToken, response.user);
      setAuthToken(response.token);
      setUser(response.user);

      toast.success('Account created successfully!', {
        duration: 2000,
        position: 'bottom-right',
        style: {
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(52, 211, 153, 0.3)',
          color: '#1e293b',
        },
      });
      setIsDemo(false);
      setIsAdmin(false);
      setCurrentScreen('connection');
    } catch (error: any) {
      toast.error(error.message || 'Signup failed. Please try again.', {
        duration: 5000,
        position: 'bottom-right',
        style: {
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(248, 113, 113, 0.3)',
          color: '#1e293b',
        },
      });
    }
  };

  // Handler for demo mode
  const handleTryDemo = () => {
    setIsDemo(true);
    setIsAdmin(false);
    setCurrentScreen('connection');
  };

  // Handler for successful connection
  const handleConnect = (device: Device) => {
    setConnectedDevice(device);
    setCurrentScreen('dashboard');
  };

  // Handler for logout
  const handleLogout = () => {
    clearAuthData();
    setAuthToken(null);
    setUser(null);
    setConnectedDevice(null);
    setIsDemo(false);
    setIsAdmin(false);
    setCurrentScreen('landing');
  };

  // Handler for checkout
  const handleCheckout = (items: BasketItem[], total: number) => {
    setCheckoutData({ items, total });
    setCurrentScreen('checkout');
  };

  // Handler for checkout completion
  const handleCheckoutComplete = () => {
    setCheckoutData(null);
    setCurrentScreen('dashboard');
  };

  return (
    <>
      {currentScreen === 'landing' && (
        <LandingPage
          onLogin={() => setCurrentScreen('login')}
          onTryDemo={handleTryDemo}
        />
      )}

      {currentScreen === 'login' && (
        <LoginPage
          onLogin={handleLogin}
          onBack={() => setCurrentScreen('landing')}
          onSwitchToSignup={() => setCurrentScreen('signup')}
        />
      )}

      {currentScreen === 'signup' && (
        <SignupPage
          onSignup={handleSignup}
          onBack={() => setCurrentScreen('landing')}
          onSwitchToLogin={() => setCurrentScreen('login')}
        />
      )}

      {currentScreen === 'connection' && (
        <ConnectionPage
          onConnect={handleConnect}
          onLogout={handleLogout}
          isDemo={isDemo}
          authToken={authToken}
          userId={user?.id || null}
        />
      )}

      {currentScreen === 'dashboard' && (
        <Dashboard
          onLogout={handleLogout}
          onCheckout={handleCheckout}
          onViewOrders={() => setCurrentScreen('orders')}
          onViewProducts={() => setCurrentScreen('products')}
          isDemo={isDemo}
          authToken={authToken}
          userId={user?.id || null}
          connectedDevice={connectedDevice}
        />
      )}

      {currentScreen === 'checkout' && checkoutData && (
        <CheckoutPage
          items={checkoutData.items}
          total={checkoutData.total}
          onBack={() => setCurrentScreen('dashboard')}
          onComplete={handleCheckoutComplete}
        />
      )}

      {currentScreen === 'orders' && (
        <OrdersHistory
          onBack={() => setCurrentScreen('dashboard')}
          onLogout={handleLogout}
        />
      )}

      {currentScreen === 'products' && (
        <ProductCatalog
          onBack={() => setCurrentScreen('dashboard')}
        />
      )}

      {currentScreen === 'admin' && (
        <AdminLayout
          currentPage={adminPage}
          onNavigate={setAdminPage}
          onLogout={handleLogout}
        >
          {adminPage === 'overview' && <AdminOverview />}
          {adminPage === 'orders' && <AdminOrders />}
          {adminPage === 'products' && <AdminProducts />}
          {adminPage === 'users' && <AdminUsers />}
        </AdminLayout>
      )}

      <Toaster />
    </>
  );
}
