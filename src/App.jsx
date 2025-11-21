import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';

import AuthPage from './pages/AuthPage';
import CustomersPage from './pages/CustomersPage';
import BrandsPage from './pages/BrandsPage';
import OrdersPage from './pages/OrdersPage';
import UtangPage from './pages/UtangPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import PaymentsPage from './pages/PaymentsPage';

import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  CreditCard,
  Wallet,
  Tag,
  Package,
} from 'lucide-react';

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tab, setTab] = useState('dashboard');

  // authMode: "login" | "forgot"
  const [authMode, setAuthMode] = useState('login');
  // resetMode: true when coming from Supabase recovery link
  const [resetMode, setResetMode] = useState(false);

  const tabLabels = {
    dashboard: 'Dashboard',
    customers: 'Customers',
    orders: 'Orders',
    credit: 'Credit',
    payments: 'Payments',
    brands: 'Brands',
    products: 'Products',
  };

  // Supabase auth listener
  useEffect(() => {
    async function getInitialUser() {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) {
        setUser(data.user);
      }
      setAuthLoading(false);
    }

    getInitialUser();

  const { data: subscription } = supabase.auth.onAuthStateChange(
  (event, session) => {
    setUser(session?.user || null);

    // When user comes from a password recovery email,
    // Supabase sends this event.
    if (event === 'PASSWORD_RECOVERY') {
      setResetMode(true);
    }
  }
);


    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  // Detect Supabase password recovery link (?type=recovery)
  useEffect(() => {
  try {
    const url = new URL(window.location.href);

    // ?type=recovery (query string)
    const typeFromQuery = url.searchParams.get('type');

    // #access_token=...&type=recovery (hash fragment)
    const hash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
    const hashParams = new URLSearchParams(hash);
    const typeFromHash = hashParams.get('type');

    if (typeFromQuery === 'recovery' || typeFromHash === 'recovery') {
      setResetMode(true);
    }
  } catch (e) {
    // ignore
  }
}, []);


  function scrollNav(amount) {
    const nav = document.getElementById('bottomNav');
    if (nav) {
      nav.scrollBy({ left: amount, behavior: 'smooth' });
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setTab('dashboard');
  }

  if (authLoading) {
    return (
      <div className="app-root">
        <div className="app-shell">
          <div className="loading-screen">Checking session…</div>
        </div>
      </div>
    );
  }

  // If Supabase sent the user to reset password
  if (resetMode) {
    return (
      <div className="app-root">
        <div className="app-shell">
          <ResetPasswordPage
            onBackToLogin={async () => {
              setResetMode(false);
              await supabase.auth.signOut();
              setUser(null);
              setAuthMode('login');
            }}
          />
        </div>
      </div>
    );
  }

  // If user NOT logged in → show Auth or Forgot screen
  if (!user) {
    return (
      <div className="app-root">
        <div className="app-shell">
          {authMode === 'login' && (
            <AuthPage onForgotPassword={() => setAuthMode('forgot')} />
          )}

          {authMode === 'forgot' && (
            <ForgotPasswordPage onBackToLogin={() => setAuthMode('login')} />
          )}
        </div>
      </div>
    );
  }

  // Logged in → main app
  return (
    <div className="app-root">
      <div className="app-shell">
        {/* Header */}
        <header className="app-header">
          <div className="app-header-top">
            <div className="app-header-left">
              <h1 className="app-title">DTC Seller Buddy</h1>
              <p className="app-subtitle">For PC, Avon, Natasha &amp; more</p>
            </div>

            <div className="app-header-right">
              {user && (
                <div className="app-user-chip">
                  <span className="app-user-email">{user.email}</span>
                  <button
                    type="button"
                    className="btn-chip"
                    onClick={handleLogout}
                  >
                    Log out
                  </button>
                </div>
              )}

              <div className="app-current-tab">
                {tabLabels[tab]?.toUpperCase()}
              </div>
            </div>
          </div>

          <p className="app-subdesc">
            Track customers, orders, profit &amp; credit in one place.
          </p>
        </header>

        {/* Main content */}
        <main className="app-main">
          {tab === 'dashboard' && <DashboardPage user={user} />}
          {tab === 'customers' && <CustomersPage user={user} />}
          {tab === 'orders' && <OrdersPage user={user} />}
          {tab === 'credit' && <UtangPage user={user} />}
          {tab === 'payments' && <PaymentsPage user={user} />}
          {tab === 'brands' && <BrandsPage user={user} />}
          {tab === 'products' && <ProductsPage user={user} />}
        </main>

        {/* Bottom nav with icons */}
        <div className="nav-wrapper">
          <button
            className="nav-arrow left"
            type="button"
            onClick={() => scrollNav(-120)}
          >
            ◀
          </button>

          <nav id="bottomNav" className="bottom-nav-scroll">
            <NavButton
              label="Dashboard"
              tab="dashboard"
              current={tab}
              setTab={setTab}
              Icon={LayoutDashboard}
            />
            <NavButton
              label="Customers"
              tab="customers"
              current={tab}
              setTab={setTab}
              Icon={Users}
            />
            <NavButton
              label="Orders"
              tab="orders"
              current={tab}
              setTab={setTab}
              Icon={ShoppingCart}
            />
            <NavButton
              label="Credit"
              tab="credit"
              current={tab}
              setTab={setTab}
              Icon={CreditCard}
            />
            <NavButton
              label="Payments"
              tab="payments"
              current={tab}
              setTab={setTab}
              Icon={Wallet}
            />
            <NavButton
              label="Brands"
              tab="brands"
              current={tab}
              setTab={setTab}
              Icon={Tag}
            />
            <NavButton
              label="Products"
              tab="products"
              current={tab}
              setTab={setTab}
              Icon={Package}
            />
          </nav>

          <button
            className="nav-arrow right"
            type="button"
            onClick={() => scrollNav(120)}
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  );
}

function NavButton({ label, tab, current, setTab, Icon }) {
  const active = current === tab;
  return (
    <button
      type="button"
      className={`nav-button ${active ? 'nav-button--active' : ''}`}
      onClick={() => setTab(tab)}
    >
      <span className="nav-button-icon">
        <Icon size={16} />
      </span>
      <span>{label}</span>
    </button>
  );
}

export default App;
