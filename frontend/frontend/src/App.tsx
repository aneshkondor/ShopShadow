import { useState } from 'react';
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

// Hardcoded test credentials
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

  // Handler for login
  const handleLogin = (email: string, password: string) => {
    // Check if admin
    if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
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
      return;
    }

    // Check against regular user credentials
    if (email === TEST_CREDENTIALS.email && password === TEST_CREDENTIALS.password) {
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
    } else {
      toast.error('Invalid credentials. Try demo@email.com / 1234 or admin@email.com / 1111', {
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
  const handleSignup = (email: string, password: string, name: string) => {
    // TODO: Integrate with PostgreSQL database to create account
    console.log('Signup attempt:', { email, password, name });
    
    // For now, simulate successful signup and auto-login
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
  };

  // Handler for demo mode
  const handleTryDemo = () => {
    setIsDemo(true);
    setIsAdmin(false);
    setCurrentScreen('connection');
  };

  // Handler for successful connection
  const handleConnect = () => {
    setCurrentScreen('dashboard');
  };

  // Handler for logout
  const handleLogout = () => {
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
        />
      )}

      {currentScreen === 'dashboard' && (
        <Dashboard
          onLogout={handleLogout}
          onCheckout={handleCheckout}
          onViewOrders={() => setCurrentScreen('orders')}
          onViewProducts={() => setCurrentScreen('products')}
          isDemo={isDemo}
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
