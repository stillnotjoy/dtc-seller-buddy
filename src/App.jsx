import dimerrLogo from "/dimerr-logo.png";

import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";

import AuthPage from "./pages/AuthPage";
import CustomersPage from "./pages/CustomersPage";
import BrandsPage from "./pages/BrandsPage";
import OrdersPage from "./pages/OrdersPage";
import UtangPage from "./pages/UtangPage";
import DashboardPage from "./pages/DashboardPage";
import ProductsPage from "./pages/ProductsPage";
import PaymentsPage from "./pages/PaymentsPage";

import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  CreditCard,
  Wallet,
  Tag,
  Package,
  Bell,
  Info,
} from "lucide-react";

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tab, setTab] = useState("dashboard");

  const [authMode, setAuthMode] = useState("login"); // login | forgot
  const [resetMode, setResetMode] = useState(false); // true when resetting password
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const tabLabels = {
    dashboard: "Dashboard",
    customers: "Customers",
    orders: "Orders",
    credit: "Credit",
    payments: "Payments",
    brands: "Brands",
    products: "Products",
  };

  // ---------- Supabase auth ----------
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

  // Detect reset link (?type=recovery)
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const type = url.searchParams.get("type");
      if (type === "recovery") {
        setResetMode(true);
      }
    } catch {
      // ignore
    }
  }, []);

  function scrollNav(amount) {
    const nav = document.getElementById("bottomNav");
    if (nav) {
      nav.scrollBy({ left: amount, behavior: "smooth" });
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setTab("dashboard");
    setUserMenuOpen(false);
    setUser(null);
    setAuthMode("login");
  }

  const userInitial = user?.email?.[0]?.toUpperCase() || "U";

  // ---------- Loading state ----------
  if (authLoading) {
    return (
      <div className="app-root">
        <div className="app-shell">
          <div className="loading-screen">Checking session…</div>
        </div>
      </div>
    );
  }

  // ---------- Reset password flow ----------
  if (resetMode) {
    return (
      <div className="app-root">
        <div className="app-shell">
          <ResetPasswordPage
            onBackToLogin={async () => {
              setResetMode(false);
              await supabase.auth.signOut();
              setUser(null);
              setAuthMode("login");
            }}
          />
        </div>
      </div>
    );
  }

  // ---------- Not logged in ----------
  if (!user) {
    return (
      <div className="app-root">
        <div className="app-shell">
          {authMode === "login" && (
            <AuthPage onForgotPassword={() => setAuthMode("forgot")} />
          )}

          {authMode === "forgot" && (
            <ForgotPasswordPage onBackToLogin={() => setAuthMode("login")} />
          )}
        </div>
      </div>
    );
  }

  // ---------- Logged in ----------
  return (
    <div className="app-root">
      <div className="app-shell">
        {/* This wrapper makes header, page title and cards share the SAME width */}
        <div className="app-inner">
          {/* Header */}
          <header className="app-header">
            <div className="app-header-left">
              <img src={dimerrLogo} alt="Dimerr" className="app-logo" />

              <div className="app-title-block">
                <h1 className="app-title">Dimerr</h1>
                <p className="app-subtitle">Seller tools. simplified.</p>
              </div>
            </div>

            <div className="app-header-right">
              {/* Bell icon */}
              <button
                type="button"
                className="icon-circle"
                aria-label="Notifications"
              >
                <Bell size={18} className="icon-gray" />
              </button>

              {/* User avatar + dropdown */}
              <div className="user-menu-wrapper">
                <button
                  type="button"
                  className="user-avatar-circle"
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  aria-label="Account menu"
                >
                  {userInitial}
                </button>

                {userMenuOpen && (
                  <div className="user-menu-dropdown">
                    <div className="user-menu-email">{user?.email}</div>
                    <button
                      type="button"
                      className="btn-secondary btn-small user-menu-logout"
                      onClick={handleLogout}
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Page header (Dashboard / Customers / etc) */}
          <div className="page-header">
            <h2 className="page-title">
              {tabLabels[tab]}
              <button
                type="button"
                className="info-icon"
                aria-label="About this page"
                title={
                  tab === "dashboard"
                    ? "Overview of your sales, cost, profit and credit."
                    : tabLabels[tab]
                }
              >
                <Info size={14} />
              </button>
            </h2>
          </div>

          {/* Main content cards */}
          <main className="app-main">
            {tab === "dashboard" && <DashboardPage user={user} />}
            {tab === "customers" && <CustomersPage user={user} />}
            {tab === "orders" && <OrdersPage user={user} />}
            {tab === "credit" && <UtangPage user={user} />}
            {tab === "payments" && <PaymentsPage user={user} />}
            {tab === "brands" && <BrandsPage user={user} />}
            {tab === "products" && <ProductsPage user={user} />}
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
    </div>
  );
}

function NavButton({ label, tab, current, setTab, Icon }) {
  const active = current === tab;
  return (
    <button
      type="button"
      className={`nav-button ${active ? "nav-button--active" : ""}`}
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
