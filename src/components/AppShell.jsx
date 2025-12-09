import { Link } from "react-router-dom";

export default function AppShell({ children, active }) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      
      {/* Header */}
      <div className="bg-[#0B63C9] text-white py-4 px-5 flex items-center justify-between shadow-md">
        <div className="font-semibold text-lg tracking-wide">Dimerr</div>
        <div className="flex gap-4 items-center">
          <button className="opacity-90">🔔</button>
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">
            G
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 px-4 py-4">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t shadow-sm flex justify-around py-2">
        <NavItem label="Dashboard" icon="📊" active={active === 'dashboard'} link="/" />
        <NavItem label="Sales" icon="🛒" active={active === 'sales'} link="/orders" />
        <NavItem label="Customers" icon="👥" active={active === 'customers'} link="/customers" />
        <NavItem label="More" icon="⋯" active={active === 'more'} link="/more" />
      </nav>

    </div>
  );
}

function NavItem({ label, icon, active, link }) {
  return (
    <Link to={link} className="flex flex-col items-center">
      <div className={`${active ? "text-[#0B63C9]" : "text-gray-400"} text-xl`}>
        {icon}
      </div>
      <span className={`text-xs ${active ? "text-[#0B63C9]" : "text-gray-400"}`}>
        {label}
      </span>
    </Link>
  );
}
