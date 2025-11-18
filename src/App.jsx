import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

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
      (_event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => {
      subscription.subscription.unsubscribe();
    };
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

  if (!user) {
    return (
      <div className="app-root">
        <div className="app-shell">
          <AuthPage />
        </div>
      </div>
    );
  }

  return (
    <div className="app-root">
      <div className="app-shell">
        {/* Header */}
        <header className="app-header">
          <div className="app-header-top">
            <div>
              <div className="app-title">DTC Seller Buddy</div>
              <div className="app-subtitle">For PC, Avon, Natasha &amp; more</div>
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

              <div className="app-badge">
                {tabLabels[tab]?.toUpperCase() || 'DASHBOARD'}
              </div>
            </div>
          </div>

          <div className="app-desc">
            Track customers, orders, profit &amp; credit in one place.
          </div>
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
