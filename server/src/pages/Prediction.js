import React, { useState } from 'react';
import { supabase } from '../supabase';
import { API_BASE_URL } from '../config';
import { toast } from 'react-hot-toast';
import { Save, PieChart as PieChartIcon } from 'lucide-react';

// CHART COMPONENTS
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

function Prediction() {
  const [formData, setFormData] = useState({
    Income: "", Desired_Savings: "", Age: "25", Dependents: "0", Occupation: "0", City_Tier: "1",
    Exp_Housing: "", Exp_Groceries: "", Exp_Utilities: "", Exp_Shopping: "", Exp_Entertainment: "", Exp_Other: ""
  });

  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expenseChartData, setExpenseChartData] = useState(null);
  const [insights, setInsights] = useState([]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const calculateTotalExpense = () => {
    return (
      (parseFloat(formData.Exp_Housing) || 0) +
      (parseFloat(formData.Exp_Groceries) || 0) +
      (parseFloat(formData.Exp_Utilities) || 0) +
      (parseFloat(formData.Exp_Shopping) || 0) +
      (parseFloat(formData.Exp_Entertainment) || 0) +
      (parseFloat(formData.Exp_Other) || 0)
    );
  };

  const generateAIInsights = (income, expenses, desiredSavings) => {
    const tips = [];
    const housingPct = ((expenses.Exp_Housing || 0) / income) * 100;
    const shoppingPct = ((expenses.Exp_Shopping || 0) / income) * 100;
    const groceriesPct = ((expenses.Exp_Groceries || 0) / income) * 100;
    const entertainmentPct = ((expenses.Exp_Entertainment || 0) / income) * 100;

    if (housingPct > 35) tips.push(`Housing is taking up ${housingPct.toFixed(1)}% of your income. Consider lowering rent costs or sharing housing to improve savings.`);
    if (shoppingPct > 10) tips.push(`Shopping is high (${shoppingPct.toFixed(1)}%). Consider delaying non-essential purchases (e.g., 30-day rule).`);
    if (groceriesPct > 15) tips.push(`Groceries are ${groceriesPct.toFixed(1)}% of income. Meal planning can reduce leakage.`);
    if (entertainmentPct > 10) tips.push(`Entertainment is ${entertainmentPct.toFixed(1)}%. Review recurring subscriptions and discretionary spending.`);

    const totalExp = calculateTotalExpense();
    if (income - totalExp < desiredSavings) {
      tips.unshift(`You need to reduce expenses by $${(totalExp - (income - desiredSavings)).toFixed(2)} to meet your savings goal.`);
    } else {
      tips.unshift(`Your current budget supports your savings goal. Maintain discipline and review monthly.`);
    }

    return tips;
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("You must be logged in to run an analysis!");
      setLoading(false); return;
    }

    const totalExpense = calculateTotalExpense();
    const income = parseFloat(formData.Income) || 0;

    const payload = {
      Income: income,
      Age: parseFloat(formData.Age) || 25,
      Dependents: parseFloat(formData.Dependents) || 0,
      Occupation: parseInt(formData.Occupation) || 0,
      City_Tier: parseInt(formData.City_Tier) || 1,
      Total_Expense: totalExpense,
      Desired_Savings: parseFloat(formData.Desired_Savings) || 0
    };

    try {
      const res = await fetch(`${API_BASE_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Backend connection failed");

      const data = await res.json();

      // Translating ML responses to safe strings for the Dashboard
      let healthStatus = "Average";
      if (data.financial_health) {
        healthStatus = data.financial_health;
      } else if (data.final_marks_prediction) {
        if (data.final_marks_prediction >= 75) healthStatus = "Good";
        else if (data.final_marks_prediction >= 50) healthStatus = "Average";
        else healthStatus = "Bad";
      }

      const formattedData = {
        risk_level: data.risk_level || (data.final_fail_probability > 0.4 ? "High" : "Low"),
        financial_health: healthStatus,
        success_probability: data.final_pass_probability ? (data.final_pass_probability * 100).toFixed(0) : 85,
        monthly_savings_potential: income - totalExpense
      };

      setPrediction(formattedData);

      setExpenseChartData({
        labels: ['Housing', 'Groceries', 'Utilities', 'Shopping', 'Entertainment', 'Other'],
        datasets: [{
          data: [
            parseFloat(formData.Exp_Housing) || 0, parseFloat(formData.Exp_Groceries) || 0,
            parseFloat(formData.Exp_Utilities) || 0, parseFloat(formData.Exp_Shopping) || 0,
            parseFloat(formData.Exp_Entertainment) || 0, parseFloat(formData.Exp_Other) || 0
          ],
          backgroundColor: ['#2563EB', '#0D9488', '#B45309', '#DC2626', '#7C3AED', '#64748B'],
          borderWidth: 0
        }]
      });

      setInsights(generateAIInsights(income, formData, parseFloat(formData.Desired_Savings) || 0));
      toast.success("Financial analysis complete.");

    } catch (err) {
      console.error(err); toast.error("Could not connect to AI Brain.");
    } finally { setLoading(false); }
  };

  // --- FIXED: ACTUALLY SAVING DATA TO DATABASE ---
  const saveProgress = async () => {
    if (!prediction) return;
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const totalExpense = calculateTotalExpense();

      const { error } = await supabase.from('financial_progress').insert([{
        user_id: user.id,
        financial_health: prediction.financial_health,
        risk_level: prediction.risk_level,
        savings_potential: prediction.monthly_savings_potential,

        // Saving the raw inputs for the Dashboard Spreadsheet
        income: parseFloat(formData.Income) || 0,
        age: parseFloat(formData.Age) || 25,
        dependents: parseFloat(formData.Dependents) || 0,
        occupation: parseInt(formData.Occupation) || 0,
        city_tier: parseInt(formData.City_Tier) || 1,
        total_expense: totalExpense,
        desired_savings: parseFloat(formData.Desired_Savings) || 0
      }]);

      if (!error) {
        toast.success("Budget and goals saved to history.");
      } else {
        console.error("Supabase Error:", error);
        toast.error("Error saving data. Check your Supabase schema!");
      }
    } else {
      toast.error("Please log in to save!");
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
      padding: 18,
      boxShadow: '0 10px 26px rgba(15,23,42,0.08)',
      marginBottom: 16,
      textAlign: 'left'
    },
    h1: { margin: 0, fontSize: '1.35rem', fontWeight: 950, display: 'flex', alignItems: 'center', gap: 10 },
    p: { margin: '8px 0 0', color: '#64748B', fontWeight: 650, lineHeight: 1.45 },
    row: { display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-start', justifyContent: 'center' },
    card: {
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: 18,
      padding: 16,
      boxShadow: '0 12px 30px rgba(15,23,42,0.10)',
      flex: '1 1 420px'
    },
    sectionTitle: {
      margin: 0,
      fontSize: '1.05rem',
      fontWeight: 950,
      color: '#0F172A',
      paddingBottom: 10,
      borderBottom: '1px solid #EEF2F7',
      marginBottom: 14
    },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 },
    label: { fontSize: '0.85rem', fontWeight: 900, color: '#475569' },
    input: {
      width: '100%',
      padding: 12,
      borderRadius: 14,
      border: '1px solid #CBD5E1',
      background: '#F8FAFC',
      outline: 'none',
      boxSizing: 'border-box'
    },
    btn: (disabled) => ({
      marginTop: 14,
      width: '100%',
      padding: 12,
      borderRadius: 14,
      border: '1px solid transparent',
      background: disabled ? '#94A3B8' : '#0D9488',
      color: '#FFFFFF',
      fontWeight: 950,
      cursor: disabled ? 'not-allowed' : 'pointer',
      boxShadow: disabled ? 'none' : '0 10px 22px rgba(13,148,136,0.22)',
      transition: 'transform 120ms ease',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 10
    }),
    kpiRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 },
    kpi: {
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: 16,
      padding: 14
    },
    kpiLabel: { margin: 0, color: '#64748B', fontWeight: 850, fontSize: '0.85rem' },
    kpiValue: (color) => ({ margin: '6px 0 0', fontSize: '1.6rem', fontWeight: 950, color }),
    split: {
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: 16,
      padding: 14,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12
    },
    insightTitle: { margin: '10px 0 10px', fontWeight: 950, color: '#0F172A' },
    insight: (warn) => ({
      padding: 12,
      borderRadius: 14,
      background: warn ? 'rgba(220,38,38,0.08)' : '#FFFFFF',
      border: `1px solid ${warn ? 'rgba(220,38,38,0.20)' : '#E2E8F0'}`,
      color: '#0F172A',
      fontWeight: 650,
      lineHeight: 1.45
    })
  };

  const totalExpense = calculateTotalExpense();
  const desiredSavings = parseFloat(formData.Desired_Savings) || 0;

  return (
    <div style={ui.shell}>
      <div style={ui.container}>
        <header style={ui.header}>
          <h1 style={ui.h1}><PieChartIcon size={22} color="#0D9488" /> Smart Budget Planner</h1>
          <p style={ui.p}>Enter your income and expenses to estimate savings potential and get recommendations.</p>
        </header>

        <div style={ui.row}>
          <div style={ui.card}>
            <form onSubmit={handleAnalyze}>
              <h3 style={ui.sectionTitle}>Income & Goal</h3>

              <div style={ui.grid2}>
                <div>
                  <label style={ui.label}>Monthly Income ($)</label>
                  <input
                    name="Income"
                    type="number"
                    onChange={handleChange}
                    required
                    style={ui.input}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#0D9488';
                      e.currentTarget.style.boxShadow = '0 0 0 4px rgba(13,148,136,0.15)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#CBD5E1';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div>
                  <label style={ui.label}>Desired Savings ($)</label>
                  <input
                    name="Desired_Savings"
                    type="number"
                    onChange={handleChange}
                    required
                    style={ui.input}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#0D9488';
                      e.currentTarget.style.boxShadow = '0 0 0 4px rgba(13,148,136,0.15)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#CBD5E1';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              <h3 style={ui.sectionTitle}>Expense Breakdown</h3>

              <div style={ui.grid2}>
                {[
                  { label: "Rent / Housing", name: "Exp_Housing" },
                  { label: "Groceries", name: "Exp_Groceries" },
                  { label: "Utilities / Bills", name: "Exp_Utilities" },
                  { label: "Shopping", name: "Exp_Shopping" },
                  { label: "Entertainment", name: "Exp_Entertainment" },
                  { label: "Other", name: "Exp_Other" }
                ].map((field) => (
                  <div key={field.name}>
                    <label style={ui.label}>{field.label} ($)</label>
                    <input
                      name={field.name}
                      type="number"
                      placeholder="0"
                      onChange={handleChange}
                      style={ui.input}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#0D9488';
                        e.currentTarget.style.boxShadow = '0 0 0 4px rgba(13,148,136,0.15)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#CBD5E1';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                ))}
              </div>

              <button
                className="btn-primary"
                disabled={loading}
                style={ui.btn(loading)}
                onMouseDown={(e) => { if (!loading) e.currentTarget.style.transform = 'translateY(1px)'; }}
                onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                {loading ? "Analyzing…" : "Optimize Budget"}
              </button>
            </form>
          </div>

          {prediction && expenseChartData && (
            <div style={{ ...ui.card, background: '#FFFFFF' }}>
              <div style={ui.kpiRow}>
                <div style={ui.kpi}>
                  <p style={ui.kpiLabel}>Goal Success Probability</p>
                  <p style={ui.kpiValue('#2563EB')}>{prediction.success_probability}%</p>
                </div>
                <div style={ui.kpi}>
                  <p style={ui.kpiLabel}>Projected Savings</p>
                  <p style={ui.kpiValue(prediction.monthly_savings_potential >= desiredSavings ? '#0D9488' : '#DC2626')}>
                    ${prediction.monthly_savings_potential}
                  </p>
                </div>
              </div>

              <div style={ui.split}>
                <div style={{ height: 160, width: '50%', minWidth: 160 }}>
                  <Pie
                    data={expenseChartData}
                    options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }}
                  />
                </div>
                <div style={{ width: '50%' }}>
                  <div style={{ fontWeight: 950, color: '#0F172A', marginBottom: 6 }}>
                    Total Expenses: ${totalExpense}
                  </div>
                  <div style={{ color: '#64748B', fontWeight: 650, lineHeight: 1.45 }}>
                    This breakdown helps identify categories to optimize.
                  </div>
                </div>
              </div>

              <h3 style={ui.insightTitle}>Recommendations</h3>
              <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
                {insights.map((insight, idx) => (
                  <div key={idx} style={ui.insight(idx === 0 && insight.includes('reduce expenses'))}>
                    {insight}
                  </div>
                ))}
              </div>

              <button
                onClick={saveProgress}
                className="btn-primary"
                style={{ ...ui.btn(false), background: '#0F172A', boxShadow: '0 10px 22px rgba(15,23,42,0.18)' }}
              >
                <Save size={18} /> Save Plan
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Prediction;