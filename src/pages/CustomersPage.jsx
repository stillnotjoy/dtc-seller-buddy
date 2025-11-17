import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function CustomersPage({ user }) {
  const [customers, setCustomers] = useState([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load customers for this logged-in user
  useEffect(() => {
    if (!user) return; // wait until auth has loaded
    loadCustomers();
  }, [user]);

  async function loadCustomers() {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('customers')
      .select('id, name, phone, notes')
      .eq('seller_id', user.id)          // 👈 filter by current user
      .order('name', { ascending: true });

    if (error) {
      console.error(error);
      alert('Error loading customers: ' + error.message);
    } else {
      setCustomers(data || []);
    }

    setLoading(false);
  }

  async function handleAddCustomer(e) {
    e.preventDefault();

    if (!user) {
      alert('Please log in again first.');
      return;
    }

    if (!name.trim()) {
      alert('Name is required.');
      return;
    }

    setSaving(true);

    const { error } = await supabase.from('customers').insert({
      seller_id: user.id,                // 👈 use auth user id
      name: name.trim(),
      phone: phone.trim() || null,
      notes: notes.trim() || null,
    });

    setSaving(false);

    if (error) {
      console.error(error);
      alert('Error saving customer: ' + error.message);
      return;
    }

    // Clear form + refresh list
    setName('');
    setPhone('');
    setNotes('');
    loadCustomers();
  }

  // While auth is still loading
  if (!user) {
    return <p className="text-muted">Loading account…</p>;
  }

  return (
    <div>
      {/* Add customer card */}
      <section className="card">
        <h2 className="card-title">Add customer</h2>

        <form onSubmit={handleAddCustomer}>
          <input
            className="field"
            placeholder="Name *"
            value={name}
            onChange={e => setName(e.target.value)}
          />

          <input
            className="field"
            placeholder="Phone"
            value={phone}
            onChange={e => setPhone(e.target.value)}
          />

          <textarea
            className="field"
            placeholder="Notes (e.g. pays every 15 & 30)"
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />

          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save customer'}
          </button>
        </form>
      </section>

      {/* Customers list card */}
      <section className="card">
        <h2 className="card-title">Customers</h2>

        {loading ? (
          <p className="text-muted">Loading customers…</p>
        ) : customers.length === 0 ? (
          <p className="text-muted">No customers yet.</p>
        ) : (
          <ul className="customer-list">
            {customers.map(c => (
              <li key={c.id} className="customer-item">
                <div className="customer-name">{c.name}</div>
                {c.phone && (
                  <div className="customer-meta">
                    {c.phone}
                  </div>
                )}
                {c.notes && (
                  <div className="customer-notes">
                    {c.notes}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
