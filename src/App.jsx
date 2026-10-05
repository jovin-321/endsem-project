import React, { useState, useEffect } from 'react'
import { usePersistentState } from './storage.js'
import './App.css'

/* =========================================================
   HELPERS & COMMON COMPONENTS
   ========================================================= */

function getToday() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDate(dateString) {
  if (!dateString) return ''
  const [year, month, day] = dateString.split('-')
  return `${day}-${month}-${year}`
}

function getCurrentMonth() {
  return getToday().slice(0, 7)
}

function formatMonth(monthString) {
  if (!monthString) return ''
  const [year, month] = monthString.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

function getAvailableMonths() {
  const months = []
  const currentMonth = getCurrentMonth()
  const [year, month] = currentMonth.split('-')
  const currentDate = new Date(Number(year), Number(month) - 1, 1)

  for (let i = 0; i < 12; i++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
    months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)
  }
  return months
}

function formatMoney(amount) {
  return Number(amount || 0).toLocaleString('en-IN')
}

/* Toast Alert Component */
function ToastAlert({ message, type, onClose }) {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClose()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [message, onClose])

  if (!message) return null

  return (
    <div className="toast-container">
      <div className={`toast toast-${type}`}>
        <span>{message}</span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1rem', padding: '0 4px' }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}

/* Confirm Modal */
function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }) {
  if (!isOpen) return null

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h3>{title || 'Are you sure?'}</h3>
        <p style={{ margin: '12px 0 20px 0', color: '#4b5563' }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  )
}

/* Category Breakdown Chart */
function CategoryBreakdown({ transactions }) {
  const totals = {}
  transactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      const name = t.category || 'Other'
      totals[name] = (totals[name] || 0) + Number(t.amount || 0)
    })

  const rows = Object.entries(totals).sort((a, b) => b[1] - a[1])
  const grandTotal = rows.reduce((sum, row) => sum + row[1], 0)

  return (
    <div className="category-breakdown">
      <h2>📊 Spending by Category</h2>
      {rows.length === 0 ? (
        <p style={{ color: '#6b7280' }}>No expenses recorded for this month yet.</p>
      ) : (
        <>
          {rows.map(([name, total]) => {
            const percentage = grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0
            return (
              <div key={name} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                  <span>{name} ({percentage}%)</span>
                  <strong>₹{formatMoney(total)}</strong>
                </div>
                <div className="category-bar-bg">
                  <div className="category-bar-fill" style={{ width: `${percentage}%` }} />
                </div>
              </div>
            )
          })}
          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #e5e7eb', textAlign: 'right' }}>
            <strong>Total Expenses: ₹{formatMoney(grandTotal)}</strong>
          </div>
        </>
      )}
    </div>
  )
}

/* CSV Exporter Utility */
function exportToCSV(filename, headers, rows) {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}


/* =========================================================
   INDIVIDUAL TRACKER
   ========================================================= */

