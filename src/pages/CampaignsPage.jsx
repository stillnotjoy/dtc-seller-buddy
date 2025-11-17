import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function CampaignsPage({ user }) {
  const [brands, setBrands] = useState([]);
  const [brandId, setBrandId] = useState('');
  const [campaigns, setCampaigns] = useState([]);

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadBrands();
  }, [user]);

  useEffect(() => {
    if (!user || !brandId) {
      setCampaigns([]);
      return;
    }
    loadCampaigns(brandId);
  }, [user, brandId]);

  async function loadBrands() {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('brands')
      .select('id, name')
      .eq('seller_id', user.id)
      .order('name', { ascending: true });

    if (error) {
      console.error(error);
      alert('Error loading brands: ' + error.message);
      setLoading(false);
      return;
    }

    setBrands(data || []);
    setLoading(false);
  }

  async function loadCampaigns(brandIdValue) {
    const { data, error } = await supabase
      .from('campaigns')
      .select('id, name, start_date, end_date')
      .eq('seller_id', user.id)
      .eq('brand_id', brandIdValue)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      alert('Error loading campaigns: ' + error.message);
      return;
    }

    setCampaigns(data || []);
  }

  async function handleAddCampaign(e) {
    e.preventDefault();
    if (!user) return;

    if (!brandId) {
      alert('Please select a brand.');
      return;
    }
    if (!name.trim()) {
      alert('Please enter a campaign/brochure name.');
      return;
    }

    setSaving(true);

    const { error } = await supabase.from('campaigns').insert({
      seller_id: user.id,
      brand_id: brandId,
      name: name.trim(),
      start_date: startDate || null,
      end_date: endDate || null,
    });

    setSaving(false);

    if (error) {
      console.error(error);
      alert('Error saving campaign: ' + error.message);
      return;
    }

    setName('');
    setStartDate('');
    setEndDate('');
    if (brandId) {
      loadCampaigns(brandId);
    }
  }

  if (!user) {
    return <p className="text-muted">Loading account…</p>;
  }

  return (
    <div>
      {/* Select brand + add campaign */}
      <section className="card">
        <h2 className="card-title">Select brand</h2>

        {loading ? (
          <p className="text-muted">Loading brands…</p>
        ) : brands.length === 0 ? (
          <p className="text-muted">
            No brands yet. Add some in the <strong>Brands</strong> tab first.
          </p>
        ) : (
          <>
            <select
              className="field"
              value={brandId}
              onChange={e => setBrandId(e.target.value)}
            >
              <option value="">Select brand</option>
              {brands.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            <h3 className="card-subtitle">Add campaign / brochure</h3>

            <form onSubmit={handleAddCampaign}>
              <input
                className="field"
                placeholder="Campaign name (e.g. C24 2025, Brochure 12)"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={!brandId}
              />

              <div className="form-row">
                <div className="form-col">
                  <label className="label-small">Start date (optional)</label>
                  <input
                    type="date"
                    className="field"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    disabled={!brandId}
                  />
                </div>
                <div className="form-col">
                  <label className="label-small">End date (optional)</label>
                  <input
                    type="date"
                    className="field"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    disabled={!brandId}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={!brandId || saving}
              >
                {saving ? 'Saving…' : 'Save campaign'}
              </button>
            </form>
          </>
        )}
      </section>

      {/* List campaigns for selected brand */}
      <section className="card">
        <h2 className="card-title">Campaigns for selected brand</h2>

        {!brandId ? (
          <p className="text-muted">Select a brand above.</p>
        ) : campaigns.length === 0 ? (
          <p className="text-muted">No campaigns yet for this brand.</p>
        ) : (
          <ul className="customer-list">
            {campaigns.map(c => (
              <li key={c.id} className="customer-item">
                <div className="customer-name">{c.name}</div>
                <div className="order-meta">
                  {c.start_date && c.end_date
                    ? `${c.start_date} — ${c.end_date}`
                    : c.start_date
                    ? `From ${c.start_date}`
                    : c.end_date
                    ? `Until ${c.end_date}`
                    : 'No dates set'}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
