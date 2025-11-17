import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

// Small helper to render items for each order
function UtangItemsList({ order, orderItems, getProductById, formatProductLabel }) {
  const itemsForOrder = orderItems.filter(oi => oi.order_id === order.id);

  if (itemsForOrder.length === 0) return null;

  return (
    <div className="utang-items-list">
      <div className="utang-items-title">Items in this order</div>
      {itemsForOrder.map(item => {
        const product = getProductById(item.product_id);
        const label = product ? formatProductLabel(product) : 'Unknown product';
        const qty = Number(item.quantity) || 0;
        const srpEach = Number(item.srp_each) || 0;
        const lineTotal = srpEach && qty ? srpEach * qty : null;

        return (
          <div key={item.id} className="utang-item-line">
            <span className="utang-item-label">
              {qty}× {label}
            </span>
            {lineTotal != null && (
              <span className="utang-item-amount">₱{lineTotal}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function UtangPage({ user }) {
  const [orders, setOrders] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState(null);
  const [partialSavingId, setPartialSavingId] = useState(null);

  // per-order partial payment input: { [orderId]: '100' }
  const [partialAmounts, setPartialAmounts] = useState({});

  // per-order "view items" expanded state: { [orderId]: true/false }
  const [expandedItems, setExpandedItems] = useState({});

  useEffect(() => {
    if (!user) return;
    loadUtang();
  }, [user]);

  function formatProductLabel(p) {
    const bits = [p.name];
    const extras = [];
    if (p.type) extras.push(p.type);
    if (p.variant_name) extras.push(p.variant_name);
    if (p.volume) extras.push(p.volume);
    if (extras.length > 0) bits.push('— ' + extras.join(' • '));
    return bits.join(' ');
  }

  function getProductById(id) {
    if (!id) return null;
    return products.find(p => p.id === id) || null;
  }

  async function loadUtang() {
    if (!user) return;
    setLoading(true);

    // 1) Load utang orders
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        order_date,
        total_srp,
        total_cost,
        profit,
        amount_paid,
        due_date,
        status,
        payment_type,
        customers ( id, name ),
        brands ( id, name ),
        campaigns ( id, name )
      `)
      .eq('seller_id', user.id)
      .eq('payment_type', 'utang')
      .eq('status', 'pending')
      .order('due_date', { ascending: true });

    if (ordersError) {
      console.error(ordersError);
      alert('Error loading utang orders: ' + ordersError.message);
      setLoading(false);
      return;
    }

    const utangOrders = ordersData || [];
    setOrders(utangOrders);

    if (utangOrders.length === 0) {
      setOrderItems([]);
      setProducts([]);
      setLoading(false);
      return;
    }

    const orderIds = utangOrders.map(o => o.id);

    // 2) Load order items for those orders
    const { data: itemsData, error: itemsError } = await supabase
      .from('order_items')
      .select('id, order_id, product_id, quantity, srp_each, cost_each')
      .in('order_id', orderIds);

    if (itemsError) {
      console.error(itemsError);
      alert('Error loading utang items: ' + itemsError.message);
      setOrderItems([]);
      setLoading(false);
      return;
    }

    setOrderItems(itemsData || []);

    // 3) Load products (for labels)
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('id, name, type, variant_name, volume')
      .eq('seller_id', user.id);

    if (productsError) {
      console.error(productsError);
      alert('Error loading products: ' + productsError.message);
      setProducts([]);
      setLoading(false);
      return;
    }

    setProducts(productsData || []);
    setLoading(false);
  }

  function daysUntil(dateStr) {
    if (!dateStr) return null;
    const today = new Date();
    const due = new Date(dateStr);
    const diffMs = due.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0);
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  async function handleMarkPaid(order) {
    if (!user) return;
    if (!window.confirm('Mark this utang as fully paid?')) return;

    setMarkingId(order.id);
    const totalSrp = Number(order.total_srp) || 0;

    const { error } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        amount_paid: totalSrp,
      })
      .eq('id', order.id)
      .eq('seller_id', user.id);

    setMarkingId(null);

    if (error) {
      console.error(error);
      alert('Error updating order: ' + error.message);
      return;
    }

    loadUtang();
  }

  async function handlePartialPayment(order) {
    if (!user) return;

    const inputRaw = partialAmounts[order.id];
    const partial = Number(inputRaw);

    const totalSrp = Number(order.total_srp) || 0;
    const alreadyPaid = Number(order.amount_paid) || 0;
    const remaining = totalSrp - alreadyPaid;

    if (!inputRaw || isNaN(partial)) {
      alert('Please enter a number for the partial payment.');
      return;
    }
    if (partial <= 0) {
      alert('Partial payment must be greater than zero.');
      return;
    }
    if (partial > remaining) {
      alert(`Partial amount cannot be more than the remaining balance (₱${remaining}).`);
      return;
    }

    setPartialSavingId(order.id);

    const newAmountPaid = alreadyPaid + partial;
    const newStatus = newAmountPaid >= totalSrp ? 'paid' : 'pending';

    const { error } = await supabase
      .from('orders')
      .update({
        amount_paid: newAmountPaid,
        status: newStatus,
      })
      .eq('id', order.id)
      .eq('seller_id', user.id);

    setPartialSavingId(null);

    if (error) {
      console.error(error);
      alert('Error saving partial payment: ' + error.message);
      return;
    }

    setPartialAmounts(prev => ({ ...prev, [order.id]: '' }));
    loadUtang();
  }

  function toggleItems(orderId) {
    setExpandedItems(prev => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  }

  if (!user) {
    return <p className="text-muted">Loading account…</p>;
  }

  return (
    <div>
      <section className="card card-dashboard">
        <h2 className="card-title">Utang tracker</h2>
        <p className="text-muted">
          Track all pending utang orders. You can record <strong>partial payments</strong> and
          then <strong>mark as fully paid</strong> once the balance is cleared.
        </p>
      </section>

      <section className="card card-dashboard">
        {loading ? (
          <p className="text-muted">Loading utang orders…</p>
        ) : orders.length === 0 ? (
          <p className="text-muted">No pending utang orders. 🎉</p>
        ) : (
          <ul className="customer-list">
            {orders.map(o => {
              const days = daysUntil(o.due_date);
              const totalSrp = Number(o.total_srp) || 0;
              const amountPaid = Number(o.amount_paid) || 0;
              const remaining = totalSrp - amountPaid;

              const isSavingPartial = partialSavingId === o.id;
              const isMarkingPaid = markingId === o.id;

              const hasItems = orderItems.some(oi => oi.order_id === o.id);
              const isExpanded = !!expandedItems[o.id];

              return (
                <li key={o.id} className="customer-item order-item utang-item">
                  {/* Top row: basic info + totals */}
                  <div className="utang-top-row">
                    <div className="utang-main-info">
                      <div className="customer-name">
                        {o.customers?.name || 'Unknown customer'}
                      </div>
                      <div className="order-meta">
                        {o.brands?.name || 'No brand'}
                        {o.campaigns?.name ? ` • ${o.campaigns.name}` : ''}
                      </div>
                      <div className="order-meta">
                        Order: {o.order_date}
                        {o.due_date ? ` • Due: ${o.due_date}` : ''}
                      </div>
                      {days != null && (
                        <div
                          className={`utang-pill ${
                            days < 0
                              ? 'utang-pill-overdue'
                              : days === 0
                              ? 'utang-pill-today'
                              : 'utang-pill-upcoming'
                          }`}
                        >
                          {days > 0
                            ? `Due in ${days} day(s)`
                            : days === 0
                            ? 'Due today'
                            : `Overdue by ${Math.abs(days)} day(s)`}
                        </div>
                      )}
                    </div>

                    <div className="order-money utang-money">
                      <div>Total: ₱{totalSrp}</div>
                      <div>Paid: ₱{amountPaid}</div>
                      <div className="utang-remaining">
                        Remaining: <span>₱{remaining}</span>
                      </div>
                      <div className="order-status utang-status">{o.status}</div>
                    </div>
                  </div>

                  {/* View items toggle + items list */}
                  {hasItems && (
                    <>
                      <div className="utang-items-toggle-row">
                        <button
                          type="button"
                          className="utang-items-toggle-btn"
                          onClick={() => toggleItems(o.id)}
                        >
                          {isExpanded ? 'Hide items ▴' : 'View items ▾'}
                        </button>
                      </div>

                      {isExpanded && (
                        <UtangItemsList
                          order={o}
                          orderItems={orderItems}
                          getProductById={getProductById}
                          formatProductLabel={formatProductLabel}
                        />
                      )}
                    </>
                  )}

                  {/* Actions: partial payment + mark paid */}
                  <div className="utang-actions-row">
                    <div className="utang-partial-block">
                      <label className="label-small">Add partial payment</label>
                      <div className="utang-partial-controls">
                        <input
                          className="field utang-partial-input"
                          placeholder="e.g. 200"
                          value={partialAmounts[o.id] || ''}
                          onChange={e =>
                            setPartialAmounts(prev => ({
                              ...prev,
                              [o.id]: e.target.value,
                            }))
                          }
                        />
                        <button
                          type="button"
                          className="utang-partial-btn"
                          onClick={() => handlePartialPayment(o)}
                          disabled={isSavingPartial || remaining <= 0}
                        >
                          {isSavingPartial ? 'Saving…' : 'Apply'}
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="utang-paid-btn"
                      onClick={() => handleMarkPaid(o)}
                      disabled={isMarkingPaid}
                    >
                      {isMarkingPaid ? 'Updating…' : 'Mark as fully paid'}
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
