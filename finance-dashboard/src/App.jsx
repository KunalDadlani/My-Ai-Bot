import { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';

// ─── Constants & Helpers ───────────────────────────────────────────
const CATEGORIES = [
  'Housing', 'Food & Groceries', 'Transportation', 'Utilities',
  'Healthcare', 'Entertainment', 'Shopping', 'Education',
  'Savings & Investments', 'Debt Payments', 'Insurance', 'Other'
];

const CATEGORY_COLORS = {
  'Housing': '#4F46E5',
  'Food & Groceries': '#059669',
  'Transportation': '#D97706',
  'Utilities': '#7C3AED',
  'Healthcare': '#DC2626',
  'Entertainment': '#EC4899',
  'Shopping': '#F59E0B',
  'Education': '#3B82F6',
  'Savings & Investments': '#10B981',
  'Debt Payments': '#EF4444',
  'Insurance': '#6366F1',
  'Other': '#6B7280'
};

const CURRENCY_SYMBOLS = { USD: '$', EUR: '\u20AC', GBP: '\u00A3', JPY: '\u00A5', INR: '\u20B9' };

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatCurrency(amount, currency = 'USD') {
  const sym = CURRENCY_SYMBOLS[currency] || '$';
  return `${sym}${Math.abs(amount).toFixed(2)}`;
}

function getMonthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthName(key) {
  const [y, m] = key.split('-');
  return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// ─── Storage helpers ───────────────────────────────────────────────
function loadData(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable
  }
}

// ─── Sample Data ───────────────────────────────────────────────────
function generateSampleData() {
  const now = new Date();
  const transactions = [];
  const descriptions = {
    'Housing': ['Rent Payment', 'Home Insurance', 'Property Tax'],
    'Food & Groceries': ['Grocery Store', 'Restaurant', 'Coffee Shop', 'Food Delivery'],
    'Transportation': ['Gas Station', 'Bus Pass', 'Car Maintenance', 'Uber Ride'],
    'Utilities': ['Electric Bill', 'Water Bill', 'Internet', 'Phone Bill'],
    'Healthcare': ['Doctor Visit', 'Pharmacy', 'Gym Membership'],
    'Entertainment': ['Movie Tickets', 'Streaming Service', 'Concert', 'Books'],
    'Shopping': ['Clothing Store', 'Electronics', 'Home Goods'],
    'Education': ['Online Course', 'Textbooks', 'Workshop'],
    'Savings & Investments': ['401k Contribution', 'Stock Purchase', 'Savings Transfer'],
    'Debt Payments': ['Credit Card Payment', 'Student Loan', 'Car Payment'],
    'Insurance': ['Health Insurance', 'Car Insurance', 'Life Insurance'],
    'Other': ['Miscellaneous', 'Gift', 'Donation']
  };

  for (let i = 0; i < 60; i++) {
    const daysAgo = Math.floor(Math.random() * 180);
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    const descs = descriptions[category];
    const amounts = {
      'Housing': [800, 2000], 'Food & Groceries': [10, 200], 'Transportation': [5, 150],
      'Utilities': [30, 200], 'Healthcare': [20, 500], 'Entertainment': [5, 100],
      'Shopping': [10, 300], 'Education': [20, 500], 'Savings & Investments': [50, 1000],
      'Debt Payments': [50, 500], 'Insurance': [50, 400], 'Other': [5, 200]
    };
    const [min, max] = amounts[category];
    const amount = Math.round((Math.random() * (max - min) + min) * 100) / 100;

    transactions.push({
      id: generateId(),
      date: date.toISOString().split('T')[0],
      description: descs[Math.floor(Math.random() * descs.length)],
      amount,
      category,
      type: 'expense'
    });
  }

  // Add some income
  for (let m = 0; m < 6; m++) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - m);
    date.setDate(1);
    transactions.push({
      id: generateId(),
      date: date.toISOString().split('T')[0],
      description: 'Salary',
      amount: 5000,
      category: 'Other',
      type: 'income'
    });
  }

  return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// ─── Main App Component ────────────────────────────────────────────
