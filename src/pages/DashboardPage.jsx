import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function DashboardPage({ user }) {
  const [stats, setStats] = useState({
    totalSrp: 0,
    totalCost: 0,
    totalProfit: 0,
    paidOrders: 0,
    pendingUtang: 0,
    pendingAmount: 0,
  });

  const [brandStats, setBrandStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadStats();
  }, [user]);

  async function loadStats() {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('orders')
      .select(
        `
        id,
        total_srp,
        total_cost,
        profit,
        payment_type,
        status,
        amount_paid,
        brands ( id, name )
      `
      )
      .eq('seller_id', user.id);

    if (error) {
      console.error(error);
      alert('Error loading dashboard: ' + error.message);
      setLoading(false);
      return;
    }

    const orders = data || [];

    let totalSrp = 0;
    let totalCost = 0;
    let totalProfit = 0;
    let paidOrders = 0;
    let pendingUtang = 0;
    let pendingAmount = 0;

    const brandMap = {};

    orders.forEach(o => {
      const srp = Number(o.total_srp) || 0;
      const cost = Number(o.total_cost) || 0;
      const profit = Number(o.profit) || srp - cost;

      totalSrp += srp;
      totalCost += cost;
      totalProfit += profit;

      if (o.status === 'paid') paidOrders += 1;

      if (o.payment_type === 'utang' && o.status === 'pending') {
        pendingUtang += 1;
        const amountPaid = Number(o.amount_paid) || 0;
        const remaining = Math.max(srp - amountPaid, 0);
        pendingAmount += remaining;
      }

      const brandId = o.brands?.id || 'no-brand';
      const brandName = o.brands?.name || 'Unassigned brand';

      if (!brandMap[brandId]) {
        brandMap[brandId] = {
          id: brandId,
          name: brandName,
          orderCount: 0,
          totalSrp: 0,
          totalProfit: 0,
        };
      }

      brandMap[brandId].orderCount += 1;
      brandMap[brandId].totalSrp += srp;
      brandMap[brandId].totalProfit += profit;
    });

    setStats({
      totalSrp,
      totalCost,
      totalProfit,
      paidOrders,
      pendingUtang,
      pendingAmount,
    });

    setBrandStats(
      Object.values(brandMap).sort((a, b) => b.totalSrp - a.totalSrp)
    );

    setLoading(false);
  }

  if (!user) {
    return <p className="text-muted">Loading account…</p>;
  }

  return (
    <div>
      {/* Overview */}
      <section className="card card-dashboard">
        <h2 className="card-title">Overview</h2>

        {loading ? (
          <p className="text-muted">Loading stats…</p>
        ) : (
          <div className="dashboard-grid">
            <div className="dashboard-card">
              <div className="label-small">Total Sales (SRP)</div>
              <div className="stat-value stat-value--sales">
                ₱ {stats.totalSrp}
              </div>
            </div>

            <div className="dashboard-card">
              <div className="label-small">Total Cost</div>
              <div className="stat-value stat-value--cost">
                ₱ {stats.totalCost}
              </div>
            </div>

            <div className="dashboard-card">
              <div className="label-small">Total Profit</div>
              <div className="stat-value stat-value--profit">
                ₱ {stats.totalProfit}
              </div>
            </div>

            <div className="dashboard-card">
              <div className="label-small">Paid Orders</div>
              <div className="stat-value stat-value--count">
                {stats.paidOrders}
              </div>
            </div>

            <div className="dashboard-card">
              <div className="label-small">Pending Credit Orders</div>
              <div className="stat-value stat-value--utang">
                {stats.pendingUtang}
              </div>
            </div>

            <div className="dashboard-card">
              <div className="label-small">Pending Credit Amount</div>
              <div className="stat-value stat-value--utang-amount">
                ₱ {stats.pendingAmount}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Sales by brand */}
      <section className="card card-dashboard">
        <h2 className="card-title">Sales by brand</h2>

        {loading ? (
          <p className="text-muted">Loading brand stats…</p>
        ) : brandStats.length === 0 ? (
          <p className="text-muted">No orders yet.</p>
        ) : (
          <div className="salesbrand-list">
            {brandStats.map(b => (
              <div key={b.id} className="salesbrand-row">
                {/* LEFT: numbers */}
                <div className="salesbrand-left">
                  <div className="salesbrand-metric">
                    <span className="salesbrand-label salesbrand-label--sales">
                      Sales
                    </span>
                    <span className="salesbrand-value salesbrand-value--sales">
                      ₱ {b.totalSrp}
                    </span>
                  </div>
                  <div className="salesbrand-metric">
                    <span className="salesbrand-label salesbrand-label--profit">
                      Profit
                    </span>
                    <span className="salesbrand-value salesbrand-value--profit">
                      ₱ {b.totalProfit}
                    </span>
                  </div>
                </div>

                {/* RIGHT: brand name + orders */}
                <div className="salesbrand-right">
                  <div className="salesbrand-name">{b.name}</div>
                  <div className="salesbrand-meta">
                    {b.orderCount} order{b.orderCount !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
