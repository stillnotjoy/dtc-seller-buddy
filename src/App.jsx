import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

import AuthPage from './pages/AuthPage';
import CustomersPage from './pages/CustomersPage';
import BrandsPage from './pages/BrandsPage';
import CampaignsPage from './pages/CampaignsPage';
import OrdersPage from './pages/OrdersPage';
import UtangPage from './pages/UtangPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import { User, Package, Wallet, Megaphone, Tags, ShoppingBag, BarChart3 } from 'lucide-react';


function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tab, setTab] = useState('customers');


  const tabLabels = {
    customers: 'Customers',
    orders: 'Orders',
    utang: 'Utang',
    campaigns: 'Campaigns',
    brands: 'Brands',
    products: 'Products',
    dashboard: 'Dashboard',
    
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
    setTab('customers');
  }

  // While checking session
  if (authLoading) {
    return (
      <div className="app-root">
        <div className="app-shell">
          <div className="loading-screen">Checking session…</div>
        </div>
      </div>
    );
  }

  // No user → show auth page
  if (!user) {
    return (
      <div className="app-root">
        <div className="app-shell">
          <AuthPage />
        </div>
      </div>
    );
  }

  // Logged in → show main app
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
    Track customers, orders, profit &amp; utang in one place.
  </div>
</header>


        {/* Main content */}
        <main className="app-main">
  {tab === 'customers' && <CustomersPage user={user} />}
  {tab === 'orders' && <OrdersPage user={user} />}   {/* 👈 THIS */}
  {tab === 'utang' && <UtangPage user={user} />}
  {tab === 'campaigns' && <CampaignsPage user={user} />}
  {tab === 'brands' && <BrandsPage user={user} />}
  {tab === 'products' && <ProductsPage user={user} />}
  {tab === 'dashboard' && <DashboardPage user={user} />}
</main>




        {/* Bottom nav with scroll + arrows */}
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
    label="Customers"
    tab="customers"
    current={tab}
    setTab={setTab}
    icon={<User size={18} />}
  />
  <NavButton
    label="Orders"
    tab="orders"
    current={tab}
    setTab={setTab}
    icon={<Package size={18} />}
  />
  <NavButton
    label="Utang"
    tab="utang"
    current={tab}
    setTab={setTab}
    icon={<Wallet size={18} />}
  />
  <NavButton
    label="Campaigns"
    tab="campaigns"
    current={tab}
    setTab={setTab}
    icon={<Megaphone size={18} />}
  />
  <NavButton
    label="Brands"
    tab="brands"
    current={tab}
    setTab={setTab}
    icon={<Tags size={18} />}
  />
  <NavButton
    label="Dashboard"
    tab="dashboard"
    current={tab}
    setTab={setTab}
    icon={<BarChart3 size={18} />}
  />
  <NavButton
    label="Products"
    tab="products"
    current={tab}
    setTab={setTab}
    icon={<ShoppingBag size={18} />}
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
function NavButton({ label, tab, current, setTab, icon }) {
  const active = current === tab;

  return (
    <button
      type="button"
      className={`nav-button ${active ? 'nav-button--active' : ''}`}
      onClick={() => setTab(tab)}
    >
      <div className="nav-icon">{icon}</div>
      <span className="nav-label">{label}</span>
    </button>
  );
}


export default App;