function IndividualTracker({ onBack, userEmail, onLogout }) {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [transactions, setTransactions] = usePersistentState(
    'spendwise.individual.transactions',
    [],
    Array.isArray
  )

  const [transactionType, setTransactionType] = useState('salary')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Salary')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(getToday())
  const [person, setPerson] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [editingId, setEditingId] = useState(null)

  const [filterType, setFilterType] = useState('all')

  const [showMoneyDue, setShowMoneyDue] = useState(false)
  const [paymentBorrowedId, setPaymentBorrowedId] = useState(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(getToday())

  const [toast, setToast] = useState({ message: '', type: 'success' })
  const [deleteId, setDeleteId] = useState(null)

  const showSuccess = (msg) => setToast({ message: msg, type: 'success' })
  const showError = (msg) => setToast({ message: msg, type: 'error' })

  const availableMonths = getAvailableMonths()

  function getPaidAmount(borrowedId) {
    return transactions
      .filter((t) => t.type === 'repayment' && t.borrowedId === borrowedId)
      .reduce((total, t) => total + Number(t.amount), 0)
  }

  function getRemainingAmount(borrowedTransaction) {
    const paid = getPaidAmount(borrowedTransaction.id)
    return Math.max(0, Number(borrowedTransaction.amount) - paid)
  }

  const moneyDue = transactions.filter(
    (t) => t.type === 'borrowed' && getRemainingAmount(t) > 0
  )

  function startEditing(transaction) {
    setEditingId(transaction.id)
    setTransactionType(transaction.type)
    setAmount(transaction.amount)
    setCategory(transaction.category)
    setNote(transaction.note || '')
    setDate(transaction.date)
    setPerson(transaction.person || '')
    setDueDate(transaction.dueDate || '')
    showSuccess('Editing transaction details...')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEditing() {
    setEditingId(null)
    setAmount('')
    setNote('')
    setPerson('')
    setDueDate('')
    setDate(getToday())
    setTransactionType('salary')
    setCategory('Salary')
  }

  function handleTypeChange(type) {
    setTransactionType(type)
    if (type === 'salary') setCategory('Salary')
    if (type === 'income') setCategory('Gift')
    if (type === 'expense') setCategory('Food')
    if (type === 'borrowed') setCategory('Borrowed Money')
  }

  function saveTransaction() {
    const numericAmount = Number(amount)
    if (!numericAmount || numericAmount <= 0) {
      showError('Please enter an amount greater than ₹0.')
      return
    }
    if (date > getToday()) {
      showError('Future transaction dates are not allowed.')
      return
    }
    if (date.slice(0, 7) !== selectedMonth) {
      showError(`Transaction date belongs to ${formatMonth(date.slice(0, 7))}.`)
      return
    }
    if (transactionType === 'borrowed' && !person.trim()) {
      showError('Please enter the person borrowed from.')
      return
    }
    if (transactionType === 'borrowed' && !dueDate) {
      showError('Please enter a repayment due date.')
      return
    }
    if (transactionType === 'borrowed' && dueDate < date) {
      showError('Due date cannot be before borrowing date.')
      return
    }

    if (editingId !== null) {
      setTransactions(
        transactions.map((t) =>
          t.id === editingId
            ? { ...t, amount: numericAmount, type: transactionType, category, note, date, person, dueDate }
            : t
        )
      )
      showSuccess('Transaction updated successfully.')
      cancelEditing()
      return
    }

    const newTransaction = {
      id: Date.now(),
      amount: numericAmount,
      type: transactionType,
      category,
      note,
      date,
      person,
      dueDate,
      borrowedId: null,
    }

    setTransactions([...transactions, newTransaction])
    setAmount('')
    setNote('')
    setPerson('')
    setDueDate('')
    setDate(getToday())
    showSuccess('Transaction added successfully.')
  }

  function recordRepayment() {
    if (!paymentBorrowedId) return
    const borrowed = transactions.find((t) => t.id === paymentBorrowedId)
    if (!borrowed) return
    const numericPayment = Number(paymentAmount)

    if (!numericPayment || numericPayment <= 0) {
      showError('Please enter a valid repayment amount.')
      return
    }
    if (paymentDate < borrowed.date) {
      showError(`Repayment date cannot be before ${formatDate(borrowed.date)}.`)
      return
    }
    if (paymentDate > getToday()) {
      showError('Future repayment dates are not allowed.')
      return
    }

    const remaining = getRemainingAmount(borrowed)
    if (numericPayment > remaining) {
      showError(`Maximum repayment amount due is ₹${formatMoney(remaining)}.`)
      return
    }

    const repayment = {
      id: Date.now(),
      amount: numericPayment,
      type: 'repayment',
      category: 'Repayment',
      note: `Repayment to ${borrowed.person}`,
      date: paymentDate,
      person: borrowed.person,
      dueDate: '',
      borrowedId: borrowed.id,
    }

    setTransactions([...transactions, repayment])
    setPaymentBorrowedId(null)
    setPaymentAmount('')
    showSuccess('Repayment recorded successfully!')
  }

  function handleConfirmDelete() {
    if (!deleteId) return
    const target = transactions.find((t) => t.id === deleteId)
    if (target?.type === 'borrowed') {
      const hasRepayments = transactions.some(
        (t) => t.type === 'repayment' && t.borrowedId === deleteId
      )
      if (hasRepayments) {
        showError('Delete associated repayments first before removing this borrowed entry.')
        setDeleteId(null)
        return
      }
    }

    setTransactions(transactions.filter((t) => t.id !== deleteId))
    setDeleteId(null)
    showSuccess('Transaction deleted.')
  }

  function handleExportCSV() {
    const headers = ['Date', 'Type', 'Category', 'Amount (INR)', 'Person', 'Due Date', 'Note']
    const rows = monthTransactions.map(t => [
      t.date,
      t.type,
      t.category,
      t.amount,
      t.person || '',
      t.dueDate || '',
      t.note || ''
    ])
    exportToCSV(`individual_expenses_${selectedMonth}.csv`, headers, rows)
    showSuccess('CSV export downloaded successfully!')
  }

  function loadSampleData() {
    const curr = selectedMonth
    const samples = [
      { id: Date.now() + 1, amount: 65000, type: 'salary', category: 'Salary', note: 'Monthly Salary', date: `${curr}-01`, person: '', dueDate: '', borrowedId: null },
      { id: Date.now() + 2, amount: 3500, type: 'expense', category: 'Food', note: 'Grocery shopping', date: `${curr}-03`, person: '', dueDate: '', borrowedId: null },
      { id: Date.now() + 3, amount: 1200, type: 'expense', category: 'Transport', note: 'Metro pass', date: `${curr}-05`, person: '', dueDate: '', borrowedId: null },
      { id: Date.now() + 4, amount: 5000, type: 'income', category: 'Bonus', note: 'Performance reward', date: `${curr}-10`, person: '', dueDate: '', borrowedId: null }
    ]
    setTransactions([...transactions, ...samples])
    showSuccess('Sample data loaded for demonstration!')
  }

  const monthTransactions = transactions.filter(
    (t) => t.date.slice(0, 7) === selectedMonth
  )

  const salary = monthTransactions.filter((t) => t.type === 'salary').reduce((a, b) => a + Number(b.amount), 0)
  const extraIncome = monthTransactions.filter((t) => t.type === 'income').reduce((a, b) => a + Number(b.amount), 0)
  const totalIncome = salary + extraIncome
  const totalExpenses = monthTransactions.filter((t) => t.type === 'expense').reduce((a, b) => a + Number(b.amount), 0)

  const monthlySavings = totalIncome - totalExpenses

  const filteredTransactions = monthTransactions.filter((t) => {
    if (filterType === 'all') return true
    return t.type === filterType
  })

  const sortedTransactions = [...filteredTransactions].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="tracker">
      <ToastAlert message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
      <ConfirmModal
        isOpen={Boolean(deleteId)}
        title="Confirm Deletion"
        message="Are you sure you want to delete this transaction entry?"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteId(null)}
      />

      {/* Sync / Status Banner with Space and Logout Button */}
      {userEmail && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', background: '#f3f4f6', padding: '8px 16px', borderRadius: '8px' }}>
          <span style={{ fontSize: '0.9rem', color: '#374151' }}>
            ✓ Saved to cloud {userEmail}
          </span>
          <button className="btn-secondary" onClick={onLogout} style={{ padding: '4px 12px', fontSize: '0.85rem' }}>
            Log out
          </button>
        </div>
      )}

      <div className="top-bar-nav">
        <button onClick={onBack} className="btn-secondary">← Back to Home</button>
        <div className="action-buttons-group">
          <button onClick={loadSampleData} className="btn-secondary">⚡ Load Sample Data</button>
          <button onClick={handleExportCSV} className="btn-secondary">📥 Export CSV</button>
          <button onClick={() => setShowMoneyDue(!showMoneyDue)}>
            💰 Money Due {moneyDue.length > 0 && `(${moneyDue.length})`}
          </button>
        </div>
      </div>

      <h1>Individual Expense Tracker</h1>
      <hr />

      {showMoneyDue && (
        <div className="card" style={{ borderColor: '#4f46e5', backgroundColor: '#eef2ff' }}>
          <h3>💰 Outstanding Borrowed Money</h3>
          {moneyDue.length === 0 ? (
            <p>🎉 No outstanding money due.</p>
          ) : (
            moneyDue.map((b) => (
              <div key={b.id} style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #c7d2fe' }}>
                <strong>{b.person}</strong> — Due: {formatDate(b.dueDate)}
                <br />
                Remaining: <strong style={{ color: '#dc2626' }}>₹{formatMoney(getRemainingAmount(b))}</strong>
                <button onClick={() => setPaymentBorrowedId(b.id)} style={{ marginLeft: '10px', padding: '4px 8px' }}>Record Repayment</button>
              </div>
            ))
          )}
        </div>
      )}

      {paymentBorrowedId && (
        <div className="card" style={{ border: '2px solid #4f46e5' }}>
          <h3>Record Repayment</h3>
          <input type="number" placeholder="Payment Amount" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
          <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
            <button onClick={recordRepayment}>Confirm Repayment</button>
            <button className="btn-secondary" onClick={() => setPaymentBorrowedId(null)}>Cancel</button>
          </div>
        </div>
      )}

      <section className="card">
        <h2>{formatMonth(selectedMonth)} Summary</h2>
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-card-title">Salary</div>
            <div className="stat-card-value green">₹{formatMoney(salary)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-title">Extra Income</div>
            <div className="stat-card-value green">₹{formatMoney(extraIncome)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-title">Total Income</div>
            <div className="stat-card-value green">₹{formatMoney(totalIncome)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-title">Expenses</div>
            <div className="stat-card-value red">₹{formatMoney(totalExpenses)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-title">Net Savings</div>
            <div className={`stat-card-value ${monthlySavings >= 0 ? 'green' : 'red'}`}>
              ₹{formatMoney(monthlySavings)}
            </div>
          </div>
        </div>

        <label><strong>Select Month: </strong></label>
        <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={{ width: 'auto', display: 'inline-block' }}>
          {availableMonths.map((m) => (
            <option key={m} value={m}>{formatMonth(m)}</option>
          ))}
        </select>
      </section>

      <section className="card">
        <CategoryBreakdown transactions={monthTransactions} />
      </section>

      <section className="card">
        <h2>{editingId !== null ? '✏️ Edit Transaction' : '➕ Add Transaction'}</h2>

        <label>Type</label>
        <select value={transactionType} onChange={(e) => handleTypeChange(e.target.value)}>
          <option value="salary">Salary</option>
          <option value="income">Extra Income</option>
          <option value="expense">Expense</option>
          <option value="borrowed">Borrowed Money</option>
        </select>

        <label>Amount (₹)</label>
        <input type="number" min="1" placeholder="Enter amount" value={amount} onChange={(e) => setAmount(e.target.value)} />

        {transactionType === 'expense' && (
          <>
            <label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="Food">Food</option>
              <option value="Transport">Transport</option>
              <option value="Shopping">Shopping</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Education">Education</option>
              <option value="Bills">Bills</option>
              <option value="Health">Health</option>
              <option value="Other">Other</option>
            </select>
          </>
        )}

        {transactionType === 'borrowed' && (
          <>
            <label>Person</label>
            <input type="text" placeholder="Person name" value={person} onChange={(e) => setPerson(e.target.value)} />
            <label>Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </>
        )}

        <label>Note</label>
        <input type="text" placeholder="Optional notes" value={note} onChange={(e) => setNote(e.target.value)} />

        <label>Date</label>
        <input type="date" max={getToday()} value={date} onChange={(e) => setDate(e.target.value)} />

        <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
          <button onClick={saveTransaction}>{editingId !== null ? 'Save Changes' : 'Add Transaction'}</button>
          {editingId !== null && <button className="btn-secondary" onClick={cancelEditing}>Cancel Edit</button>}
        </div>
      </section>

      <section className="card">
        <h2>📖 {formatMonth(selectedMonth)} Transactions Diary</h2>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '16px 0 20px 0' }}>
          <button
            className={filterType === 'all' ? '' : 'btn-secondary'}
            onClick={() => setFilterType('all')}
            style={{ padding: '6px 14px', fontSize: '0.9rem' }}
          >
            All
          </button>
          <button
            className={filterType === 'salary' ? '' : 'btn-secondary'}
            onClick={() => setFilterType('salary')}
            style={{ padding: '6px 14px', fontSize: '0.9rem' }}
          >
            Salary
          </button>
          <button
            className={filterType === 'income' ? '' : 'btn-secondary'}
            onClick={() => setFilterType('income')}
            style={{ padding: '6px 14px', fontSize: '0.9rem' }}
          >
            Extra Income
          </button>
          <button
            className={filterType === 'expense' ? '' : 'btn-secondary'}
            onClick={() => setFilterType('expense')}
            style={{ padding: '6px 14px', fontSize: '0.9rem' }}
          >
            Expenses
          </button>
          <button
            className={filterType === 'borrowed' ? '' : 'btn-secondary'}
            onClick={() => setFilterType('borrowed')}
            style={{ padding: '6px 14px', fontSize: '0.9rem' }}
          >
            Borrowed Money
          </button>
          <button
            className={filterType === 'repayment' ? '' : 'btn-secondary'}
            onClick={() => setFilterType('repayment')}
            style={{ padding: '6px 14px', fontSize: '0.9rem' }}
          >
            Repayments
          </button>
        </div>

        {sortedTransactions.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No entries found for this category filter.</p>
        ) : (
          sortedTransactions.map((t) => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #e5e7eb', alignItems: 'center' }}>
              <div>
                <strong>{t.category}</strong> {t.person && `(${t.person})`} — <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>{formatDate(t.date)}</span>
                {t.note && <div style={{ fontSize: '0.85rem', color: '#4b5563' }}>{t.note}</div>}
              </div>
              <div>
                <strong style={{ color: t.type === 'expense' || t.type === 'repayment' ? '#dc2626' : '#16a34a', marginRight: '12px' }}>
                  ₹{formatMoney(t.amount)}
                </strong>
                <button className="btn-secondary" onClick={() => startEditing(t)} style={{ padding: '4px 8px', marginRight: '4px' }}>✏️ Edit</button>
                <button className="btn-danger" onClick={() => setDeleteId(t.id)} style={{ padding: '4px 8px' }}>Delete</button>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  )
}


/* =========================================================
   FAMILY TRACKER
   ========================================================= */

const EXPENSE_CATEGORIES = [
  'Food', 'Transport', 'Shopping', 'Entertainment',
  'Education', 'Bills', 'Health', 'Other',
]

function isMislabelledExpense(t) {
  return t.type === 'expense' && !EXPENSE_CATEGORIES.includes(t.category)
}

function FamilyTracker({ onBack, userEmail, onLogout }) {
  const [familyName, setFamilyName] = usePersistentState('spendwise.family.name', '')
  const [familyCreated, setFamilyCreated] = usePersistentState('spendwise.family.created', false)
  const [members, setMembers] = usePersistentState('spendwise.family.members', [
    { id: 'member-1', name: 'Mom', role: 'Parent' },
    { id: 'member-2', name: 'Dad', role: 'Parent' },
    { id: 'member-3', name: 'Kid', role: 'Child' },
  ], Array.isArray)

  const [isEditingFamilyName, setIsEditingFamilyName] = useState(false)
  const [tempFamilyName, setTempFamilyName] = useState(familyName)

  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberRole, setNewMemberRole] = useState('Child')
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [transactions, setTransactions] = usePersistentState('spendwise.family.transactions', [], Array.isArray)

  const [transactionType, setTransactionType] = useState('expense')
  const [selectedMember, setSelectedMember] = useState('')
  const [transferFrom, setTransferFrom] = useState('')
  const [transferTo, setTransferTo] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Food')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(getToday())
  const [editingId, setEditingId] = useState(null)

  const [toast, setToast] = useState({ message: '', type: 'success' })
  const [deleteId, setDeleteId] = useState(null)

  const showSuccess = (msg) => setToast({ message: msg, type: 'success' })
  const showError = (msg) => setToast({ message: msg, type: 'error' })

  const availableMonths = getAvailableMonths()

  useEffect(() => {
    if (members.length > 0) {
      if (!selectedMember) setSelectedMember(members[0].id)
      if (!transferFrom) setTransferFrom(members[0].id)
      if (!transferTo) setTransferTo(members[1] ? members[1].id : members[0].id)
    }
  }, [members, selectedMember, transferFrom, transferTo])

  useEffect(() => {
    if (transactions.some(isMislabelledExpense)) {
      setTransactions(
        transactions.map((t) => (isMislabelledExpense(t) ? { ...t, category: 'Food' } : t))
      )
    }
  }, [transactions, setTransactions])

  function getMemberName(id) {
    const member = members.find((m) => m.id === id)
    return member ? member.name : 'Unknown Member'
  }

  function createFamily() {
    if (!familyName.trim()) {
      showError('Please enter a valid family name.')
      return
    }
    setFamilyCreated(true)
    showSuccess(`${familyName.trim()} Tracker created successfully!`)
  }

  function saveFamilyName() {
    if (!tempFamilyName.trim()) {
      showError('Family name cannot be empty.')
      return
    }
    setFamilyName(tempFamilyName.trim())
    setIsEditingFamilyName(false)
    showSuccess('Family name updated successfully!')
  }

  function addMember() {
    if (!newMemberName.trim()) {
      showError('Please enter member name.')
      return
    }
    const newM = { id: `member-${Date.now()}`, name: newMemberName.trim(), role: newMemberRole }
    setMembers([...members, newM])
    setNewMemberName('')
    showSuccess(`Added ${newM.name} to family members.`)
  }

  function handleTypeChange(type) {
    setTransactionType(type)
    if (type === 'salary') setCategory('Salary')
    if (type === 'expense') setCategory('Food')
    if (type === 'extraIncome') setCategory('Bonus')
  }

  function saveTransaction() {
    if (date > getToday()) {
      showError('Future dates are not allowed.')
      return
    }

    const numericAmount = Number(amount)
    if (!numericAmount || numericAmount <= 0) {
      showError('Please enter a valid amount greater than ₹0.')
      return
    }

    if (transactionType === 'transfer') {
      if (!transferFrom || !transferTo) {
        showError('Please select both sender and receiver.')
        return
      }
      if (transferFrom === transferTo) {
        showError('Transfer sender and receiver cannot be the same member.')
        return
      }
      const transferObj = {
        id: editingId || `tx-${Date.now()}`,
        type: 'transfer',
        fromMemberId: transferFrom,
        toMemberId: transferTo,
        amount: numericAmount,
        category: 'Internal Transfer',
        date,
        note: note.trim() || `Transfer from ${getMemberName(transferFrom)} to ${getMemberName(transferTo)}`,
      }
      setTransactions(editingId ? transactions.map(t => t.id === editingId ? transferObj : t) : [...transactions, transferObj])
      showSuccess(`₹${formatMoney(numericAmount)} transferred from ${getMemberName(transferFrom)} to ${getMemberName(transferTo)}.`)
      resetForm()
      return
    }

    if (!selectedMember) {
      showError('Please select a family member.')
      return
    }

    const txObj = {
      id: editingId || `tx-${Date.now()}`,
      type: transactionType,
      memberId: selectedMember,
      amount: numericAmount,
      category:
        transactionType === 'salary'
          ? 'Salary'
          : transactionType === 'expense' && !EXPENSE_CATEGORIES.includes(category)
            ? 'Food'
            : category,
      note: note.trim(),
      date,
    }

    setTransactions(editingId ? transactions.map(t => t.id === editingId ? txObj : t) : [...transactions, txObj])
    showSuccess(editingId ? 'Transaction updated successfully!' : 'Family transaction added successfully!')
    resetForm()
  }

  function editTransaction(tx) {
    setEditingId(tx.id)
    setTransactionType(tx.type)
    setAmount(String(tx.amount))
    setDate(tx.date)
    setNote(tx.note || '')

    if (tx.type === 'transfer') {
      setTransferFrom(tx.fromMemberId)
      setTransferTo(tx.toMemberId)
    } else {
      setSelectedMember(tx.memberId)
      setCategory(tx.category || 'Food')
    }
    showSuccess('Editing family entry...')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetForm() {
    setTransactionType('expense')
    setCategory('Food')
    setAmount('')
    setNote('')
    setEditingId(null)
    setDate(getToday())
  }

  function confirmDelete() {
    if (!deleteId) return
    setTransactions(transactions.filter((t) => t.id !== deleteId))
    setDeleteId(null)
    showSuccess('Family transaction entry removed.')
  }

  function loadSampleData() {
    const curr = selectedMonth
    if (members.length < 2) {
      showError('Need at least 2 family members to load transfer sample data.')
      return
    }
    const samples = [
      { id: `tx-${Date.now()}-1`, type: 'salary', memberId: members[0].id, amount: 80000, category: 'Salary', note: 'Primary Income', date: `${curr}-01` },
      { id: `tx-${Date.now()}-2`, type: 'transfer', fromMemberId: members[0].id, toMemberId: members[1].id, amount: 15000, category: 'Internal Transfer', note: 'Monthly allowance for household', date: `${curr}-02` },
      { id: `tx-${Date.now()}-3`, type: 'expense', memberId: members[1].id, amount: 4500, category: 'Food', note: 'Monthly Provisions', date: `${curr}-03` },
      { id: `tx-${Date.now()}-4`, type: 'expense', memberId: members[0].id, amount: 2200, category: 'Bills', note: 'Electricity Bill', date: `${curr}-04` },
    ]
    setTransactions([...transactions, ...samples])
    showSuccess('Sample family data loaded!')
  }

  function handleExportCSV() {
    const headers = ['Date', 'Type', 'Member / Details', 'Category', 'Amount (INR)', 'Note']
    const rows = monthlyTransactions.map(t => [
      t.date,
      t.type,
      t.type === 'transfer' ? `${getMemberName(t.fromMemberId)} ➔ ${getMemberName(t.toMemberId)}` : getMemberName(t.memberId),
      t.category || '',
      t.amount,
      t.note || ''
    ])
    exportToCSV(`family_expenses_${selectedMonth}.csv`, headers, rows)
    showSuccess('Family CSV export downloaded!')
  }

  const monthlyTransactions = transactions.filter((t) => t.date && t.date.startsWith(selectedMonth))

  const filteredLog = monthlyTransactions
    .filter((t) => filterType === 'all' || t.type === filterType)
    .sort((a, b) => b.date.localeCompare(a.date))
  const monthlySalary = monthlyTransactions.filter((t) => t.type === 'salary').reduce((sum, t) => sum + Number(t.amount || 0), 0)
  const monthlyExtra = monthlyTransactions.filter((t) => t.type === 'extraIncome').reduce((sum, t) => sum + Number(t.amount || 0), 0)
  const totalFamilyIncome = monthlySalary + monthlyExtra

  const monthlyExpenses = monthlyTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0)

  const familySavings = totalFamilyIncome - monthlyExpenses

  function getMemberBalance(memberId) {
    let balance = 0
    monthlyTransactions.forEach((t) => {
      if (t.type === 'salary' || t.type === 'extraIncome') {
        if (t.memberId === memberId) balance += Number(t.amount || 0)
      } else if (t.type === 'expense') {
        if (t.memberId === memberId) balance -= Number(t.amount || 0)
      } else if (t.type === 'transfer') {
        if (t.fromMemberId === memberId) balance -= Number(t.amount || 0)
        if (t.toMemberId === memberId) balance += Number(t.amount || 0)
      }
    })
    return balance
  }

  if (!familyCreated) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '40px auto' }}>
        <button className="btn-secondary" onClick={onBack}>← Back to Home</button>
        <h2>👨‍👩‍👧‍👦 Create Your Family Tracker</h2>
        <p style={{ color: '#6b7280' }}>Setup your household group to track shared income and expenses.</p>
        <label>Family Name</label>
        <input type="text" placeholder="e.g. The Sharma Family" value={familyName} onChange={(e) => setFamilyName(e.target.value)} />
        <button onClick={createFamily} style={{ marginTop: '16px' }}>Create Family</button>
      </div>
    )
  }

  return (
    <div className="tracker">
      <ToastAlert message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
      <ConfirmModal
        isOpen={Boolean(deleteId)}
        title="Delete Family Transaction"
        message="Are you sure you want to remove this family transaction entry?"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />

      {/* Sync / Status Banner with Space and Logout Button */}
      {userEmail && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', background: '#f3f4f6', padding: '8px 16px', borderRadius: '8px' }}>
          <span style={{ fontSize: '0.9rem', color: '#374151' }}>
            ✓ Saved to cloud {userEmail}
          </span>
          <button className="btn-secondary" onClick={onLogout} style={{ padding: '4px 12px', fontSize: '0.85rem' }}>
            Log out
          </button>
        </div>
      )}

      <div className="top-bar-nav">
        <button onClick={onBack} className="btn-secondary">← Back to Home</button>
        <div className="action-buttons-group">
          <button onClick={loadSampleData} className="btn-secondary">⚡ Load Sample Data</button>
          <button onClick={handleExportCSV} className="btn-secondary">📥 Export CSV</button>
        </div>
      </div>

      {/* Editable Family Name Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
        {isEditingFamilyName ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="text"
              value={tempFamilyName}
              onChange={(e) => setTempFamilyName(e.target.value)}
              style={{ fontSize: '1.2rem', padding: '4px 8px', margin: 0 }}
            />
            <button onClick={saveFamilyName} style={{ padding: '6px 12px' }}>Save</button>
            <button className="btn-secondary" onClick={() => { setIsEditingFamilyName(false); setTempFamilyName(familyName); }} style={{ padding: '6px 12px' }}>Cancel</button>
          </div>
        ) : (
          <>
            <h1 style={{ margin: 0 }}>👨‍👩‍👧‍‍👦 {familyName} Tracker</h1>
            <button
              className="btn-secondary"
              onClick={() => { setTempFamilyName(familyName); setIsEditingFamilyName(true); }}
              style={{ padding: '4px 8px', fontSize: '0.85rem' }}
            >
              ✏️ Edit Name
            </button>
          </>
        )}
      </div>
      <hr />

      {/* Summary Stat Cards */}
      <section className="card">
        <h2>{formatMonth(selectedMonth)} Family Dashboard</h2>
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-card-title">Family Income</div>
            <div className="stat-card-value green">₹{formatMoney(totalFamilyIncome)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-title">Family Expenses</div>
            <div className="stat-card-value red">₹{formatMoney(monthlyExpenses)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-title">Net Savings</div>
            <div className={`stat-card-value ${familySavings >= 0 ? 'green' : 'red'}`}>
              ₹{formatMoney(familySavings)}
            </div>
          </div>
        </div>

        <label><strong>Select Month: </strong></label>
        <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={{ width: 'auto', display: 'inline-block' }}>
          {availableMonths.map((m) => (
            <option key={m} value={m}>{formatMonth(m)}</option>
          ))}
        </select>
      </section>

      {/* Individual Member Balances */}
      <section className="card">
        <h2>💳 Individual Member Balances ({formatMonth(selectedMonth)})</h2>
        <div className="stat-grid" style={{ marginTop: '12px' }}>
          {members.map((m) => {
            const bal = getMemberBalance(m.id)
            return (
              <div key={m.id} className="stat-card" style={{ textAlign: 'left' }}>
                <div className="stat-card-title" style={{ fontWeight: '600', fontSize: '1rem', color: '#111827' }}>
                  {m.name} <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: '400' }}>({m.role})</span>
                </div>
                <div className={`stat-card-value ${bal >= 0 ? 'green' : 'red'}`} style={{ marginTop: '6px' }}>
                  ₹{formatMoney(bal)}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Category Chart Breakdown */}
      <section className="card">
        <CategoryBreakdown transactions={monthlyTransactions} />
      </section>

      {/* Add / Edit Form */}
      <section className="card">
        <h2>{editingId ? '✏️ Edit Family Entry' : '➕ Add Family Transaction'}</h2>

        <label>Transaction Type</label>
        <select value={transactionType} onChange={(e) => handleTypeChange(e.target.value)}>
          <option value="expense">Expense</option>
          <option value="salary">Salary Income</option>
          <option value="extraIncome">Extra Income</option>
          <option value="transfer">Internal Family Transfer</option>
        </select>

        {transactionType === 'transfer' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label>From Member (Sender)</label>
              <select value={transferFrom} onChange={(e) => setTransferFrom(e.target.value)}>
                {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
              </select>
            </div>
            <div>
              <label>To Member (Receiver)</label>
              <select value={transferTo} onChange={(e) => setTransferTo(e.target.value)}>
                {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
              </select>
            </div>
          </div>
        ) : (
          <>
            <label>Family Member</label>
            <select value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)}>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
            </select>
          </>
        )}

        <label>Amount (₹)</label>
        <input type="number" min="1" placeholder="Enter amount" value={amount} onChange={(e) => setAmount(e.target.value)} />

        {transactionType === 'expense' && (
          <>
            <label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="Food">Food</option>
              <option value="Transport">Transport</option>
              <option value="Shopping">Shopping</option>
              <option value="Education">Education</option>
              <option value="Bills">Bills</option>
              <option value="Health">Health</option>
              <option value="Other">Other</option>
            </select>
          </>
        )}

        <label>Note</label>
        <input type="text" placeholder="Description / Notes" value={note} onChange={(e) => setNote(e.target.value)} />

        <label>Date</label>
        <input type="date" max={getToday()} value={date} onChange={(e) => setDate(e.target.value)} />

        <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
          <button onClick={saveTransaction}>{editingId ? 'Save Changes' : 'Add Entry'}</button>
          {editingId && <button className="btn-secondary" onClick={resetForm}>Cancel</button>}
        </div>
      </section>

      {/* Family Log */}
      <section className="card">
        <h2>📖 Family Log</h2>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '16px 0 20px 0' }}>
          {[
            ['all', 'All'],
            ['salary', 'Salary'],
            ['extraIncome', 'Extra Income'],
            ['expense', 'Expenses'],
            ['transfer', 'Transfers'],
          ].map(([value, label]) => (
            <button
              key={value}
              className={filterType === value ? '' : 'btn-secondary'}
              onClick={() => setFilterType(value)}
              style={{ padding: '6px 14px', fontSize: '0.9rem' }}
            >
              {label}
            </button>
          ))}
        </div>

        {monthlyTransactions.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No family entries recorded for this month.</p>
        ) : filteredLog.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No entries found for this category filter.</p>
        ) : (
          filteredLog.map((t) => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #e5e7eb', alignItems: 'center' }}>
              <div>
                {t.type === 'transfer' ? (
                  <>
                    <strong style={{ color: '#4f46e5' }}>🔄 Internal Transfer:</strong> {getMemberName(t.fromMemberId)} ➔ {getMemberName(t.toMemberId)}
                  </>
                ) : (
                  <>
                    <strong>{t.category}</strong> ({getMemberName(t.memberId)})
                  </>
                )}
                <span style={{ color: '#6b7280', fontSize: '0.85rem', marginLeft: '8px' }}>{formatDate(t.date)}</span>
                {t.note && <div style={{ fontSize: '0.85rem', color: '#4b5563' }}>{t.note}</div>}
              </div>
              <div>
                <strong style={{
                  color: t.type === 'expense' ? '#dc2626' : t.type === 'transfer' ? '#4f46e5' : '#16a34a',
                  marginRight: '12px'
                }}>
                  ₹{formatMoney(t.amount)}
                </strong>
                <button className="btn-secondary" onClick={() => editTransaction(t)} style={{ padding: '4px 8px', marginRight: '4px' }}>✏️ Edit</button>
                <button className="btn-danger" onClick={() => setDeleteId(t.id)} style={{ padding: '4px 8px' }}>Delete</button>
              </div>
            </div>
          ))
        )}
      </section>

      {/* Member Management */}
      <section className="card">
        <h2>👥 Manage Family Members</h2>
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <input type="text" placeholder="Member Name" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} />
          <select value={newMemberRole} onChange={(e) => setNewMemberRole(e.target.value)} style={{ width: '150px' }}>
            <option value="Parent">Parent</option>
            <option value="Child">Child</option>
          </select>
          <button onClick={addMember} style={{ whiteSpace: 'nowrap' }}>Add Member</button>
        </div>
      </section>
    </div>
  )
}


