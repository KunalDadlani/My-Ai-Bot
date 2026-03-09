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

  // PART 1 ENDS HERE — render function continues in Part 2
  // __PART2_PLACEHOLDER__
}

export default App;
