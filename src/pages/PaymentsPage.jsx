import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

function formatProductLabel(product) {
  if (!product) return "Unknown product";

  const bits = [product.name];
  const extras = [];

  if (product.type) extras.push(product.type);
  if (product.variant_name) extras.push(product.variant_name);
  if (product.volume) extras.push(product.volume);

  if (extras.length > 0) {
    bits.push("— " + extras.join(" • "));
  }

  return bits.join(" ");
}

export default function PaymentsPage({ user }) {
  const [orders, setOrders] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [paymentsByOrder, setPaymentsByOrder] = useState({});
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadPaymentsData();
  }, [user]);

  async function loadPaymentsData() {
    if (!user) return;
    setLoading(true);

    // 1) Orders that have payments or are marked paid
    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
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
      .eq("seller_id", user.id)
      .or("paid_amount.gt.0,status.eq.paid")
      .order("order_date", { ascending: false });

    if (ordersError) {
      console.error(ordersError);
      alert("Error loading payment history: " + ordersError.message);
      setLoading(false);
      return;
    }

    const ordersList = ordersData || [];
    if (ordersList.length === 0) {
      setOrders([]);
      setOrderItems([]);
      setPaymentsByOrder({});
      setLoading(false);
      return;
    }

    setOrders(ordersList);

    const orderIds = ordersList.map((o) => o.id);

    // 2) Items for these orders
    const { data: itemsData, error: itemsError } = await supabase
      .from("order_items")
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
      .in("order_id", orderIds)
      .eq("seller_id", user.id);

    if (itemsError) {
      console.error(itemsError);
      setOrderItems([]);
    } else {
      setOrderItems(itemsData || []);
    }

    // 3) Payments for these orders
    const { data: paymentsData, error: paymentsError } = await supabase
      .from("payments")
      .select("id, order_id, amount, channel, created_at")
      .in("order_id", orderIds)
      .eq("seller_id", user.id)
      .order("created_at", { ascending: true });

    if (paymentsError) {
      console.error(paymentsError);
      setPaymentsByOrder({});
    } else {
      const map = {};
      (paymentsData || []).forEach((p) => {
        if (!map[p.order_id]) map[p.order_id] = [];
        map[p.order_id].push(p);
      });
      setPaymentsByOrder(map);
    }

    setLoading(false);
  }

  function getItemsForOrder(orderId) {
    return orderItems.filter((i) => i.order_id === orderId);
  }

  function toggleDetails(orderId) {
    setExpandedOrderId((current) => (current === orderId ? null : orderId));
  }

  if (!user) {
    return <p className="text-muted">Loading account…</p>;
  }

  return (
    <div>
      <section className="card">
        {loading ? (
          <p className="text-muted">Loading payment history…</p>
        ) : orders.length === 0 ? (
          <p className="text-muted">No payments recorded yet.</p>
        ) : (
          <ul className="customer-list">
            {orders.map((o) => {
              const items = getItemsForOrder(o.id);
              const payments = paymentsByOrder[o.id] || [];

              const paid = o.paid_amount || 0;
              const remaining = Math.max(0, (o.total_srp || 0) - paid);

              let statusLabel = o.status;
              if (remaining <= 0 && paid > 0) statusLabel = "paid";
              else if (paid > 0 && remaining > 0) statusLabel = "partial";

              const isExpanded = expandedOrderId === o.id;

              return (
                <li key={o.id} className="customer-item order-item credit-card">
                  {/* Top summary row */}
                  <div className="order-item-top">
                    <div className="credit-left">
                      <div className="customer-name">
                        {o.customers?.name || "Unknown customer"}
                      </div>
                      <div className="order-meta">
                        {o.brands?.name || "No brand"}
                      </div>
                      <div className="order-meta">
                        Order: {o.order_date}
                        {o.due_date ? ` • Due: ${o.due_date}` : ""}
                      </div>
                    </div>

                    <div className="order-money credit-money">
                      <div>SRP: ₱{o.total_srp}</div>
                      <div>Paid: ₱{paid}</div>
                      <div>Balance: ₱{remaining}</div>
                      <div className="order-status">{statusLabel}</div>
                    </div>
                  </div>

                  {/* View / Hide details – same pill style as Credit tab */}
                  <button
                    type="button"
                    className="view-items-btn"
                    onClick={() => toggleDetails(o.id)}
                  >
                    {isExpanded ? "Hide details" : "View details"}
                  </button>

                  {/* Expanded details inside a soft sub-card, like the credit payment tile */}
                  {isExpanded && (
                    <div className="credit-details-box">
                      {/* Items */}
                      <div className="credit-details-section">
                        <div className="label-small">Items in this order</div>
                        {items.length === 0 ? (
                          <p className="text-muted-small">
                            No items found for this order.
                          </p>
                        ) : (
                          <div className="credit-items-list">
                            {items.map((it) => (
                              <div key={it.id} className="credit-item-line">
                                <span className="credit-item-qty">
                                  {it.quantity}×
                                </span>
                                <span className="credit-item-name">
                                  {formatProductLabel(it.products)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Payments */}
                      <div className="credit-details-section credit-details-section--payments">
                        <div className="label-small">
                          Payments for this order
                        </div>
                        {payments.length === 0 ? (
                          <p className="text-muted-small">
                            No payments recorded yet.
                          </p>
                        ) : (
                          <ul className="payments-list">
                            {payments.map((p) => {
                              const date = p.created_at
                                ? new Date(p.created_at).toLocaleDateString()
                                : "";
                              return (
                                <li
                                  key={p.id}
                                  className="payments-list-item"
                                >
                                  <span className="payment-amount">
                                    ₱{p.amount}
                                  </span>
                                  <span className="payment-separator">•</span>
                                  <span className="payment-channel">
                                    {p.channel || "—"}
                                  </span>
                                  <span className="payment-separator">•</span>
                                  <span className="payment-date">{date}</span>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
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