/* =========================================================
   AUTH MODAL / LOGIN & SIGNUP
   ========================================================= */

function AuthModal({ onLogin }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    setErrorMsg('')

    if (!email.trim() || !password) {
      setErrorMsg('Please enter email and password.')
      return
    }

    if (isSignUp) {
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.')
        return
      }
      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters.')
        return
      }
    }

    onLogin(email.trim())
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '400px', width: '100%' }}>
        <h2>{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
        <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '16px' }}>
          {isSignUp ? 'Sign up to sync your data to the cloud.' : 'Log in to access your saved cloud data.'}
        </p>

        {errorMsg && (
          <div style={{ color: '#dc2626', background: '#fee2e2', padding: '8px 12px', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '12px' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label>Email Address</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', paddingRight: '40px' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>

          {isSignUp && (
            <>
              <label style={{ marginTop: '12px', display: 'block' }}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  style={{ width: '100%', paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}
                >
                  {showConfirmPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </>
          )}

          <button type="submit" style={{ width: '100%', marginTop: '20px' }}>
            {isSignUp ? 'Sign Up' : 'Log In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.9rem' }}>
          {isSignUp ? (
            <span>Already have an account? <button style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setIsSignUp(false)}>Log In</button></span>
          ) : (
            <span>Don't have an account? <button style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setIsSignUp(true)}>Sign Up</button></span>
          )}
        </div>
      </div>
    </div>
  )
}


/* =========================================================
   MAIN APP (HOME SCREEN & ROUTING)
   ========================================================= */

export default function App() {
  const [activeTab, setActiveTab] = useState('home')
  const [userEmail, setUserEmail] = usePersistentState('spendwise.userEmail', '')
  const [showAuth, setShowAuth] = useState(false)

  function handleLogin(email) {
    setUserEmail(email)
    setShowAuth(false)
  }

  function handleLogout() {
    setUserEmail('')
  }

  if (activeTab === 'individual') {
    return <IndividualTracker onBack={() => setActiveTab('home')} userEmail={userEmail} onLogout={handleLogout} />
  }

  if (activeTab === 'family') {
    return <FamilyTracker onBack={() => setActiveTab('home')} userEmail={userEmail} onLogout={handleLogout} />
  }

  return (
    <div className="home-container">
      {showAuth && <AuthModal onLogin={handleLogin} />}

      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 20px' }}>
        {userEmail ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.9rem', color: '#374151' }}>✓ Saved to cloud {userEmail}</span>
            <button className="btn-secondary" onClick={handleLogout} style={{ padding: '4px 12px', fontSize: '0.85rem' }}>Log out</button>
          </div>
        ) : (
          <button className="btn-secondary" onClick={() => setShowAuth(true)}>Log in / Sign up</button>
        )}
      </div>

      <header className="home-header">
        <h1>Welcome to SpendWise</h1>
        <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>
          Smart, simple financial management for individuals and families.
        </p>
      </header>

      <div className="home-cards">
        <div className="home-card">
          <div>
            <div className="home-card-icon">👤</div>
            <h2>Individual Tracker</h2>
            <p>Track your personal salary, daily expenses, savings, and debts seamlessly.</p>
          </div>
          <button onClick={() => setActiveTab('individual')}>Open Individual Tracker</button>
        </div>

        <div className="home-card">
          <div>
            <div className="home-card-icon">👨‍👩‍‍👧‍👦</div>
            <h2>Family Tracker</h2>
            <p>Manage group family budgets, shared household expenses, and member transfers.</p>
          </div>
          <button onClick={() => setActiveTab('family')}>Open Family Tracker</button>
        </div>
      </div>
    </div>
  )
}