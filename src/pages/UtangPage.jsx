import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

function formatProductLabel(product) {
  if (!product) return 'Unknown product';

  const bits = [product.name];
  const extras = [];

  if (product.type) extras.push(product.type);
  if (product.variant_name) extras.push(product.variant_name);
  if (product.volume) extras.push(product.volume);

  if (extras.length > 0) {
    bits.push('— ' + extras.join(' • '));
  }

  return bits.join(' ');
}

export default function UtangPage({ user }) {
  const [orders, setOrders] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  // per-order inputs
  const [partialInputs, setPartialInputs] = useState({});
  const [channelInputs, setChannelInputs] = useState({});
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  useEffect(() => {
    if (!user) return;
    loadCreditOrders();
  }, [user]);

  async function loadCreditOrders() {
    if (!user) return;
    setLoading(true);

    // 🔹 Show BOTH old "utang" and new "credit" orders, still pending
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_date,
        total_srp,
        total_cost,
        profit,
        paid_amount,
        due_date,
        status,
        payment_type,
        customers ( id, name ),
        brands ( id, name )
      `)
      .eq('seller_id', user.id)
      .in('payment_type', ['utang', 'credit'])
      .eq('status', 'pending')
      .order('due_date', { ascending: true });

    if (error) {
      console.error(error);
      alert('Error loading credit orders: ' + error.message);
      setLoading(false);
      return;
    }

    const ordersData = data || [];
    setOrders(ordersData);

    // Load items for these orders
    if (ordersData.length > 0) {
      const orderIds = ordersData.map(o => o.id);

      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          id,
          order_id,
          product_id,
          quantity,
          srp_each,
          cost_each,
          line_total_srp,
          line_total_cost,
          products ( id, name, type, variant_name, volume )
        `)
        .in('order_id', orderIds)
        .eq('seller_id', user.id);

      if (itemsError) {
        console.error(itemsError);
        setOrderItems([]);
      } else {
        setOrderItems(itemsData || []);
      }
    } else {
      setOrderItems([]);
    }

    setLoading(false);
  }

  function daysUntil(dateStr) {
    if (!dateStr) return null;
    const today = new Date();
    const due = new Date(dateStr);
    const diffMs = due.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0);
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  function getItemsForOrder(orderId) {
    return orderItems.filter(oi => oi.order_id === orderId);
  }

  function handleChangePartial(orderId, value) {
    setPartialInputs(prev => ({ ...prev, [orderId]: value }));
  }

  function handleChangeChannel(orderId, value) {
    setChannelInputs(prev => ({ ...prev, [orderId]: value }));
  }

  async function handleAddPayment(order) {
    if (!user) return;

    const rawAmount = partialInputs[order.id];
    const channel = (channelInputs[order.id] || '').trim();

    const amount = Number(rawAmount);

    if (!rawAmount || isNaN(amount) || amount <= 0) {
      alert('Enter a valid payment amount.');
      return;
    }

    if (!channel) {
      alert('Please enter where the payment came from.');
      return;
    }

    const paidSoFar = order.paid_amount || 0;
    const remaining = (order.total_srp || 0) - paidSoFar;

    if (amount > remaining) {
      const ok = window.confirm(
        `This is more than the remaining balance (₱${remaining}). Continue?`
      );
      if (!ok) return;
    }

    setSavingId(order.id);

    // 1) Insert payment row (for history)
    const { error: payError } = await supabase.from('payments').insert({
      seller_id: user.id,
      order_id: order.id,
      amount,
      channel,
    });

    if (payError) {
      console.error(payError);
      alert('Error saving payment: ' + payError.message);
      setSavingId(null);
      return;
    }

    // 2) Update orders.paid_amount + status
    const newPaid = paidSoFar + amount;
    const newStatus = newPaid >= (order.total_srp || 0) ? 'paid' : 'pending';

    const { error: updateError } = await supabase
      .from('orders')
      .update({ paid_amount: newPaid, status: newStatus })
      .eq('id', order.id)
      .eq('seller_id', user.id);

    if (updateError) {
      console.error(updateError);
      alert('Payment saved but failed to update order: ' + updateError.message);
      setSavingId(null);
      return;
    }

    setPartialInputs(prev => ({ ...prev, [order.id]: '' }));
    setSavingId(null);
    await loadCreditOrders();
  }

  async function handleFullPayment(order) {
    if (!user) return;

    const paidSoFar = order.paid_amount || 0;
    const remaining = (order.total_srp || 0) - paidSoFar;

    if (remaining <= 0) {
      alert('This order is already fully paid.');
      return;
    }

    const channel = window.prompt(
      'Where did the payment come from? (e.g. GCash, BPI, Cash, Maya)'
    );
    if (!channel) return;

    setSavingId(order.id);

    // 1) Insert payment row
    const { error: payError } = await supabase.from('payments').insert({
      seller_id: user.id,
      order_id: order.id,
      amount: remaining,
      channel: channel.trim(),
    });

    if (payError) {
      console.error(payError);
      alert('Error saving payment: ' + payError.message);
      setSavingId(null);
      return;
    }

    // 2) Update order as fully paid
    const newPaid = paidSoFar + remaining;

    const { error: updateError } = await supabase
      .from('orders')
      .update({ paid_amount: newPaid, status: 'paid' })
      .eq('id', order.id)
      .eq('seller_id', user.id);

    if (updateError) {
      console.error(updateError);
      alert('Payment saved but failed to update order: ' + updateError.message);
      setSavingId(null);
      return;
    }

    setSavingId(null);
    await loadCreditOrders();
  }

  function toggleItems(orderId) {
    setExpandedOrderId(current => (current === orderId ? null : orderId));
  }

  if (!user) {
    return <p className="text-muted">Loading account…</p>;
  }

  return (
    <div>
      <section className="card">
        <h2 className="card-title">Credit tracker</h2>
        <p className="text-muted">
          All pending credit (utang) orders. Record partial or full payments and see
          where the money came from.
        </p>
      </section>

      <section className="card">
        {loading ? (
          <p className="text-muted">Loading credit orders…</p>
        ) : orders.length === 0 ? (
          <p className="text-muted">No pending credit orders. 🎉</p>
        ) : (
          <ul className="customer-list">
            {orders.map(o => {
              const days = daysUntil(o.due_date);
              const paid = o.paid_amount || 0;
              const remaining = Math.max(0, (o.total_srp || 0) - paid);

              const itemsForOrder = getItemsForOrder(o.id);
              const isExpanded = expandedOrderId === o.id;

              return (
                <li key={o.id} className="customer-item order-item credit-card">
                  <div className="order-item-top">
                    <div className="credit-left">
                      <div className="customer-name">
                        {o.customers?.name || 'Unknown customer'}
                      </div>
                      <div className="order-meta">
                        {o.brands?.name || 'No brand'}
                      </div>
                      <div className="order-meta">
                        Order: {o.order_date}
                        {o.due_date ? ` • Due: ${o.due_date}` : ''}
                      </div>

                      {days != null && (
                        <div className="utang-pill">
                          {days > 0
                            ? `DUE IN ${days} DAY(S)`
                            : days === 0
                            ? 'DUE TODAY'
                            : `OVERDUE BY ${Math.abs(days)} DAY(S)`}
                        </div>
                      )}

                      {itemsForOrder.length > 0 && (
                        <>
                          <button
                            type="button"
                            className="btn-link view-items-btn"
                            onClick={() => toggleItems(o.id)}
                          >
                            {isExpanded ? 'Hide items' : 'View items'}
                          </button>

                          {isExpanded && (
                            <div className="credit-items-list">
                              {itemsForOrder.map(item => (
                                <div key={item.id} className="credit-item-line">
                                  <span className="credit-item-qty">
                                    {item.quantity}×
                                  </span>
                                  <span className="credit-item-name">
                                    {formatProductLabel(item.products)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="order-money credit-money">
                      <div>SRP: ₱{o.total_srp}</div>
                      <div>Paid: ₱{paid}</div>
                      <div>Remaining: ₱{remaining}</div>
                      <div className="order-status">{o.status}</div>
                    </div>
                  </div>

                  <div className="credit-actions">
                    <div className="credit-partial">
                      <label className="label-small">Add partial payment</label>
                      <div className="credit-partial-row">
                        <input
                          className="field credit-partial-input"
                          placeholder="e.g. 200"
                          value={partialInputs[o.id] || ''}
                          onChange={e =>
                            handleChangePartial(o.id, e.target.value)
                          }
                        />
                        <input
                          className="field credit-channel-input"
                          placeholder="Channel (GCash, BPI, Cash…)"
                          value={channelInputs[o.id] || ''}
                          onChange={e =>
                            handleChangeChannel(o.id, e.target.value)
                          }
                        />
                        <button
                          type="button"
                          className="btn-secondary btn-small credit-add-btn"
                          onClick={() => handleAddPayment(o)}
                          disabled={savingId === o.id}
                        >
                          {savingId === o.id ? 'Saving…' : 'Add payment'}
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn-primary btn-small full-pay-btn"
                      onClick={() => handleFullPayment(o)}
                      disabled={savingId === o.id}
                    >
                      {savingId === o.id ? 'Saving…' : 'Full payment'}
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
