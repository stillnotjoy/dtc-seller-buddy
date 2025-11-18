import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

// Re-use the same label style we use elsewhere
function formatProductLabel(p) {
  if (!p) return 'Unknown product';

  const bits = [p.name];
  const extras = [];

  if (p.type) extras.push(p.type);
  if (p.variant_name) extras.push(p.variant_name);
  if (p.volume) extras.push(p.volume);

  if (extras.length > 0) {
    bits.push('— ' + extras.join(' • '));
  }

  return bits.join(' ');
}

export default function PaymentsPage({ user }) {
  const [payments, setPayments] = useState([]);
  const [itemsByOrderId, setItemsByOrderId] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedPaymentId, setExpandedPaymentId] = useState(null);

  useEffect(() => {
    if (!user) return;
    loadPayments();
  }, [user]);

  async function loadPayments() {
    if (!user) return;
    setLoading(true);

    // 1) Load ALL payments for this seller (partial + full)
    const { data, error } = await supabase
      .from('payments')
      .select(
        `
        id,
        amount,
        channel,
        paid_date,
        order_id,
        orders (
          id,
          order_date,
          customers (
            id,
            name
          )
        )
      `
      )
      .eq('seller_id', user.id)
      .order('paid_date', { ascending: false });

    if (error) {
      console.error(error);
      alert('Error loading payments: ' + error.message);
      setLoading(false);
      return;
    }

    const paymentsData = data || [];
    setPayments(paymentsData);

    // 2) For all related orders, load items + products
    const orderIds = Array.from(
      new Set(paymentsData.map(p => p.order_id).filter(Boolean))
    );

    if (orderIds.length > 0) {
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select(
          `
          id,
          order_id,
          quantity,
          products (
            id,
            name,
            type,
            variant_name,
            volume
          )
        `
        )
        .in('order_id', orderIds)
        .eq('seller_id', user.id);

      if (itemsError) {
        console.error(itemsError);
        setItemsByOrderId({});
      } else {
        const map = {};
        (itemsData || []).forEach(item => {
          if (!map[item.order_id]) map[item.order_id] = [];
          map[item.order_id].push(item);
        });
        setItemsByOrderId(map);
      }
    } else {
      setItemsByOrderId({});
    }

    setLoading(false);
  }

  function toggleExpanded(id) {
    setExpandedPaymentId(current => (current === id ? null : id));
  }

  function formatDateTime(str) {
    if (!str) return '';
    try {
      return new Date(str).toLocaleString();
    } catch {
      return str;
    }
  }

  if (!user) {
    return <p className="text-muted">Loading account…</p>;
  }

  return (
    <div>
      <section className="card">
        <h2 className="card-title">Payment history</h2>
        <p className="text-muted">
          All recorded payments (partial and full) from your credit orders, with
          payment channels.
        </p>
      </section>

      <section className="card">
        {loading ? (
          <p className="text-muted">Loading payments…</p>
        ) : payments.length === 0 ? (
          <p className="text-muted">No payments recorded yet.</p>
        ) : (
          <ul className="customer-list">
            {payments.map(p => {
              const order = p.orders;
              const customerName = order?.customers?.name || 'Unknown customer';
              const items = itemsByOrderId[p.order_id] || [];
              const isExpanded = expandedPaymentId === p.id;

              return (
                <li key={p.id} className="customer-item payment-card">
                  <div className="payment-top-row">
                    <div className="payment-amount-channel">
                      <div className="payment-amount">
                        ₱{p.amount}{' '}
                        {p.channel ? (
                          <span className="payment-channel">• {p.channel}</span>
                        ) : null}
                      </div>
                      <div className="payment-customer">
                        {customerName}
                      </div>
                    </div>
                  </div>

                  <div className="payment-meta">
                    {order ? (
                      <div className="payment-meta-line">
                        Order ID: {order.id}
                        {order.order_date ? ` • Order: ${order.order_date}` : ''}
                      </div>
                    ) : (
                      <div className="payment-meta-line">
                        Order ID: {p.order_id}
                      </div>
                    )}
                    <div className="payment-meta-line">
                      {formatDateTime(p.paid_date)}
                    </div>
                  </div>

                  {items.length > 0 && (
                    <div className="payment-items-block">
                      <button
                        type="button"
                        className="btn-link view-items-btn"
                        onClick={() => toggleExpanded(p.id)}
                      >
                        {isExpanded ? 'Hide items' : 'View items'}
                      </button>

                      {isExpanded && (
                        <div className="credit-items-list">
                          {items.map(item => (
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
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
