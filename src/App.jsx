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

  // Main bottom nav tabs: dashboard | sales | customers | more
  const [tab, setTab] = useState("dashboard");

  // Internal tabs inside Sales: orders | credit | payments | brands | products
  const [salesTab, setSalesTab] = useState("orders");

  const [authMode, setAuthMode] = useState("login"); // login | forgot
  const [resetMode, setResetMode] = useState(false); // true when resetting password
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const [notifications, setNotifications] = useState([]);

  const tabLabels = {
    dashboard: "Dashboard",
    sales: "Sales",
    customers: "Customers",
    more: "More",
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

  // Scroll to top when main tab changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [tab]);

  async function handleLogout() {
    await supabase.auth.signOut();
    setTab("dashboard");
    setUserMenuOpen(false);
    setUser(null);
    setAuthMode("login");
  }

  const userInitial = user?.email?.[0]?.toUpperCase() || "U";

  // ---------- Notification helpers ----------
  async function ensureNotificationPermission() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      console.log("Browser notifications not supported.");
      return "unsupported";
    }

    if (Notification.permission === "granted") return "granted";
    if (Notification.permission === "denied") return "denied";

    const result = await Notification.requestPermission();
    return result;
  }

  async function loadNotifications() {
    if (!user) return [];

    const todayStr = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        id,
        order_date,
        due_date,
        total_srp,
        paid_amount,
        status,
        payment_type,
        customers ( name )
      `
      )
      .eq("seller_id", user.id)
      .in("payment_type", ["utang", "credit"])
      .eq("status", "pending")
      .gte("due_date", todayStr)
      .order("due_date", { ascending: true })
      .limit(10);

    if (error) {
      console.error("Error loading notifications:", error);
      setNotifications([]);
      return [];
    }

    const list = data || [];
    setNotifications(list);
    return list;
  }

  function showOrderNotification(order) {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    ) {
      return;
    }

    const total = order.total_srp || 0;
    const paid = order.paid_amount || 0;
    const remaining = Math.max(0, total - paid);
    const customerName = order.customers?.name || "Customer";
    const dueDate = order.due_date || "";

    const title = `Credit due: ${customerName}`;
    const body = `Balance ₱${remaining} • Due on ${dueDate}`;

    try {
      new Notification(title, {
        body,
        icon: "/dimerr-logo.png",
      });
    } catch (err) {
      console.error("Error creating notification:", err);
      alert(
        `Reminder for ${customerName} (₱${remaining} due on ${dueDate}).\nYour system blocked the visual notification.`
      );
    }
  }

  async function handleBellClick() {
    console.log("Bell clicked – running notification function");

    const perm = await ensureNotificationPermission();
    console.log("Notification permission:", perm);

    if (perm === "unsupported") {
      alert("This browser does not support notifications.");
      return;
    }

    if (perm === "denied") {
      alert(
        "Notifications are blocked for this site in your browser settings. Please allow them in Chrome → Site settings → Notifications."
      );
      return;
    }

    if (perm === "default") {
      alert(
        "Notification permission wasn’t granted. Please click the bell again and choose 'Allow'."
      );
      return;
    }

    const list = await loadNotifications();

    if (!list || list.length === 0) {
      try {
        new Notification("Dimerr", {
          body: "You have no pending credit orders. 🎉",
          icon: "/dimerr-logo.png",
        });
      } catch {
        alert("You have no pending credit orders. 🎉");
      }
      return;
    }

    const soonest = [...list].sort(
      (a, b) => new Date(a.due_date) - new Date(b.due_date)
    )[0];

    showOrderNotification(soonest);

    const name = soonest.customers?.name || "customer";
    alert(`Reminder sent for ${name}'s next credit payment.`);
  }

  // Small helper to always scroll content to top
  function goToTop() {
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function handleMainTabChange(nextTab) {
    setTab(nextTab);
    goToTop();
  }

  function handleSalesTabChange(nextSalesTab) {
    setSalesTab(nextSalesTab);
    goToTop();
  }

  // ---------- Loading state ----------
  if (authLoading) {
    return (
      <div className="app-root app-root--auth">
        <div className="app-shell app-shell--auth">
          <div className="loading-screen">Checking session…</div>
        </div>
      </div>
    );
  }

  // ---------- Reset password flow ----------
  if (resetMode) {
    return (
      <div className="app-root app-root--auth">
        <div className="app-shell app-shell--auth">
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
      <div className="app-root app-root--auth">
        <div className="app-shell app-shell--auth">
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
        {/* Header – flat like YouTube, no separated card */}
        <header className="app-header app-header--flat">
          <div className="app-header-left">
            <img src={dimerrLogo} alt="Dimerr" className="app-logo" />
            <div className="app-title-block">
              <h1 className="app-title">Dimerr</h1>
              <p className="app-subtitle">Seller tools. simplified.</p>
            </div>
          </div>

          <div className="app-header-right">
            <button
              type="button"
              className="icon-circle"
              aria-label="Notifications"
              onClick={handleBellClick}
            >
              <Bell size={18} className="icon-gray" />
            </button>

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

        {/* Page header (simple, lives in content area) */}
        <div className="page-header">
          <h2 className="page-title">{tabLabels[tab] || ""}</h2>
        </div>

        {/* Main content */}
        <main className="app-main">
          {tab === "dashboard" && <DashboardPage user={user} />}

          {tab === "customers" && <CustomersPage user={user} />}

          {tab === "sales" && (
            <div className="sales-page">
              <SalesTabs
                salesTab={salesTab}
                setSalesTab={handleSalesTabChange}
              />
              <div className="sales-page-inner">
                {salesTab === "orders" && <OrdersPage user={user} />}
                {salesTab === "credit" && <UtangPage user={user} />}
                {salesTab === "payments" && <PaymentsPage user={user} />}
                {salesTab === "brands" && <BrandsPage user={user} />}
                {salesTab === "products" && <ProductsPage user={user} />}
              </div>
            </div>
          )}

          {tab === "more" && (
            <div className="card card-dashboard">
              <h2 className="card-title">More</h2>
              <p className="text-muted">
                Settings and extra tools will live here soon.
              </p>
            </div>
          )}
        </main>

        {/* Fixed bottom nav with 4 tabs */}
        <nav className="bottom-nav">
          <button
            type="button"
            className={`nav-button ${
              tab === "dashboard" ? "nav-button--active" : ""
            }`}
            onClick={() => setTab("dashboard")}
          >
            <span className="nav-button-icon">
              <LayoutDashboard size={22} />
            </span>
            <span className="nav-button-label">Dashboard</span>
          </button>

          <button
            type="button"
            className={`nav-button ${
              tab === "sales" ? "nav-button--active" : ""
            }`}
            onClick={() => setTab("sales")}
          >
            <span className="nav-button-icon">
              <ShoppingCart size={22} />
            </span>
            <span className="nav-button-label">Sales</span>
          </button>

          <button
            type="button"
            className={`nav-button ${
              tab === "customers" ? "nav-button--active" : ""
            }`}
            onClick={() => setTab("customers")}
          >
            <span className="nav-button-icon">
              <Users size={22} />
            </span>
            <span className="nav-button-label">Customers</span>
          </button>

          <button
            type="button"
            className={`nav-button ${
              tab === "more" ? "nav-button--active" : ""
            }`}
            onClick={() => setTab("more")}
          >
            <span className="nav-button-icon">
              <Info size={22} />
            </span>
            <span className="nav-button-label">More</span>
          </button>
        </nav>
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
        <Icon size={22} />
      </span>
      <span className="nav-button-label">{label}</span>
    </button>
  );
}

/**
 * Internal Sales tabs: Orders / Credit / Payments / Brands / Products
 */
function SalesTabs({ salesTab, setSalesTab }) {
  const tabs = [
    { id: "orders", label: "Orders", Icon: ShoppingCart },
    { id: "credit", label: "Credit", Icon: Wallet },
    { id: "payments", label: "Payments", Icon: CreditCard },
    { id: "brands", label: "Brands", Icon: Tag },
    { id: "products", label: "Products", Icon: Package },
  ];

  return (
    <div className="sales-tabs">
      {tabs.map((t) => {
        const active = salesTab === t.id;
        const Icon = t.Icon;
        return (
          <button
            key={t.id}
            type="button"
            className={`sales-tab ${active ? "sales-tab--active" : ""}`}
            onClick={() => setSalesTab(t.id)}
          >
            <Icon size={14} className="sales-tab-icon" />
            <span className="sales-tab-label">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default App;
