import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { TrendingUp, ShieldAlert, Activity, DollarSign, ArrowUpRight, ArrowDownRight, List } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function Dashboard() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase
        .from('financial_progress')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (data) setHistory(data);
    }
    setLoading(false);
  };

  // Trend Calculations
  let expenseTrend = null;
  let expenseDiff = 0;
  if (history.length >= 2) {
    const latest = history[history.length - 1].total_expense || 0;
    const previous = history[history.length - 2].total_expense || 0;
    if (previous > 0) {
      expenseDiff = (((latest - previous) / previous) * 100).toFixed(1);
      expenseTrend = latest > previous ? 'up' : 'down';
    }
  }

  // Plotting BOTH Savings Potential and Total Expenses
  const data = {
    labels: history.map(item => new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'Savings Potential ($)',
        data: history.map(item => item.savings_potential),
        borderColor: '#0D9488',
        backgroundColor: 'rgba(13, 148, 136, 0.10)',
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#FFF',
        pointBorderColor: '#0D9488',
        pointBorderWidth: 2,
        fill: true
      },
      {
        label: 'Total Expenses ($)',
        data: history.map(item => item.total_expense || 0),
        borderColor: '#DC2626',
        backgroundColor: 'rgba(220, 38, 38, 0.08)',
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#FFF',
        pointBorderColor: '#DC2626',
        pointBorderWidth: 2,
        fill: true
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { font: { family: "'Inter', sans-serif", size: 12 }, color: '#334155' }
      },
      tooltip: {
        backgroundColor: '#FFFFFF',
        titleColor: '#0F172A',
        bodyColor: '#475569',
        borderColor: '#E2E8F0',
        borderWidth: 1,
        titleFont: { family: "'Inter', sans-serif" },
        bodyFont: { family: "'Inter', sans-serif" }
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { family: "'Inter', sans-serif" }, color: '#64748B' } },
      y: { grid: { borderDash: [4, 4], color: '#E2E8F0' }, beginAtZero: true, ticks: { font: { family: "'Inter', sans-serif" }, color: '#64748B' } }
    }
  };

  const ui = {
    shell: {
      minHeight: '100vh',
      background:
        'radial-gradient(1000px 500px at 20% 0%, rgba(13,148,136,0.10), transparent 55%), radial-gradient(900px 600px at 90% 20%, rgba(37,99,235,0.10), transparent 55%), #F6F7FB',
      fontFamily: "'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      color: '#0F172A',
      padding: '18px 14px 60px',
      boxSizing: 'border-box'
    },
    container: { maxWidth: 1100, margin: '0 auto' },
    header: {
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: 18,
      padding: '18px 18px',
      boxShadow: '0 10px 26px rgba(15, 23, 42, 0.08)',
      marginBottom: 16,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      flexWrap: 'wrap'
    },
    title: { margin: 0, fontSize: '1.35rem', fontWeight: 950, color: '#0F172A' },
    subtitle: { margin: '6px 0 0', color: '#64748B', fontWeight: 650, lineHeight: 1.45 },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: 14,
      marginBottom: 16
    },
    statCard: {
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: 18,
      padding: 16,
      boxShadow: '0 10px 24px rgba(15, 23, 42, 0.06)',
      display: 'grid',
      gridTemplateColumns: '48px 1fr',
      gap: 12,
      alignItems: 'center'
    },
    iconBadge: (bg, color) => ({
      width: 44,
      height: 44,
      borderRadius: 14,
      background: bg,
      color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid rgba(15,23,42,0.06)'
    }),
    statLabel: { margin: 0, color: '#64748B', fontWeight: 800, fontSize: '0.9rem' },
    statValue: { margin: '3px 0 0', fontWeight: 950, fontSize: '1.35rem', color: '#0F172A' },
    trend: (up) => ({
      marginTop: 6,
      fontSize: '0.85rem',
      fontWeight: 900,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      color: up ? '#DC2626' : '#0D9488'
    }),
    card: {
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: 18,
      padding: 16,
      boxShadow: '0 12px 30px rgba(15, 23, 42, 0.10)'
    },
    sectionTitle: {
      margin: '0 0 12px',
      fontSize: '1.05rem',
      fontWeight: 950,
      color: '#0F172A',
      display: 'flex',
      alignItems: 'center',
      gap: 10
    },
    tableWrap: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '680px' },
    thRow: { borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '0.82rem', textTransform: 'uppercase' },
    th: { padding: '12px', fontWeight: 900 },
    tr: { borderBottom: '1px solid #EEF2F7', transition: 'background 0.15s' },
    td: { padding: '14px 12px', color: '#0F172A', fontWeight: 650, whiteSpace: 'nowrap' },
    badge: (bg, color, border) => ({
      padding: '5px 10px',
      borderRadius: 999,
      fontSize: '0.78rem',
      fontWeight: 950,
      background: bg,
      color,
      border: `1px solid ${border}`
    })
  };

  if (loading) {
    return (
      <div style={ui.shell}>
        <div style={ui.container}>
          <div style={ui.card}>
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 950 }}>Loading financial data…</h2>
            <p style={{ margin: '8px 0 0', color: '#64748B', fontWeight: 650 }}>
              Fetching your saved checkups and insights.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const latest = history.length > 0 ? history[history.length - 1] : null;

  return (
    <div style={ui.shell}>
      <div style={ui.container}>
        <header style={ui.header}>
          <div>
            <h1 style={ui.title}>Finance Dashboard</h1>
            <p style={ui.subtitle}>Track savings potential, expenses, and risk over time.</p>
          </div>
        </header>

        <div style={ui.statsGrid}>
          <div style={ui.statCard}>
            <div style={ui.iconBadge('rgba(220,38,38,0.10)', '#DC2626')}>
              <DollarSign size={22} />
            </div>
            <div>
              <p style={ui.statLabel}>Latest Expense</p>
              <p style={ui.statValue}>${latest ? (latest.total_expense || 0) : 0}</p>
              {expenseTrend && (
                <div style={ui.trend(expenseTrend === 'up')}>
                  {expenseTrend === 'up' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                  {Math.abs(expenseDiff)}% vs last check
                </div>
              )}
            </div>
          </div>

          <div style={ui.statCard}>
            <div style={ui.iconBadge('rgba(13,148,136,0.10)', '#0D9488')}>
              <TrendingUp size={22} />
            </div>
            <div>
              <p style={ui.statLabel}>Latest Savings</p>
              <p style={ui.statValue}>${latest ? (latest.savings_potential || 0) : 0}</p>
            </div>
          </div>

          <div style={ui.statCard}>
            <div style={ui.iconBadge('rgba(180,83,9,0.10)', '#B45309')}>
              <Activity size={22} />
            </div>
            <div>
              <p style={ui.statLabel}>Latest Health</p>
              <p style={ui.statValue}>{latest ? (latest.financial_health || 'N/A') : 'N/A'}</p>
            </div>
          </div>

          <div style={ui.statCard}>
            <div style={ui.iconBadge('rgba(100,116,139,0.12)', '#334155')}>
              <ShieldAlert size={22} />
            </div>
            <div>
              <p style={ui.statLabel}>AI Risk Level</p>
              <p style={ui.statValue}>{latest ? (latest.risk_level || 'N/A') : 'N/A'}</p>
            </div>
          </div>
        </div>

        <div style={{ ...ui.card, marginBottom: 16 }}>
          <h2 style={ui.sectionTitle}>Trend (Savings vs Expenses)</h2>
          <div style={{ height: 340 }}>
            {history.length > 0 ? (
              <Line data={data} options={chartOptions} />
            ) : (
              <div style={{ textAlign: 'center', paddingTop: 50, color: '#94A3B8', fontWeight: 700 }}>
                No data to plot yet.
              </div>
            )}
          </div>
        </div>

        <div style={ui.card}>
          <h2 style={ui.sectionTitle}>
            <List size={20} color="#334155" /> Expense Ledger
          </h2>

          <div style={ui.tableWrap}>
            <table style={ui.table}>
              <thead>
                <tr style={ui.thRow}>
                  <th style={ui.th}>Date</th>
                  <th style={ui.th}>Income</th>
                  <th style={ui.th}>Total Expense</th>
                  <th style={ui.th}>Savings Potential</th>
                  <th style={ui.th}>AI Assessment</th>
                </tr>
              </thead>
              <tbody>
                {history.length > 0 ? history.slice().reverse().map((row, idx) => (
                  <tr
                    key={idx}
                    style={ui.tr}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#F8FAFC'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={{ ...ui.td, color: '#334155' }}>
                      {new Date(row.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td style={ui.td}>${row.income || 0}</td>
                    <td style={{ ...ui.td, color: '#DC2626', fontWeight: 900 }}>${row.total_expense || 0}</td>
                    <td style={{ ...ui.td, color: '#0D9488', fontWeight: 900 }}>${row.savings_potential || 0}</td>
                    <td style={{ ...ui.td, whiteSpace: 'normal' }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span
                          style={
                            row.financial_health === 'Good'
                              ? ui.badge('rgba(13,148,136,0.10)', '#0F766E', 'rgba(13,148,136,0.25)')
                              : row.financial_health === 'Average'
                                ? ui.badge('rgba(180,83,9,0.10)', '#92400E', 'rgba(180,83,9,0.25)')
                                : ui.badge('rgba(220,38,38,0.10)', '#7F1D1D', 'rgba(220,38,38,0.22)')
                          }
                        >
                          {row.financial_health}
                        </span>

                        <span
                          style={
                            row.risk_level === 'High'
                              ? ui.badge('rgba(220,38,38,0.10)', '#7F1D1D', 'rgba(220,38,38,0.22)')
                              : ui.badge('rgba(100,116,139,0.10)', '#334155', 'rgba(100,116,139,0.20)')
                          }
                        >
                          Risk: {row.risk_level}
                        </span>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: 24, color: '#94A3B8', fontWeight: 700 }}>
                      No ledger entries found. Save your first checkup.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Dashboard;