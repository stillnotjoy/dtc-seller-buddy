import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function BrandsPage({ user }) {
  const [brands, setBrands] = useState([]);
  const [name, setName] = useState('');
  const [defaultMargin, setDefaultMargin] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load brands once we have a user
  useEffect(() => {
    if (!user) return;
    loadBrands();
  }, [user]);

  async function loadBrands() {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('brands')
      .select('id, name, default_margin_percent')
      .eq('seller_id', user.id)
      .order('name', { ascending: true });

    if (error) {
      console.error(error);
      alert('Error loading brands: ' + error.message);
    } else {
      setBrands(data || []);
    }

    setLoading(false);
  }

  async function handleAddBrand(e) {
    e.preventDefault();

    if (!user) {
      alert('Please log in again.');
      return;
    }

    if (!name.trim()) {
      alert('Please enter a brand name.');
      return;
    }

    const marginValue = defaultMargin
      ? Number(defaultMargin)
      : null;

    if (defaultMargin && isNaN(marginValue)) {
      alert('Default margin must be a number (or leave it blank).');
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from('brands')
      .insert({
        seller_id: user.id,                // 👈 key part
        name: name.trim(),
        default_margin_percent: marginValue,
      });

    setSaving(false);

    if (error) {
      console.error(error);
      alert('Error saving brand: ' + error.message);
      return;
    }

    // reset inputs + refresh list
    setName('');
    setDefaultMargin('');
    loadBrands();
  }

  if (!user) {
    return <p className="text-muted">Loading account…</p>;
  }

  return (
    <div>
      {/* Add brand card */}
      <section className="card">
        <h2 className="card-title">Add brand</h2>

        <form onSubmit={handleAddBrand}>
          <input
            className="field"
            placeholder="Brand name (e.g. Avon)"
            value={name}
            onChange={e => setName(e.target.value)}
          />

          <input
            className="field"
            placeholder="Default margin % (optional)"
            value={defaultMargin}
            onChange={e => setDefaultMargin(e.target.value)}
          />

          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
          >
            {saving ? 'Saving…' : 'Save brand'}
          </button>
        </form>
      </section>

      {/* Existing brands */}
      <section className="card">
        <h2 className="card-title">Brands</h2>

        {loading ? (
          <p className="text-muted">Loading brands…</p>
        ) : brands.length === 0 ? (
          <p className="text-muted">No brands yet.</p>
        ) : (
          <ul className="customer-list">
            {brands.map(b => (
              <li key={b.id} className="customer-item">
                <div className="customer-name">{b.name}</div>
                <div className="order-meta">
                  {b.default_margin_percent != null
                    ? `Default margin: ${b.default_margin_percent}%`
                    : 'No default margin set'}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