function App() {
  const [transactions, setTransactions] = useState(() => loadData('finance_transactions', generateSampleData()));
  const [budgets, setBudgets] = useState(() => loadData('finance_budgets', {
    'Housing': 1500, 'Food & Groceries': 600, 'Transportation': 300,
    'Utilities': 250, 'Healthcare': 200, 'Entertainment': 150,
    'Shopping': 200, 'Education': 100, 'Savings & Investments': 500,
    'Debt Payments': 400, 'Insurance': 300, 'Other': 200
  }));
  const [currency, setCurrency] = useState(() => loadData('finance_currency', 'USD'));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(getMonthKey(new Date()));
  const [darkMode, setDarkMode] = useState(() => loadData('finance_darkmode', false));
  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState('desc');

  // Persist state
  useEffect(() => { saveData('finance_transactions', transactions); }, [transactions]);
  useEffect(() => { saveData('finance_budgets', budgets); }, [budgets]);
  useEffect(() => { saveData('finance_currency', currency); }, [currency]);
  useEffect(() => { saveData('finance_darkmode', darkMode); }, [darkMode]);

  // ─── Computed Data ─────────────────────────────────────────────
  const monthlyData = useMemo(() => {
    const data = {};
    transactions.forEach(t => {
      const key = getMonthKey(t.date);
      if (!data[key]) data[key] = { income: 0, expenses: 0, byCategory: {} };
      if (t.type === 'income') {
        data[key].income += t.amount;
      } else {
        data[key].expenses += t.amount;
        data[key].byCategory[t.category] = (data[key].byCategory[t.category] || 0) + t.amount;
      }
    });
    return data;
  }, [transactions]);

  const currentMonthData = useMemo(() => {
    return monthlyData[selectedMonth] || { income: 0, expenses: 0, byCategory: {} };
  }, [monthlyData, selectedMonth]);

  const availableMonths = useMemo(() => {
    return [...new Set(transactions.map(t => getMonthKey(t.date)))].sort().reverse();
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    let filtered = transactions.filter(t => getMonthKey(t.date) === selectedMonth);
    if (filterCategory !== 'all') filtered = filtered.filter(t => t.category === filterCategory);
    if (filterType !== 'all') filtered = filtered.filter(t => t.type === filterType);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
      );
    }
    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') cmp = new Date(a.date) - new Date(b.date);
      else if (sortField === 'amount') cmp = a.amount - b.amount;
      else if (sortField === 'description') cmp = a.description.localeCompare(b.description);
      else if (sortField === 'category') cmp = a.category.localeCompare(b.category);
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return filtered;
  }, [transactions, selectedMonth, filterCategory, filterType, searchQuery, sortField, sortDir]);

  // ─── CRUD Operations ──────────────────────────────────────────
  const addTransaction = useCallback((t) => {
    setTransactions(prev => [{ ...t, id: generateId() }, ...prev]);
    setShowAddForm(false);
  }, []);

  const updateTransaction = useCallback((updated) => {
    setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t));
    setEditingTransaction(null);
  }, []);

  const deleteTransaction = useCallback((id) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, []);

  const updateBudget = useCallback((category, amount) => {
    setBudgets(prev => ({ ...prev, [category]: parseFloat(amount) || 0 }));
  }, []);

  // ─── Import / Export ───────────────────────────────────────────
  const exportToExcel = useCallback(() => {
    const data = filteredTransactions.map(t => ({
      Date: t.date, Description: t.description, Category: t.category,
      Type: t.type, Amount: t.amount
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    XLSX.writeFile(wb, `finance_${selectedMonth}.xlsx`);
  }, [filteredTransactions, selectedMonth]);

  const exportToCSV = useCallback(() => {
    const headers = 'Date,Description,Category,Type,Amount\n';
    const rows = filteredTransactions.map(t =>
      `${t.date},"${t.description}",${t.category},${t.type},${t.amount}`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `finance_${selectedMonth}.csv`; a.click();
    URL.revokeObjectURL(url);
  }, [filteredTransactions, selectedMonth]);

  const importCSV = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = ev.target.result.split('\n').slice(1);
      const imported = lines.filter(l => l.trim()).map(line => {
        const parts = line.match(/(".*?"|[^,]+)/g) || [];
        return {
          id: generateId(),
          date: parts[0]?.trim() || new Date().toISOString().split('T')[0],
          description: (parts[1] || '').replace(/"/g, '').trim(),
          category: parts[2]?.trim() || 'Other',
          type: parts[3]?.trim() || 'expense',
          amount: parseFloat(parts[4]) || 0
        };
      });
      setTransactions(prev => [...imported, ...prev]);
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  // ─── Sub-components ─────────────────────────────────────────────

  // Transaction Form (Add / Edit)
  function TransactionForm({ initial, onSubmit, onCancel }) {
    const [form, setForm] = useState(initial || {
      date: new Date().toISOString().split('T')[0],
      description: '',
      amount: '',
      category: 'Other',
      type: 'expense'
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!form.description || !form.amount) return;
      onSubmit({ ...form, amount: parseFloat(form.amount) });
    };

    const inputStyle = {
      width: '100%', padding: '8px 12px', borderRadius: 8,
      border: `1px solid ${darkMode ? '#4B5563' : '#D1D5DB'}`,
      background: darkMode ? '#374151' : '#fff',
      color: darkMode ? '#F9FAFB' : '#111827',
      fontSize: 14, boxSizing: 'border-box'
    };

    const labelStyle = { display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13, color: darkMode ? '#D1D5DB' : '#374151' };

    return (
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Date</label>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Type</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={inputStyle}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Description</label>
          <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What was this for?" style={inputStyle} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Amount</label>
            <input type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Category</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={inputStyle}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onCancel} style={{
            padding: '8px 16px', borderRadius: 8, border: `1px solid ${darkMode ? '#4B5563' : '#D1D5DB'}`,
            background: 'transparent', color: darkMode ? '#D1D5DB' : '#6B7280', cursor: 'pointer'
          }}>Cancel</button>
          <button type="submit" style={{
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: '#4F46E5', color: '#fff', cursor: 'pointer', fontWeight: 600
          }}>{ initial ? 'Update' : 'Add Transaction'}</button>
        </div>
      </form>
    );
  }

  // Simple Bar Chart
  function BarChart({ data, maxVal }) {
    if (!data || data.length === 0) return <div style={{ color: darkMode ? '#9CA3AF' : '#6B7280', textAlign: 'center', padding: 20 }}>No data</div>;
    const max = maxVal || Math.max(...data.map(d => d.value), 1);
    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 160, padding: '0 4px' }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, color: darkMode ? '#D1D5DB' : '#6B7280' }}>
              {formatCurrency(d.value, currency)}
            </span>
            <div style={{
              width: '100%', maxWidth: 40,
              height: `${Math.max((d.value / max) * 120, 4)}px`,
              background: d.color || '#4F46E5',
              borderRadius: '4px 4px 0 0',
              transition: 'height 0.3s'
            }} title={`${d.label}: ${formatCurrency(d.value, currency)}`} />
            <span style={{ fontSize: 9, color: darkMode ? '#9CA3AF' : '#9CA3AF', textAlign: 'center', lineHeight: 1.1 }}>
              {d.label}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // Budget progress bars
  function BudgetBars() {
    return (
      <div style={{ display: 'grid', gap: 10 }}>
        {CATEGORIES.map(cat => {
          const spent = currentMonthData.byCategory[cat] || 0;
          const budget = budgets[cat] || 0;
          const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
          const over = spent > budget && budget > 0;
          return (
            <div key={cat}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                <span style={{ color: darkMode ? '#E5E7EB' : '#374151', fontWeight: 500 }}>{cat}</span>
                <span style={{ color: over ? '#EF4444' : (darkMode ? '#9CA3AF' : '#6B7280') }}>
                  {formatCurrency(spent, currency)} / {formatCurrency(budget, currency)}
                  {over && ' (Over!)'}
                </span>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: darkMode ? '#374151' : '#E5E7EB' }}>
                <div style={{
                  height: '100%', borderRadius: 4,
                  width: `${pct}%`,
                  background: over ? '#EF4444' : CATEGORY_COLORS[cat],
                  transition: 'width 0.3s'
                }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Donut Chart (CSS-based)
  function DonutChart({ data }) {
    const total = data.reduce((s, d) => s + d.value, 0);
    if (total === 0) return <div style={{ color: darkMode ? '#9CA3AF' : '#6B7280', textAlign: 'center', padding: 20 }}>No data</div>;
    let cumulative = 0;
    const segments = data.filter(d => d.value > 0).map(d => {
      const start = (cumulative / total) * 360;
      cumulative += d.value;
      const end = (cumulative / total) * 360;
      return { ...d, start, end, pct: ((d.value / total) * 100).toFixed(1) };
    });

    const conicGradient = segments.map(s =>
      `${s.color} ${s.start}deg ${s.end}deg`
    ).join(', ');

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{
          width: 140, height: 140, borderRadius: '50%',
          background: `conic-gradient(${conicGradient})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: darkMode ? '#1F2937' : '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column'
          }}>
            <span style={{ fontSize: 11, color: darkMode ? '#9CA3AF' : '#6B7280' }}>Total</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: darkMode ? '#F9FAFB' : '#111827' }}>
              {formatCurrency(total, currency)}
            </span>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 4 }}>
          {segments.slice(0, 6).map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
              <span style={{ color: darkMode ? '#D1D5DB' : '#374151' }}>{s.label} ({s.pct}%)</span>
            </div>
          ))}
          {segments.length > 6 && (
            <span style={{ fontSize: 11, color: darkMode ? '#9CA3AF' : '#6B7280' }}>+{segments.length - 6} more</span>
          )}
        </div>
      </div>
    );
  }

  // Monthly trend data for bar chart
  const trendData = useMemo(() => {
    return availableMonths.slice(0, 6).reverse().map(m => ({
      label: getMonthName(m).split(' ')[0],
      value: monthlyData[m]?.expenses || 0,
      color: m === selectedMonth ? '#4F46E5' : (darkMode ? '#6B7280' : '#D1D5DB')
    }));
  }, [availableMonths, monthlyData, selectedMonth, darkMode]);

  // Category breakdown for donut chart
  const categoryDonutData = useMemo(() => {
    return CATEGORIES.map(c => ({
      label: c,
      value: currentMonthData.byCategory[c] || 0,
      color: CATEGORY_COLORS[c]
    })).filter(d => d.value > 0).sort((a, b) => b.value - a.value);
  }, [currentMonthData]);

  // ─── Styles ────────────────────────────────────────────────────
  const theme = {
    bg: darkMode ? '#111827' : '#F3F4F6',
    card: darkMode ? '#1F2937' : '#FFFFFF',
    text: darkMode ? '#F9FAFB' : '#111827',
    textSecondary: darkMode ? '#9CA3AF' : '#6B7280',
    border: darkMode ? '#374151' : '#E5E7EB',
  };

  const cardStyle = {
    background: theme.card, borderRadius: 12,
    padding: 20, border: `1px solid ${theme.border}`,
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  };

  const btnStyle = (active) => ({
    padding: '8px 16px', borderRadius: 8, border: 'none',
    background: active ? '#4F46E5' : (darkMode ? '#374151' : '#E5E7EB'),
    color: active ? '#fff' : theme.text,
    cursor: 'pointer', fontWeight: active ? 600 : 400, fontSize: 13,
    transition: 'all 0.2s'
  });

  // ─── Render ─────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Header */}
      <header style={{
        background: darkMode ? '#1F2937' : '#fff', borderBottom: `1px solid ${theme.border}`,
        padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#4F46E5' }}>FinanceTracker</span>
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={{
            padding: '6px 10px', borderRadius: 8, border: `1px solid ${theme.border}`,
            background: darkMode ? '#374151' : '#F9FAFB', color: theme.text, fontSize: 13
          }}>
            {availableMonths.map(m => <option key={m} value={m}>{getMonthName(m)}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select value={currency} onChange={e => setCurrency(e.target.value)} style={{
            padding: '6px 10px', borderRadius: 8, border: `1px solid ${theme.border}`,
            background: darkMode ? '#374151' : '#F9FAFB', color: theme.text, fontSize: 13
          }}>
            {Object.keys(CURRENCY_SYMBOLS).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={() => setDarkMode(!darkMode)} style={{
            padding: '6px 12px', borderRadius: 8, border: `1px solid ${theme.border}`,
            background: darkMode ? '#374151' : '#F9FAFB', color: theme.text, cursor: 'pointer', fontSize: 16
          }}>{darkMode ? '\u2600\uFE0F' : '\uD83C\uDF19'}</button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav style={{ padding: '12px 24px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['dashboard', 'transactions', 'budgets', 'reports'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={btnStyle(activeTab === tab)}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={() => { setEditingTransaction(null); setShowAddForm(true); }} style={{
          padding: '8px 16px', borderRadius: 8, border: 'none',
          background: '#059669', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13
        }}>+ Add Transaction</button>
      </nav>

      <main style={{ padding: '0 24px 24px', maxWidth: 1200, margin: '0 auto' }}>

        {/* ─── Add/Edit Modal ──────────────────────────────────── */}
        {(showAddForm || editingTransaction) && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
          }} onClick={() => { setShowAddForm(false); setEditingTransaction(null); }}>
            <div style={{ ...cardStyle, width: '90%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
              <h3 style={{ marginTop: 0, marginBottom: 16 }}>
                {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
              </h3>
              <TransactionForm
                initial={editingTransaction}
                onSubmit={editingTransaction ? updateTransaction : addTransaction}
                onCancel={() => { setShowAddForm(false); setEditingTransaction(null); }}
              />
            </div>
          </div>
        )}

        {/* ─── Dashboard Tab ──────────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'grid', gap: 16 }}>
            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <div style={{ ...cardStyle, borderLeft: '4px solid #059669' }}>
                <div style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 4 }}>Income</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#059669' }}>
                  {formatCurrency(currentMonthData.income, currency)}
                </div>
              </div>
              <div style={{ ...cardStyle, borderLeft: '4px solid #EF4444' }}>
                <div style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 4 }}>Expenses</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#EF4444' }}>
                  {formatCurrency(currentMonthData.expenses, currency)}
                </div>
              </div>
              <div style={{ ...cardStyle, borderLeft: '4px solid #4F46E5' }}>
                <div style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 4 }}>Net Savings</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: currentMonthData.income - currentMonthData.expenses >= 0 ? '#059669' : '#EF4444' }}>
                  {currentMonthData.income - currentMonthData.expenses >= 0 ? '+' : '-'}
                  {formatCurrency(currentMonthData.income - currentMonthData.expenses, currency)}
                </div>
              </div>
              <div style={{ ...cardStyle, borderLeft: '4px solid #D97706' }}>
                <div style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 4 }}>Transactions</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>
                  {filteredTransactions.length}
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
              <div style={cardStyle}>
                <h3 style={{ marginTop: 0, fontSize: 15 }}>Monthly Spending Trend</h3>
                <BarChart data={trendData} />
              </div>
              <div style={cardStyle}>
                <h3 style={{ marginTop: 0, fontSize: 15 }}>Spending by Category</h3>
                <DonutChart data={categoryDonutData} />
              </div>
            </div>

            {/* Budget Overview */}
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0, fontSize: 15 }}>Budget Overview</h3>
              <BudgetBars />
            </div>

            {/* Recent Transactions */}
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0, fontSize: 15 }}>Recent Transactions</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${theme.border}` }}>
                      <th style={{ textAlign: 'left', padding: '8px 6px', color: theme.textSecondary }}>Date</th>
                      <th style={{ textAlign: 'left', padding: '8px 6px', color: theme.textSecondary }}>Description</th>
                      <th style={{ textAlign: 'left', padding: '8px 6px', color: theme.textSecondary }}>Category</th>
                      <th style={{ textAlign: 'right', padding: '8px 6px', color: theme.textSecondary }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.slice(0, 5).map(t => (
                      <tr key={t.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                        <td style={{ padding: '8px 6px' }}>{t.date}</td>
                        <td style={{ padding: '8px 6px' }}>{t.description}</td>
                        <td style={{ padding: '8px 6px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: 12, fontSize: 11,
                            background: CATEGORY_COLORS[t.category] + '22',
                            color: CATEGORY_COLORS[t.category]
                          }}>{t.category}</span>
                        </td>
                        <td style={{
                          padding: '8px 6px', textAlign: 'right', fontWeight: 600,
                          color: t.type === 'income' ? '#059669' : '#EF4444'
                        }}>
                          {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── Transactions Tab ───────────────────────────────── */}
        {activeTab === 'transactions' && (
          <div style={{ display: 'grid', gap: 16 }}>
            {/* Filters */}
            <div style={{ ...cardStyle, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <input type="text" placeholder="Search..." value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  padding: '8px 12px', borderRadius: 8, border: `1px solid ${theme.border}`,
                  background: darkMode ? '#374151' : '#fff', color: theme.text, fontSize: 13, minWidth: 180
                }} />
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{
                padding: '8px 10px', borderRadius: 8, border: `1px solid ${theme.border}`,
                background: darkMode ? '#374151' : '#fff', color: theme.text, fontSize: 13
              }}>
                <option value="all">All Categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{
                padding: '8px 10px', borderRadius: 8, border: `1px solid ${theme.border}`,
                background: darkMode ? '#374151' : '#fff', color: theme.text, fontSize: 13
              }}>
                <option value="all">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
              <div style={{ flex: 1 }} />
              <button onClick={exportToCSV} style={btnStyle(false)}>Export CSV</button>
              <button onClick={exportToExcel} style={btnStyle(false)}>Export Excel</button>
              <label style={{ ...btnStyle(false), display: 'inline-block' }}>
                Import CSV
                <input type="file" accept=".csv" onChange={importCSV} style={{ display: 'none' }} />
              </label>
            </div>

            {/* Table */}
            <div style={{ ...cardStyle, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${theme.border}` }}>
                    {[['date', 'Date'], ['description', 'Description'], ['category', 'Category'], ['amount', 'Amount']].map(([field, label]) => (
                      <th key={field} onClick={() => {
                        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                        else { setSortField(field); setSortDir('desc'); }
                      }} style={{
                        textAlign: field === 'amount' ? 'right' : 'left',
                        padding: '8px 6px', color: theme.textSecondary, cursor: 'pointer', userSelect: 'none'
                      }}>
                        {label} {sortField === field ? (sortDir === 'asc' ? '\u2191' : '\u2193') : ''}
                      </th>
                    ))}
                    <th style={{ padding: '8px 6px', width: 80 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: theme.textSecondary }}>No transactions found</td></tr>
                  ) : filteredTransactions.map(t => (
                    <tr key={t.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                      <td style={{ padding: '8px 6px' }}>{t.date}</td>
                      <td style={{ padding: '8px 6px' }}>{t.description}</td>
                      <td style={{ padding: '8px 6px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 12, fontSize: 11,
                          background: CATEGORY_COLORS[t.category] + '22',
                          color: CATEGORY_COLORS[t.category]
                        }}>{t.category}</span>
                      </td>
                      <td style={{
                        padding: '8px 6px', textAlign: 'right', fontWeight: 600,
                        color: t.type === 'income' ? '#059669' : '#EF4444'
                      }}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, currency)}
                      </td>
                      <td style={{ padding: '8px 6px', textAlign: 'right' }}>
                        <button onClick={() => setEditingTransaction(t)} style={{
                          background: 'none', border: 'none', color: '#4F46E5', cursor: 'pointer', marginRight: 6, fontSize: 13
                        }}>Edit</button>
                        <button onClick={() => deleteTransaction(t.id)} style={{
                          background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 13
                        }}>Del</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── Budgets Tab ────────────────────────────────────── */}
        {activeTab === 'budgets' && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0, fontSize: 15 }}>Monthly Budgets for {getMonthName(selectedMonth)}</h3>
              <div style={{ display: 'grid', gap: 16 }}>
                {CATEGORIES.map(cat => {
                  const spent = currentMonthData.byCategory[cat] || 0;
                  const budget = budgets[cat] || 0;
                  const pct = budget > 0 ? (spent / budget) * 100 : 0;
                  const over = spent > budget && budget > 0;
                  return (
                    <div key={cat} style={{ display: 'grid', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 3, background: CATEGORY_COLORS[cat], flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>{cat}</span>
                        <input type="number" value={budget} onChange={e => updateBudget(cat, e.target.value)}
                          style={{
                            width: 100, padding: '4px 8px', borderRadius: 6,
                            border: `1px solid ${theme.border}`,
                            background: darkMode ? '#374151' : '#fff',
                            color: theme.text, textAlign: 'right', fontSize: 13
                          }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 10, borderRadius: 5, background: darkMode ? '#374151' : '#E5E7EB' }}>
                          <div style={{
                            height: '100%', borderRadius: 5,
                            width: `${Math.min(pct, 100)}%`,
                            background: over ? '#EF4444' : CATEGORY_COLORS[cat],
                            transition: 'width 0.3s'
                          }} />
                        </div>
                        <span style={{ fontSize: 12, color: over ? '#EF4444' : theme.textSecondary, minWidth: 80, textAlign: 'right' }}>
                          {formatCurrency(spent, currency)} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─── Reports Tab ────────────────────────────────────── */}
        {activeTab === 'reports' && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
              <div style={cardStyle}>
                <h3 style={{ marginTop: 0, fontSize: 15 }}>6-Month Expense Trend</h3>
                <BarChart data={trendData} />
              </div>
              <div style={cardStyle}>
                <h3 style={{ marginTop: 0, fontSize: 15 }}>Category Breakdown</h3>
                <DonutChart data={categoryDonutData} />
              </div>
            </div>

            {/* Top spending categories */}
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0, fontSize: 15 }}>Top Spending Categories</h3>
              <div style={{ display: 'grid', gap: 8 }}>
                {categoryDonutData.slice(0, 5).map((d, i) => (
                  <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontWeight: 700, color: theme.textSecondary, width: 20 }}>#{i + 1}</span>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: d.color }} />
                    <span style={{ flex: 1, fontWeight: 500 }}>{d.label}</span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(d.value, currency)}</span>
                  </div>
                ))}
                {categoryDonutData.length === 0 && (
                  <div style={{ color: theme.textSecondary, textAlign: 'center', padding: 20 }}>No expenses this month</div>
                )}
              </div>
            </div>

            {/* Income vs Expenses Summary */}
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0, fontSize: 15 }}>Monthly Summary</h3>
              <div style={{ display: 'grid', gap: 8 }}>
                {availableMonths.slice(0, 6).map(m => {
                  const d = monthlyData[m] || { income: 0, expenses: 0 };
                  const net = d.income - d.expenses;
                  return (
                    <div key={m} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0',
                      borderBottom: `1px solid ${theme.border}`
                    }}>
                      <span style={{ fontWeight: 600, minWidth: 80 }}>{getMonthName(m)}</span>
                      <span style={{ color: '#059669', minWidth: 100 }}>+{formatCurrency(d.income, currency)}</span>
                      <span style={{ color: '#EF4444', minWidth: 100 }}>-{formatCurrency(d.expenses, currency)}</span>
                      <span style={{ fontWeight: 700, color: net >= 0 ? '#059669' : '#EF4444', marginLeft: 'auto' }}>
                        {net >= 0 ? '+' : '-'}{formatCurrency(net, currency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
