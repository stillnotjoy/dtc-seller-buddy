import { Link } from "react-router-dom";

export default function SalesTabs({ active }) {
  const tabs = [
    { id: "orders", label: "Orders", link: "/orders" },
    { id: "credit", label: "Credit", link: "/utang" },
    { id: "payments", label: "Payments", link: "/payments" },
    { id: "brands", label: "Brands", link: "/brands" },
    { id: "products", label: "Products", link: "/products" }
  ];

  return (
    <div className="flex overflow-x-auto gap-3 py-2 px-1 mb-3">
      {tabs.map(t => (
        <Link
          key={t.id}
          to={t.link}
          className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all ${
            active === t.id
              ? "bg-[#0B63C9] text-white shadow-md"
              : "bg-white text-gray-700 border"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
