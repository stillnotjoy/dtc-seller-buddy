import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { Trash2 } from "lucide-react";

export default function CustomersPage({ user }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadCustomers();
  }, [user]);

  async function loadCustomers() {
    setLoading(true);

    const { data, error } = await supabase
      .from("customers")
      .select("id, name, phone, notes")
      .eq("seller_id", user.id)
      .order("name", { ascending: true });

    if (error) {
      console.error(error);
      alert("Error loading customers: " + error.message);
      setLoading(false);
      return;
    }

    setCustomers(data || []);
    setLoading(false);
  }

  async function handleAddCustomer(e) {
    e.preventDefault();

    if (!user) {
      alert("Please log in again first.");
      return;
    }

    if (!name.trim()) {
      alert("Name is required.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("customers").insert({
      seller_id: user.id,
      name: name.trim(),
      phone: phone.trim() || null,
      notes: notes.trim() || null,
    });

    setSaving(false);

    if (error) {
      console.error(error);
      alert("Error saving customer: " + error.message);
      return;
    }

    setName("");
    setPhone("");
    setNotes("");
    loadCustomers();
  }

  async function handleDeleteCustomer(id) {
    if (!window.confirm("Delete this customer?")) return;

    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", id)
      .eq("seller_id", user.id);

    if (error) {
      console.error(error);
      alert("Error deleting: " + error.message);
      return;
    }

    setCustomers((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div>
      {/* Add customer */}
      <section className="card">
        <h2 className="card-title">Add Customer</h2>
        <form onSubmit={handleAddCustomer}>
          <input
            className="field"
            placeholder="Customer name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="field"
            placeholder="Phone (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <textarea
            className="field"
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving…" : "Add customer"}
          </button>
        </form>
      </section>

      {/* List */}
      <section className="card">
        <h2 className="card-title">Customers</h2>

        {loading ? (
          <p className="text-muted">Loading…</p>
        ) : customers.length === 0 ? (
          <p className="text-muted">No customers yet.</p>
        ) : (
          <ul className="customer-list">
            {customers.map((c) => (
              <li
                key={c.id}
                className="customer-item"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                {/* Left side: name + details */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                  }}
                >
                  <div className="customer-name">{c.name}</div>
                  {c.phone && (
                    <div className="customer-meta">{c.phone}</div>
                  )}
                  {c.notes && (
                    <div className="customer-meta">{c.notes}</div>
                  )}
                </div>

                {/* Right side: delete icon */}
                <button
  type="button"
  onClick={() => handleDeleteCustomer(c.id)}
  aria-label="Delete customer"
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = "translateY(-2px) scale(1.08)";
    e.currentTarget.style.background = "rgba(248, 113, 113, 0.15)";
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = "translateY(0) scale(1)";
    e.currentTarget.style.background = "transparent";
  }}
  onTouchStart={(e) => {
    e.currentTarget.style.transform = "scale(0.92)";
    e.currentTarget.style.background = "rgba(248, 113, 113, 0.25)";
  }}
  onTouchEnd={(e) => {
    e.currentTarget.style.transform = "scale(1)";
    e.currentTarget.style.background = "transparent";
  }}
  style={{
    width: 32,
    height: 32,
    borderRadius: 999,
    border: "none",
    background: "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#f97373",
    transition: "all 0.18s ease",
  }}
>
  <Trash2 size={16} />
</button>



              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
