import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function ProductsPage({ user }) {
  const [brands, setBrands] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // form fields
  const [name, setName] = useState('');
  const [brandId, setBrandId] = useState('');
  const [type, setType] = useState('');
  const [variantName, setVariantName] = useState('');
  const [volume, setVolume] = useState('');

  useEffect(() => {
    if (!user) return;
    loadLookups();
  }, [user]);

  async function loadLookups() {
    if (!user) return;
    setLoading(true);

    // load brands & products in parallel
    const [brandRes, productRes] = await Promise.all([
      supabase
        .from('brands')
        .select('id, name')
        .eq('seller_id', user.id)
        .order('name', { ascending: true }),
      supabase
        .from('products')
        .select('id, name, type, variant_name, volume, brand_id')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false }),
    ]);

    if (brandRes.error) {
      console.error(brandRes.error);
      alert('Error loading brands: ' + brandRes.error.message);
    } else {
      setBrands(brandRes.data || []);
    }

    if (productRes.error) {
      console.error(productRes.error);
      alert('Error loading products: ' + productRes.error.message);
    } else {
      setProducts(productRes.data || []);
    }

    setLoading(false);
  }

  async function handleAddProduct(e) {
    e.preventDefault();
    if (!user) return;

    if (!name.trim()) {
      alert('Please enter a product name.');
      return;
    }

    setSaving(true);

    const { error } = await supabase.from('products').insert({
      seller_id: user.id,          // 🔑 IMPORTANT
      brand_id: brandId || null,   // optional
      name: name.trim(),
      type: type.trim() || null,
      variant_name: variantName.trim() || null,
      volume: volume.trim() || null,
    });

    setSaving(false);

    if (error) {
      console.error(error);
      alert('Error saving product: ' + error.message);
      return;
    }

    // reset form
    setName('');
    setBrandId('');
    setType('');
    setVariantName('');
    setVolume('');

    // reload list
    loadLookups();
  }

  async function handleDeleteProduct(id) {
    if (!user) return;
    const ok = window.confirm('Delete this product?');
    if (!ok) return;

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('seller_id', user.id); // safety: only your own rows

    if (error) {
      console.error(error);
      alert('Error deleting product: ' + error.message);
      return;
    }

    // update local list
    setProducts(prev => prev.filter(p => p.id !== id));
  }

  function formatProductLabel(p) {
    const bits = [p.name];
    const extras = [];
    if (p.type) extras.push(p.type);
    if (p.variant_name) extras.push(p.variant_name);
    if (p.volume) extras.push(p.volume);
    if (extras.length > 0) bits.push('— ' + extras.join(' • '));
    return bits.join(' ');
  }

  if (!user) {
    return <p className="text-muted">Loading account…</p>;
  }

  return (
    <div>
      {/* Add product */}
      <section className="card">
        <h2 className="card-title">Add product</h2>

        {loading && products.length === 0 ? (
          <p className="text-muted">Loading…</p>
        ) : (
          <form onSubmit={handleAddProduct}>
            <input
              className="field"
              placeholder="Product name (e.g. Hand & Body Lotion)"
              value={name}
              onChange={e => setName(e.target.value)}
            />

            <select
              className="field"
              value={brandId}
              onChange={e => setBrandId(e.target.value)}
            >
              <option value="">
                {brands.length === 0
                  ? 'No brands yet (optional)'
                  : 'Brand (optional)'}
              </option>
              {brands.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            <input
              className="field"
              placeholder="Type (e.g. Lotion, Perfume, Lipstick)"
              value={type}
              onChange={e => setType(e.target.value)}
            />

            <input
              className="field"
              placeholder="Variant / scent / shade (optional)"
              value={variantName}
              onChange={e => setVariantName(e.target.value)}
            />

            <input
              className="field"
              placeholder="Volume (e.g. 200 ml, 50 g)"
              value={volume}
              onChange={e => setVolume(e.target.value)}
            />

            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : 'Save product'}
            </button>
          </form>
        )}
      </section>

      {/* Product list */}
      <section className="card">
        <h2 className="card-title">Products</h2>

        {loading ? (
          <p className="text-muted">Loading products…</p>
        ) : products.length === 0 ? (
          <p className="text-muted">No products yet.</p>
        ) : (
          <ul className="customer-list">
            {products.map(p => {
              const brandName =
                brands.find(b => b.id === p.brand_id)?.name || 'No brand';

              return (
                <li key={p.id} className="customer-item order-item">
                  <div className="order-left">
                    <div className="customer-name">{p.name}</div>
                    <div className="order-meta">{brandName}</div>
                    <div className="order-meta">{formatProductLabel(p)}</div>
                  </div>
                  <div className="order-money">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleDeleteProduct(p.id)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
