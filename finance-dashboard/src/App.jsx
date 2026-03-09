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

  // PART 2 ENDS HERE — render/return JSX continues in Part 3
  // __PART3_PLACEHOLDER__
}

export default App;
