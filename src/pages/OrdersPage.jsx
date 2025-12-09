import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient";

/* =========================================================
   INVOICE OVERLAY
   ========================================================= */

function InvoiceView({
  order,
  items,
  customer,
  getProductById,
  formatProductLabel,
  onClose,
}) {
  if (!order) return null;

  const invoiceNumber = `INV-${order.id}`;
  const orderDate = order.order_date;
  const paymentLabel = order.payment_type === "utang" ? "Credit" : "Cash";
  const dueDate = order.due_date || null;

  const enrichedItems = items.map((it) => {
    const product = getProductById(it.product_id);
    return {
      ...it,
      product_label: product ? formatProductLabel(product) : "Unknown product",
    };
  });

  const totalSrp = enrichedItems.reduce((sum, it) => {
    const line =
      it.line_total_srp != null
        ? it.line_total_srp
        : (Number(it.srp_each) || 0) * (Number(it.quantity) || 0);
    return sum + line;
  }, 0);

  const rawPaid =
    order.payment_type === "utang" || order.payment_type === "credit"
      ? order.paid_amount || 0
      : totalSrp;

  const paidAmount = rawPaid || 0;
  const balance = Math.max(totalSrp - paidAmount, 0);

  return (
    <div className="invoice-overlay" onClick={onClose}>
      <div
        className="invoice-page"
        id="invoice-print-root"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <header className="invoice-header">
          <div>
            <h2 className="invoice-title">Dimerr - Seller tools. simplified</h2>
            <div className="invoice-subtitle">
              For PC, Avon, Natasha &amp; more
            </div>
            <div className="invoice-tagline">Sales invoice</div>
          </div>

          <div className="invoice-meta">
            <div>
              <span className="invoice-meta-label">Invoice:</span>{" "}
              <strong>{invoiceNumber}</strong>
            </div>
            <div>
              <span className="invoice-meta-label">Date:</span>{" "}
              {orderDate || "—"}
            </div>
            <div>
              <span className="invoice-meta-label">Payment:</span>{" "}
              {paymentLabel}
              {(order.payment_type === "utang" ||
                order.payment_type === "credit") &&
                ` (${order.status === "paid" ? "Paid" : "Pending"})`}
            </div>
            {dueDate && (
              <div>
                <span className="invoice-meta-label">Due date:</span>{" "}
                {dueDate}
              </div>
            )}
          </div>
        </header>

        {/* CUSTOMER */}
        <section className="invoice-section">
          <div className="invoice-label">Bill to</div>
          <div className="invoice-block">
            <div className="invoice-customer-name">
              {customer?.name || "Unknown customer"}
            </div>
          </div>
        </section>

        {/* ITEMS */}
        <section className="invoice-section">
          <div className="invoice-label">Items</div>
          <table className="invoice-table">
            <thead>
              <tr>
                <th className="col-product">Product</th>
                <th className="col-qty">Qty</th>
                <th className="col-price">Price</th>
                <th className="col-total">Total</th>
              </tr>
            </thead>
           <tbody>
  {enrichedItems.length === 0 ? (
    <tr>
      <td colSpan={4} className="invoice-empty">
        No items recorded for this order.
      </td>
    </tr>
  ) : (
    enrichedItems.map((it) => {
      const lineTotal =
        it.line_total_srp != null
          ? it.line_total_srp
          : (Number(it.srp_each) || 0) * (Number(it.quantity) || 0);

      return (
        <tr key={it.id}>
          <td className="col-product">{it.product_label}</td>
          <td className="col-qty">{it.quantity}</td>
          <td className="col-price">
            {it.srp_each != null ? `₱${it.srp_each}` : "—"}
          </td>
          <td className="col-total">
            {lineTotal != null ? `₱${lineTotal}` : "—"}
          </td>
        </tr>
      );
    })
  )}
</tbody>

          </table>
        </section>

        {/* TOTALS */}
        <section className="invoice-section invoice-totals">
          <div className="invoice-totals-inner">
            <div className="invoice-total-row">
              <span>Subtotal</span>
              <span>₱{totalSrp}</span>
            </div>
            <div className="invoice-total-row">
              <span>Amount paid</span>
              <span>₱{paidAmount}</span>
            </div>
            <div className="invoice-total-row invoice-total-row--strong">
              <span>Balance due</span>
              <span>₱{balance}</span>
            </div>
          </div>
        </section>

        {/* NOTES */}
        <section className="invoice-section">
          <div className="invoice-label">Notes</div>
          <p className="invoice-notes">
            Thank you for your purchase! For questions about this invoice,
            please contact your DTC seller.
          </p>
        </section>

        {/* ACTIONS – hidden in print */}
        <div className="invoice-actions no-print">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => window.print()}
          >
            Print / Save as PDF
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   ORDER ITEMS LIST (within Recent orders)
   ========================================================= */

function OrderItemsList({
  order,
  orderItems,
  getProductById,
  formatProductLabel,
}) {
  const itemsForOrder = orderItems.filter((oi) => oi.order_id === order.id);
  if (itemsForOrder.length === 0) return null;

  return (
    <div className="order-items-list">
      {itemsForOrder.map((item) => {
        const product = getProductById(item.product_id);
        const label = product ? formatProductLabel(product) : "Unknown product";

        return (
          <div key={item.id} className="order-item-line">
            <span className="order-item-qty">{item.quantity}×</span>
            <span className="order-item-name">{label}</span>
            {item.srp_each != null && (
              <span className="order-item-money">
                ₱{item.srp_each} / ₱{item.cost_each ?? "—"}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* =========================================================
   MAIN PAGE
   ========================================================= */

export default function OrdersPage({ user }) {
  const [customers, setCustomers] = useState([]);
  const [brands, setBrands] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orderItems, setOrderItems] = useState([]);

  const [loadingLookups, setLoadingLookups] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // form state
  const [customerId, setCustomerId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [paymentType, setPaymentType] = useState("cash");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  // Line items for this order
  const [lineItems, setLineItems] = useState([
    { id: 1, productId: "", quantity: "", srp: "", cost: "" },
  ]);
  const [nextItemId, setNextItemId] = useState(2);

  // editing
  const [editingOrder, setEditingOrder] = useState(null);

  // collapse for "Recent orders"
  const [showRecent, setShowRecent] = useState(true);

  // Product search bottom sheet
  const [modalOpen, setModalOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [activeLineIndex, setActiveLineIndex] = useState(null);
  const searchInputRef = useRef(null);

  // Invoice overlay state
  const [invoiceOrderId, setInvoiceOrderId] = useState(null);

  /* ----------------- Effects ----------------- */

  useEffect(() => {
    if (!user) return;
    loadLookups();
    loadOrders();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (brandId) {
      loadCampaigns(brandId);
    } else {
      setCampaigns([]);
      setCampaignId("");
    }
  }, [brandId, user]);

  useEffect(() => {
    if (modalOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [modalOpen]);

  /* ----------------- Helpers ----------------- */

  function formatProductLabel(p) {
    const bits = [p.name];
    const extras = [];
    if (p.type) extras.push(p.type);
    if (p.variant_name) extras.push(p.variant_name);
    if (p.volume) extras.push(p.volume);
    if (extras.length > 0) bits.push("— " + extras.join(" • "));
    return bits.join(" ");
  }

  function getProductById(id) {
    if (!id) return null;
    return products.find((p) => p.id === id) || null;
  }

  function computeTotals(items) {
    let total_srp = 0;
    let total_cost = 0;

    items.forEach((item) => {
      const qty = Number(item.quantity) || 0;
      const srp = Number(item.srp) || 0;
      const cost = Number(item.cost) || 0;

      total_srp += srp * qty;
      total_cost += cost * qty;
    });

    return {
      total_srp,
      total_cost,
      profit: total_srp - total_cost,
    };
  }

  const totals = computeTotals(lineItems);

  function getBrandMargin() {
    if (!brandId) return null;
    const b = brands.find((b) => b.id === brandId);
    if (!b || b.default_margin_percent == null) return null;
    const m = Number(b.default_margin_percent);
    return isNaN(m) ? null : m;
  }

  /* ----------------- Data loading ----------------- */

  async function loadLookups() {
    if (!user) return;
    setLoadingLookups(true);

    const sellerId = user.id;

    const [custRes, brandRes, prodRes] = await Promise.all([
      supabase
        .from("customers")
        .select("id, name")
        .eq("seller_id", sellerId)
        .order("name", { ascending: true }),
      supabase
        .from("brands")
        .select("id, name, default_margin_percent")
        .eq("seller_id", sellerId)
        .order("name", { ascending: true }),
      supabase
        .from("products")
        .select("id, name, type, variant_name, volume")
        .eq("seller_id", sellerId)
        .order("name", { ascending: true }),
    ]);

    if (custRes.error) {
      console.error(custRes.error);
      alert("Error loading customers: " + custRes.error.message);
    } else {
      setCustomers(custRes.data || []);
    }

    if (brandRes.error) {
      console.error(brandRes.error);
      alert("Error loading brands: " + brandRes.error.message);
    } else {
      setBrands(brandRes.data || []);
    }

    if (prodRes.error) {
      console.error(prodRes.error);
      alert("Error loading products: " + prodRes.error.message);
    } else {
      setProducts(prodRes.data || []);
    }

    setLoadingLookups(false);
  }

  async function loadCampaigns(brandIdValue) {
    if (!user) return;

    const { data, error } = await supabase
      .from("campaigns")
      .select("id, name")
      .eq("seller_id", user.id)
      .eq("brand_id", brandIdValue)
      .order("created_at", { ascending: false });

  if (error) {
      console.error(error);
      alert("Error loading campaigns: " + error.message);
    } else {
      setCampaigns(data || []);
    }
  }

  async function loadOrders() {
    if (!user) return;
    setLoadingOrders(true);

    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        id,
        order_date,
        total_srp,
        total_cost,
        profit,
        payment_type,
        due_date,
        status,
        paid_amount,
        customers ( id, name ),
        brands ( id, name ),
        campaigns ( id, name )
      `
      )
      .eq("seller_id", user.id)
      .eq("status", "pending")
      .order("order_date", { ascending: false })
      .limit(20);

    if (error) {
      console.error(error);
      alert("Error loading orders: " + error.message);
      setLoadingOrders(false);
      return;
    }

    const ordersData = data || [];
    setOrders(ordersData);

    if (ordersData.length > 0) {
      const orderIds = ordersData.map((o) => o.id);

      const { data: itemsData, error: itemsError } = await supabase
        .from("order_items")
        .select(
          "id, order_id, product_id, quantity, srp_each, cost_each, line_total_srp"
        )
        .in("order_id", orderIds);

      if (itemsError) {
        console.error(itemsError);
        setOrderItems([]);
      } else {
        setOrderItems(itemsData || []);
      }
    } else {
      setOrderItems([]);
    }

    setLoadingOrders(false);
  }

  /* ----------------- Line items handlers ----------------- */

  function handleAddLineItem() {
    setLineItems((items) => [
      ...items,
      { id: nextItemId, productId: "", quantity: "", srp: "", cost: "" },
    ]);
    setNextItemId((id) => id + 1);
  }

  function handleChangeLineItem(index, field, value) {
    setLineItems((items) => {
      const updated = items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      );

      if (field === "srp") {
        const margin = getBrandMargin();
        const srpNum = Number(value);
        if (
          margin != null &&
          !isNaN(srpNum) &&
          margin >= 0 &&
          margin < 100
        ) {
          const costEach =
            Math.round(((srpNum * (100 - margin)) / 100) * 100) / 100;
          updated[index] = {
            ...updated[index],
            cost: costEach.toString(),
          };
        }
      }

      return updated;
    });
  }

  function handleRemoveLineItem(index) {
    setLineItems((items) => items.filter((_, i) => i !== index));
  }

  function openProductSearch(index) {
    setActiveLineIndex(index);
    setSearchText("");
    setModalOpen(true);
  }

  function selectProductForCurrentLine(product) {
    if (activeLineIndex == null) return;
    setLineItems((items) =>
      items.map((item, i) =>
        i === activeLineIndex ? { ...item, productId: product.id } : item
      )
    );
    setModalOpen(false);
  }

  /* ----------------- Add / Update order ----------------- */

  async function handleSubmitOrder(e) {
    e.preventDefault();

    if (!user) {
      alert("Please log in again.");
      return;
    }

    if (!customerId || !brandId || !orderDate) {
      alert("Please select customer, brand and order date.");
      return;
    }

    const hasValidLine = lineItems.some(
      (li) => li.productId && Number(li.quantity) > 0
    );
    if (!hasValidLine) {
      alert("Please add at least one product with quantity.");
      return;
    }

    const { total_srp, total_cost, profit } = computeTotals(lineItems);
    const isCredit = paymentType === "utang" || paymentType === "credit";

    setSaving(true);

    try {
      if (editingOrder) {
        // UPDATE existing order
        const { error: orderError } = await supabase
          .from("orders")
          .update({
            customer_id: customerId,
            brand_id: brandId,
            campaign_id: campaignId || null,
            order_date: orderDate,
            total_srp,
            total_cost,
            payment_type: paymentType,
            due_date: isCredit ? dueDate || null : null,
          })
          .eq("id", editingOrder.id)
          .eq("seller_id", user.id);

        if (orderError) {
          console.error(orderError);
          alert("Error updating order: " + orderError.message);
          setSaving(false);
          return;
        }

        // Replace order_items
        const { error: delError } = await supabase
          .from("order_items")
          .delete()
          .eq("order_id", editingOrder.id)
          .eq("seller_id", user.id);

        if (delError) {
          console.error(delError);
          alert(
            "Order updated, but error clearing old items: " + delError.message
          );
          setSaving(false);
          return;
        }

        const itemsToSave = lineItems
          .filter((item) => item.productId && Number(item.quantity) > 0)
          .map((item) => {
            const qty = Number(item.quantity) || 0;
            const srpEach = item.srp ? Number(item.srp) : 0;
            const costEach = item.cost ? Number(item.cost) : 0;

            return {
              seller_id: user.id,
              order_id: editingOrder.id,
              product_id: item.productId,
              quantity: qty,
              srp_each: srpEach,
              cost_each: costEach,
              line_total_srp: srpEach * qty,
              line_total_cost: costEach * qty,
            };
          });

        if (itemsToSave.length > 0) {
          const { error: itemsError } = await supabase
            .from("order_items")
            .insert(itemsToSave);

          if (itemsError) {
            console.error(itemsError);
            alert(
              "Order updated, but there was an error saving items: " +
                itemsError.message
            );
          }
        }
      } else {
        // INSERT new order
        const { data: newOrder, error } = await supabase
          .from("orders")
          .insert({
            seller_id: user.id,
            customer_id: customerId,
            brand_id: brandId,
            campaign_id: campaignId || null,
            order_date: orderDate,
            total_srp,
            total_cost,
            payment_type: paymentType,
            due_date: isCredit ? dueDate || null : null,
            status: isCredit ? "pending" : "paid",
            paid_amount: isCredit ? 0 : total_srp,
          })
          .select("id")
          .single();

        if (error) {
          console.error(error);
          alert("Error saving order: " + error.message);
          setSaving(false);
          return;
        }

        const itemsToSave = lineItems
          .filter((item) => item.productId && Number(item.quantity) > 0)
          .map((item) => {
            const qty = Number(item.quantity) || 0;
            const srpEach = item.srp ? Number(item.srp) : 0;
            const costEach = item.cost ? Number(item.cost) : 0;

            return {
              seller_id: user.id,
              order_id: newOrder.id,
              product_id: item.productId,
              quantity: qty,
              srp_each: srpEach,
              cost_each: costEach,
              line_total_srp: srpEach * qty,
              line_total_cost: costEach * qty,
            };
          });

        if (itemsToSave.length > 0) {
          const { error: itemsError } = await supabase
            .from("order_items")
            .insert(itemsToSave);

          if (itemsError) {
            console.error(itemsError);
            alert(
              "Order was saved, but there was an error saving the products: " +
                itemsError.message
            );
          }
        }
      }
    } finally {
      setSaving(false);
    }

    cancelEditAndResetForm();
    await loadOrders();
  }

  function cancelEditAndResetForm() {
    setEditingOrder(null);
    setCustomerId("");
    setBrandId("");
    setCampaignId("");
    setOrderDate("");
    setPaymentType("cash");
    setDueDate("");
    setLineItems([{ id: 1, productId: "", quantity: "", srp: "", cost: "" }]);
    setNextItemId(2);
  }

  function startEditingOrder(order) {
    setEditingOrder(order);
    setCustomerId(order.customers?.id || "");
    setBrandId(order.brands?.id || "");
    setCampaignId(order.campaigns?.id || "");
    setOrderDate(order.order_date || "");
    setPaymentType(order.payment_type || "cash");
    setDueDate(order.due_date || "");

    const itemsForOrder = orderItems.filter((it) => it.order_id === order.id);
    if (itemsForOrder.length === 0) {
      setLineItems([{ id: 1, productId: "", quantity: "", srp: "", cost: "" }]);
      setNextItemId(2);
    } else {
      const mapped = itemsForOrder.map((it, idx) => ({
        id: idx + 1,
        productId: it.product_id,
        quantity: it.quantity != null ? String(it.quantity) : "",
        srp: it.srp_each != null ? String(it.srp_each) : "",
        cost: it.cost_each != null ? String(it.cost_each) : "",
      }));
      setLineItems(mapped);
      setNextItemId(mapped.length + 1);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!user) {
    return <p className="text-muted">Loading account…</p>;
  }

  const invoiceOrder = invoiceOrderId
    ? orders.find((o) => o.id === invoiceOrderId)
    : null;

  const invoiceCustomer = invoiceOrder?.customers || null;

  const invoiceItems = invoiceOrder
    ? orderItems.filter((it) => it.order_id === invoiceOrderId)
    : [];

  const brandMargin = getBrandMargin();
  const firstLine = lineItems[0];
  let firstProfitPerItem = null;
  if (firstLine) {
    const sNum = Number(firstLine.srp) || 0;
    const cNum = Number(firstLine.cost) || 0;
    if (sNum && cNum) {
      firstProfitPerItem = sNum - cNum;
    }
  }

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div className="orders-page">
      {/* MAIN CONTENT – HIDDEN IN PRINT */}
      <div className="orders-main no-print">
        {/* Add / Edit order card */}
        <section className="card">
          <div className="card-header-row">
            <h2 className="card-title">
              {editingOrder ? "Edit order" : "Add order"}
            </h2>
          </div>

          <div className="card-body">
            {loadingLookups ? (
              <p className="text-muted">Loading customers &amp; brands…</p>
            ) : customers.length === 0 || brands.length === 0 ? (
              <p className="text-muted">
                You need at least one customer and one brand before adding
                orders. Add them in the Customers and Brands tabs.
              </p>
            ) : (
              <form onSubmit={handleSubmitOrder}>
                {/* Customer */}
                <select
                  className="field"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                >
                  <option value="">Select customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {/* Brand */}
                <select
                  className="field"
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                >
                  <option value="">Select brand</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>

                {/* Campaign */}
                <select
                  className="field"
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                  disabled={!brandId || campaigns.length === 0}
                >
                  <option value="">
                    {brandId
                      ? campaigns.length === 0
                        ? "No campaigns for this brand"
                        : "Select campaign (optional)"
                      : "Select brand first"}
                  </option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {/* Dates & payment */}
                <div className="form-row">
                  <div className="form-col">
                    <label className="label-small">Order date</label>
                    <input
                      type="date"
                      className="field"
                      value={orderDate}
                      onChange={(e) => setOrderDate(e.target.value)}
                    />
                  </div>
                  <div className="form-col">
                    <label className="label-small">Payment type</label>
                    <select
                      className="field"
                      value={paymentType}
                      onChange={(e) => setPaymentType(e.target.value)}
                    >
                      <option value="cash">Cash</option>
                      <option value="utang">Credit</option>
                    </select>
                  </div>
                </div>

                {paymentType === "utang" && (
                  <div className="form-row">
                    <div className="form-col">
                      <label className="label-small">Due date (credit)</label>
                      <input
                        type="date"
                        className="field"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Line items */}
                <div className="line-items-block">
                  <div className="line-items-header">
                    <span className="label-small">Products in this order</span>
                    {products.length === 0 && (
                      <span className="text-muted-small">
                        Add products in the Products tab to pick them here.
                      </span>
                    )}
                  </div>

                  {lineItems.map((item, index) => {
                    const selectedProduct = getProductById(item.productId);
                    const label = selectedProduct
                      ? formatProductLabel(selectedProduct)
                      : "Tap to select product";

                    const srpNum = Number(item.srp) || 0;
                    const costNum = Number(item.cost) || 0;
                    const profitPerItem =
                      srpNum && costNum ? srpNum - costNum : null;

                    return (
                      <div key={item.id} className="line-item-group">
                        <div className="form-row">
                          <div className="form-col">
                            <button
                              type="button"
                              className="field line-item-product-btn"
                              onClick={() => openProductSearch(index)}
                            >
                              {label}
                            </button>
                          </div>
                          <div className="form-col line-item-qty">
                            <input
                              className="field"
                              placeholder="Qty"
                              value={item.quantity}
                              onChange={(e) =>
                                handleChangeLineItem(
                                  index,
                                  "quantity",
                                  e.target.value
                                )
                              }
                            />
                          </div>
                        </div>

                        <div className="form-row">
                          <div className="form-col">
                            <input
                              className="field"
                              placeholder="SRP each"
                              value={item.srp}
                              onChange={(e) =>
                                handleChangeLineItem(
                                  index,
                                  "srp",
                                  e.target.value
                                )
                              }
                            />
                          </div>
                          <div className="form-col">
                            <input
                              className="field"
                              placeholder="Cost each"
                              value={item.cost}
                              onChange={(e) =>
                                handleChangeLineItem(
                                  index,
                                  "cost",
                                  e.target.value
                                )
                              }
                            />
                          </div>
                        </div>

                        {brandMargin != null && srpNum > 0 && (
                          <p className="text-muted-small">
                            Using {brandMargin}% margin – cost &amp; profit auto.
                            {profitPerItem != null &&
                              ` Profit per item: ₱${profitPerItem} auto.`}
                          </p>
                        )}

                        {lineItems.length > 1 && (
                          <div className="line-item-remove-row">
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => handleRemoveLineItem(index)}
                            >
                              Remove item
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div className="line-items-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleAddLineItem}
                    >
                      + Add another product
                    </button>
                  </div>
                </div>

                {/* Totals & profit display */}
<div className="order-totals-row">
  <div className="form-row">
    <div className="form-col">
      <label className="label-small">Total SRP (auto)</label>
      <div className="profit-pill">
        {totals.total_srp ? `₱ ${totals.total_srp}` : "—"}
      </div>
    </div>
    <div className="form-col">
      <label className="label-small">Total cost (auto)</label>
      <div className="profit-pill">
        {totals.total_cost ? `₱ ${totals.total_cost}` : "—"}
      </div>
    </div>
    <div className="form-col">
      <label className="label-small">Profit (auto)</label>
      <div className="profit-pill">
        {totals.profit ? `₱ ${totals.profit}` : "—"}
      </div>
    </div>
  </div>
</div>

                <div className="order-save-row order-save-row--edit">
                  {editingOrder && (
                    <button
                      type="button"
                      className="btn-secondary pill-button"
                      onClick={cancelEditAndResetForm}
                    >
                      Cancel edit
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary pill-button"
                  >
                    {saving
                      ? editingOrder
                        ? "Updating…"
                        : "Saving…"
                      : editingOrder
                      ? "Update order"
                      : "Save order"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>

        {/* Recent orders card with hide/show */}
        <section className="card">
          <div className="card-header-row">
            <h2 className="card-title">Recent orders</h2>
            <button
              type="button"
              className="collapse-toggle"
              onClick={() => setShowRecent((prev) => !prev)}
            >
              <span className={`collapse-icon ${showRecent ? "open" : ""}`}>
                {showRecent ? "–" : "+"}
              </span>
            </button>
          </div>

          <div className={`collapse-content ${showRecent ? "" : "hidden"}`}>
            {loadingOrders ? (
              <p className="text-muted">Loading orders…</p>
            ) : orders.length === 0 ? (
              <p className="text-muted">No orders yet.</p>
            ) : (
              <ul className="customer-list">
                {orders.map((o) => (
                  <li key={o.id} className="customer-item order-item">
                    <div className="order-item-top">
                      <div className="order-left">
                        <div className="customer-name">
                          {o.customers?.name || "Unknown customer"}
                        </div>
                        <div className="order-meta">
                          {o.brands?.name || "No brand"}
                          {o.campaigns?.name ? ` • ${o.campaigns.name}` : ""}
                        </div>
                        <div className="order-meta">
                          {o.order_date} •{" "}
                          {o.payment_type === "utang" ? "Credit" : "Cash"}
                          {o.payment_type === "utang" && o.due_date
                            ? ` • Due: ${o.due_date}`
                            : ""}
                        </div>
                      </div>

                      <div className="order-money">
  <div className="money-srp">SRP: ₱{o.total_srp}</div>
  <div className="money-cost">Cost: ₱{o.total_cost}</div>
  <div className="money-profit">Profit: ₱{o.profit}</div>
  <div className="order-status">{o.status}</div>

                        <button
                          type="button"
                          className="btn-pill btn-edit"
                          onClick={() => startEditingOrder(o)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="btn-pill btn-invoice"
                          onClick={() => setInvoiceOrderId(o.id)}
                        >
                          Invoice
                        </button>
                      </div>
                    </div>

                    <OrderItemsList
                      order={o}
                      orderItems={orderItems}
                      getProductById={getProductById}
                      formatProductLabel={formatProductLabel}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Product search bottom sheet */}
        {modalOpen && (
          <div className="modal-overlay">
            <div className="modal-sheet">
              <input
                ref={searchInputRef}
                className="field modal-search-input"
                placeholder="Search product…"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />

              <div className="modal-list">
                {products
                  .filter((p) =>
                    formatProductLabel(p)
                      .toLowerCase()
                      .includes(searchText.toLowerCase())
                  )
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="modal-list-item"
                      onClick={() => selectProductForCurrentLine(p)}
                    >
                      {formatProductLabel(p)}
                    </button>
                  ))}
              </div>

              <button
                type="button"
                className="btn-secondary modal-close"
                onClick={() => setModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invoice overlay – outside .no-print so ONLY invoice prints */}
      {invoiceOrder && (
        <InvoiceView
          order={invoiceOrder}
          items={invoiceItems}
          customer={invoiceCustomer}
          getProductById={getProductById}
          formatProductLabel={formatProductLabel}
          onClose={() => setInvoiceOrderId(null)}
        />
      )}
    </div>
  );
}
