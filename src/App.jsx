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

function getPreviousMonth(monthString) {
  const [year, month] = monthString.split('-')
  const date = new Date(Number(year), Number(month) - 2, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
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

/* Toast Message Component */
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

/* Are You Sure Delete Modal */
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

function IndividualTracker({ onBack }) {
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

  const [showMoneyDue, setShowMoneyDue] = useState(false)
  const [paymentBorrowedId, setPaymentBorrowedId] = useState(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(getToday())

  /* Toast Alerts */
  const [toast, setToast] = useState({ message: '', type: 'success' })
  
  /* Confirm Delete Modal */
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
    if (type === 'repayment') setCategory('Repayment')
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
  const totalRepayments = monthTransactions.filter((t) => t.type === 'repayment').reduce((a, b) => a + Number(b.amount), 0)
  const monthlySavings = totalIncome - totalExpenses - totalRepayments

  const sortedTransactions = [...monthTransactions].sort((a, b) => b.date.localeCompare(a.date))

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

      {/* Money Due Drawer */}
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

      {/* Payment Form Modal Inline */}
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

      {/* Stat Cards Summary */}
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
            <div className="stat-card-title">Repayments</div>
            <div className="stat-card-value red">₹{formatMoney(totalRepayments)}</div>
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

      {/* Category Chart Breakdown */}
      <section className="card">
        <CategoryBreakdown transactions={monthTransactions} />
      </section>

      {/* Add / Edit Form */}
      <section className="card">
        <h2>{editingId !== null ? '✏️ Edit Transaction' : '➕ Add Transaction'}</h2>
        
        <label>Type</label>
        <select value={transactionType} onChange={(e) => handleTypeChange(e.target.value)}>
          <option value="salary">Salary</option>
          <option value="income">Extra Income</option>
          <option value="expense">Expense</option>
          <option value="borrowed">Borrowed Money</option>
          <option value="repayment">Repayment</option>
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

        {(transactionType === 'borrowed' || transactionType === 'repayment') && (
          <>
            <label>Person</label>
            <input type="text" placeholder="Person name" value={person} onChange={(e) => setPerson(e.target.value)} />
          </>
        )}

        {transactionType === 'borrowed' && (
          <>
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

      {/* Transactions List Diary */}
      <section className="card">
        <h2>📖 {formatMonth(selectedMonth)} Transactions Diary</h2>
        {sortedTransactions.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No entries found for this month.</p>
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

function FamilyTracker({ onBack }) {
  const [familyName, setFamilyName] = usePersistentState('spendwise.family.name', '')
  const [familyCreated, setFamilyCreated] = usePersistentState('spendwise.family.created', false)
  const [members, setMembers] = usePersistentState('spendwise.family.members', [
    { id: 'member-1', name: 'Mom', role: 'Parent', startingBalance: 0 },
    { id: 'member-2', name: 'Dad', role: 'Parent', startingBalance: 0 },
    { id: 'member-3', name: 'Kid', role: 'Child', startingBalance: 0 },
  ], Array.isArray)

  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberRole, setNewMemberRole] = useState('Child')
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [transactions, setTransactions] = usePersistentState('spendwise.family.transactions', [], Array.isArray)

  const [transactionType, setTransactionType] = useState('expense')
  const [selectedMember, setSelectedMember] = useState(() => (members.length > 0 ? members[0].id : ''))
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Food')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(getToday())
  const [borrowedFrom, setBorrowedFrom] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [transferFrom, setTransferFrom] = useState('')
  const [transferTo, setTransferTo] = useState('')
  const [editingId, setEditingId] = useState(null)

  const [showMoneyDue, setShowMoneyDue] = useState(false)
  const [paymentBorrowedId, setPaymentBorrowedId] = useState(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(getToday())

  /* Notifications & Modals */
  const [toast, setToast] = useState({ message: '', type: 'success' })
  const [deleteId, setDeleteId] = useState(null)

  const showSuccess = (msg) => setToast({ message: msg, type: 'success' })
  const showError = (msg) => setToast({ message: msg, type: 'error' })

  const availableMonths = getAvailableMonths()

  function getMemberName(id) {
    const member = members.find((m) => m.id === id)
    return member ? member.name : 'Unknown'
  }

  function createFamily() {
    if (!familyName.trim()) {
      showError('Please enter a valid family name.')
      return
    }
    setFamilyCreated(true)
    showSuccess(`${familyName.trim()} Tracker created successfully!`)
  }

  function addMember() {
    if (!newMemberName.trim()) {
      showError('Please enter member name.')
      return
    }
    const newM = { id: `member-${Date.now()}`, name: newMemberName.trim(), role: newMemberRole, startingBalance: 0 }
    setMembers([...members, newM])
    setNewMemberName('')
    showSuccess(`Added ${newM.name} to family members.`)
  }

  function saveTransaction() {
    if (date > getToday()) {
      showError('Future dates are not allowed.')
      return
    }

    const numericAmount = Number(amount)
    if (!numericAmount || numericAmount <= 0) {
      showError('Please enter a valid amount.')
      return
    }

    if (transactionType === 'transfer') {
      if (!transferFrom || !transferTo || transferFrom === transferTo) {
        showError('Select valid distinct members for transfer.')
        return
      }
      const transferObj = {
        id: editingId || `tx-${Date.now()}`,
        type: 'transfer',
        fromMemberId: transferFrom,
        toMemberId: transferTo,
        amount: numericAmount,
        date,
        note: note.trim() || 'Internal transfer',
      }
      setTransactions(editingId ? transactions.map(t => t.id === editingId ? transferObj : t) : [...transactions, transferObj])
      showSuccess('Family transfer saved successfully.')
      resetForm()
      return
    }

    const txObj = {
      id: editingId || `tx-${Date.now()}`,
      type: transactionType,
      memberId: selectedMember,
      amount: numericAmount,
      category: transactionType === 'salary' ? 'Salary' : category,
      note: note.trim(),
      date,
      borrowedFrom: transactionType === 'borrowed' ? borrowedFrom.trim() : '',
      dueDate: transactionType === 'borrowed' ? dueDate : '',
      borrowedId: null
    }

    setTransactions(editingId ? transactions.map(t => t.id === editingId ? txObj : t) : [...transactions, txObj])
    showSuccess(editingId ? 'Transaction updated successfully!' : 'Transaction added successfully!')
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
      setBorrowedFrom(tx.borrowedFrom || '')
      setDueDate(tx.dueDate || '')
    }
    showSuccess('Editing family entry...')
  }

  function resetForm() {
    setTransactionType('expense')
    setAmount('')
    setNote('')
    setBorrowedFrom('')
    setDueDate('')
    setEditingId(null)
  }

  function confirmDelete() {
    if (!deleteId) return
    setTransactions(transactions.filter((t) => t.id !== deleteId))
    setDeleteId(null)
    showSuccess('Family transaction entry removed.')
  }

  function loadSampleData() {
    const curr = selectedMonth
    if (members.length < 2) return
    const samples = [
      { id: `tx-${Date.now()}-1`, type: 'salary', memberId: members[0].id, amount: 80000, category: 'Salary', note: 'Primary Income', date: `${curr}-01` },
      { id: `tx-${Date.now()}-2`, type: 'expense', memberId: members[0].id, amount: 4500, category: 'Food', note: 'Monthly Provisions', date: `${curr}-02` },
      { id: `tx-${Date.now()}-3`, type: 'expense', memberId: members[1].id, amount: 2200, category: 'Bills', note: 'Electricity Bill', date: `${curr}-04` },
    ]
    setTransactions([...transactions, ...samples])
    showSuccess('Sample family data loaded!')
  }

  function handleExportCSV() {
    const headers = ['Date', 'Type', 'Member', 'Category', 'Amount (INR)', 'Note']
    const rows = monthlyTransactions.map(t => [
      t.date,
      t.type,
      getMemberName(t.memberId),
      t.category || '',
      t.amount,
      t.note || ''
    ])
    exportToCSV(`family_expenses_${selectedMonth}.csv`, headers, rows)
    showSuccess('Family CSV export downloaded!')
  }

  const monthlyTransactions = transactions.filter((t) => t.date && t.date.startsWith(selectedMonth))
  const monthlySalary = monthlyTransactions.filter((t) => t.type === 'salary').reduce((sum, t) => sum + Number(t.amount || 0), 0)
  const monthlyExtra = monthlyTransactions.filter((t) => t.type === 'extraIncome').reduce((sum, t) => sum + Number(t.amount || 0), 0)
  const totalFamilyIncome = monthlySalary + monthlyExtra
  const monthlyExpenses = monthlyTransactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount || 0), 0)
  const monthlyRepayments = monthlyTransactions.filter((t) => t.type === 'repayment').reduce((sum, t) => sum + Number(t.amount || 0), 0)
  const familySavings = totalFamilyIncome - monthlyExpenses - monthlyRepayments

  if (!familyCreated) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '40px auto' }}>
        <button className="btn-secondary" onClick={onBack}>← Back to Home</button>
        <h2>👨‍👩‍👧‍‍👦 Create Your Family Tracker</h2>
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

      <div className="top-bar-nav">
        {/* FIXED: Proper back button returning to SpendWise home screen */}
        <button onClick={onBack} className="btn-secondary">← Back to Home</button>
        <div className="action-buttons-group">
          <button onClick={loadSampleData} className="btn-secondary">⚡ Load Sample Data</button>
          <button onClick={handleExportCSV} className="btn-secondary">📥 Export CSV</button>
        </div>
      </div>

      <h1>👨‍👩‍👧‍👦 {familyName} Tracker</h1>
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
            <div className="stat-card-title">Debt Repayments</div>
            <div className="stat-card-value red">₹{formatMoney(monthlyRepayments)}</div>
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

      {/* Category Chart Breakdown for Family */}
      <section className="card">
        <CategoryBreakdown transactions={monthlyTransactions} />
      </section>

      {/* Add / Edit Transaction Form */}
      <section className="card">
        <h2>{editingId ? '✏️ Edit Family Entry' : '➕ Add Family Transaction'}</h2>
        
        <label>Transaction Type</label>
        <select value={transactionType} onChange={(e) => setTransactionType(e.target.value)}>
          <option value="expense">Expense</option>
          <option value="salary">Salary / Income</option>
          <option value="transfer">Internal Transfer</option>
          <option value="borrowed">Borrowed Money</option>
          <option value="repayment">Repayment</option>
        </select>

        {transactionType === 'transfer' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label>From Member</label>
              <select value={transferFrom} onChange={(e) => setTransferFrom(e.target.value)}>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label>To Member</label>
              <select value={transferTo} onChange={(e) => setTransferTo(e.target.value)}>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
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
        <input type="number" placeholder="Enter amount" value={amount} onChange={(e) => setAmount(e.target.value)} />

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

      {/* Family Diary */}
      <section className="card">
        <h2>📖 Family Log</h2>
        {monthlyTransactions.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No family entries recorded for this month.</p>
        ) : (
          monthlyTransactions.map((t) => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #e5e7eb', alignItems: 'center' }}>
              <div>
                <strong>{t.type === 'transfer' ? `Transfer (${getMemberName(t.fromMemberId)} → ${getMemberName(t.toMemberId)})` : `${t.category} (${getMemberName(t.memberId)})`}</strong>
                <span style={{ color: '#6b7280', fontSize: '0.85rem', marginLeft: '8px' }}>{formatDate(t.date)}</span>
                {t.note && <div style={{ fontSize: '0.85rem', color: '#4b5563' }}>{t.note}</div>}
              </div>
              <div>
                <strong style={{ color: t.type === 'expense' || t.type === 'repayment' ? '#dc2626' : '#16a34a', marginRight: '12px' }}>
                  ₹{formatMoney(t.amount)}
                </strong>
                <button className="btn-secondary" onClick={() => editTransaction(t)} style={{ padding: '4px 8px', marginRight: '4px' }}>✏️ Edit</button>
                <button className="btn-danger" onClick={() => setDeleteId(t.id)} style={{ padding: '4px 8px' }}>Delete</button>
              </div>
            </div>
          ))
        )}
      </section>

      {/* Member Management Section */}
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
   MAIN APP (HOME SCREEN & ROUTING)
   ========================================================= */

export default function App() {
  const [activeTab, setActiveTab] = useState('home')

  if (activeTab === 'individual') {
    return <IndividualTracker onBack={() => setActiveTab('home')} />
  }

  if (activeTab === 'family') {
    return <FamilyTracker onBack={() => setActiveTab('home')} />
  }

  return (
    <div className="home-container">
      <header className="home-header">
        <h1>Welcome to SpendWise</h1>
        <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>
          Smart, simple financial management for individuals and families.
        </p>
      </header>

      {/* Improved Two-Card Home Screen */}
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
            <div className="home-card-icon">👨‍👩‍👧‍👦</div>
            <h2>Family Tracker</h2>
            <p>Manage group family budgets, shared household expenses, and member transfers.</p>
          </div>
          <button onClick={() => setActiveTab('family')}>Open Family Tracker</button>
        </div>
      </div>
    </div>
  )
}