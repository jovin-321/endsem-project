import { useState } from 'react'


/* =========================================================
   DATE HELPERS
   ========================================================= */

function getToday() {
  const today = new Date()

  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}


function formatDate(dateString) {
  if (!dateString) {
    return ''
  }

  const [year, month, day] = dateString.split('-')

  return `${day}-${month}-${year}`
}


function getCurrentMonth() {
  return getToday().slice(0, 7)
}


function formatMonth(monthString) {
  const [year, month] = monthString.split('-')

  const date = new Date(
    Number(year),
    Number(month) - 1,
    1
  )

  return date.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })
}


function getPreviousMonth(monthString) {
  const [year, month] = monthString.split('-')

  const date = new Date(
    Number(year),
    Number(month) - 2,
    1
  )

  const previousYear = date.getFullYear()

  const previousMonth = String(
    date.getMonth() + 1
  ).padStart(2, '0')

  return `${previousYear}-${previousMonth}`
}


function getAvailableMonths() {
  const months = []
  const currentMonth = getCurrentMonth()

  const [year, month] = currentMonth.split('-')

  const currentDate = new Date(
    Number(year),
    Number(month) - 1,
    1
  )

  for (let i = 0; i < 12; i++) {
    const date = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - i,
      1
    )

    const monthYear = date.getFullYear()

    const monthNumber = String(
      date.getMonth() + 1
    ).padStart(2, '0')

    months.push(
      `${monthYear}-${monthNumber}`
    )
  }

  return months
}


function formatMoney(amount) {
  return Number(amount).toLocaleString('en-IN')
}


/* =========================================================
   INDIVIDUAL TRACKER
   ========================================================= */

function IndividualTracker({ onBack }) {

  const [selectedMonth, setSelectedMonth] =
    useState(getCurrentMonth())


  /*
    All transactions are kept here for now.

    IMPORTANT:

    borrowedId connects a repayment to the
    original borrowing transaction.
  */

  const [transactions, setTransactions] =
    useState([])


  /*
    Add/edit form.
  */

  const [transactionType, setTransactionType] =
    useState('salary')

  const [amount, setAmount] =
    useState('')

  const [category, setCategory] =
    useState('Salary')

  const [note, setNote] =
    useState('')

  const [date, setDate] =
    useState(getToday())

  const [person, setPerson] =
    useState('')

  const [dueDate, setDueDate] =
    useState('')


  /*
    Editing state.

    null = adding a new transaction

    number = editing an existing transaction
  */

  const [editingId, setEditingId] =
    useState(null)


  /*
    Money Due panel.
  */

  const [showMoneyDue, setShowMoneyDue] =
    useState(false)


  /*
    Payment modal.

    When paying borrowed money, we keep track
    of which borrowed transaction is being paid.
  */

  const [paymentBorrowedId, setPaymentBorrowedId] =
    useState(null)

  const [paymentAmount, setPaymentAmount] =
    useState('')

  const [paymentDate, setPaymentDate] =
    useState(getToday())


  /*
    Error / information message.
  */

  const [message, setMessage] =
    useState('')


  const availableMonths =
    getAvailableMonths()


  /* =========================================================
     CALCULATE HOW MUCH HAS BEEN REPAID
     FOR A BORROWED TRANSACTION
     ========================================================= */

  function getPaidAmount(borrowedId) {

    return transactions
      .filter(
        (transaction) =>
          transaction.type === 'repayment' &&
          transaction.borrowedId === borrowedId
      )
      .reduce(
        (total, transaction) =>
          total + Number(transaction.amount),
        0
      )
  }


  /* =========================================================
     CALCULATE REMAINING AMOUNT
     ========================================================= */

  function getRemainingAmount(borrowedTransaction) {

    const paid = getPaidAmount(
      borrowedTransaction.id
    )

    return Math.max(
      0,
      Number(borrowedTransaction.amount) - paid
    )
  }


  /* =========================================================
     MONEY DUE
     ========================================================= */

  const moneyDue =
    transactions.filter(
      (transaction) =>
        transaction.type === 'borrowed' &&
        getRemainingAmount(transaction) > 0
    )


  /* =========================================================
     START EDITING
     ========================================================= */

  function startEditing(transaction) {

    setEditingId(transaction.id)

    setTransactionType(transaction.type)

    setAmount(transaction.amount)

    setCategory(transaction.category)

    setNote(transaction.note || '')

    setDate(transaction.date)

    setPerson(transaction.person || '')

    setDueDate(transaction.dueDate || '')

    setMessage('Editing transaction.')

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }


  /* =========================================================
     CANCEL EDITING
     ========================================================= */

  function cancelEditing() {

    setEditingId(null)

    setAmount('')

    setNote('')

    setPerson('')

    setDueDate('')

    setDate(getToday())

    setTransactionType('salary')

    setCategory('Salary')

    setMessage('')
  }


  /* =========================================================
     TRANSACTION TYPE CHANGE
     ========================================================= */

  function handleTypeChange(type) {

    setTransactionType(type)

    if (type === 'salary') {
      setCategory('Salary')
    }

    if (type === 'income') {
      setCategory('Gift')
    }

    if (type === 'expense') {
      setCategory('Food')
    }

    if (type === 'borrowed') {
      setCategory('Borrowed Money')
    }

    if (type === 'repayment') {
      setCategory('Repayment')
    }
  }


  /* =========================================================
     ADD OR EDIT TRANSACTION
     ========================================================= */

  function saveTransaction() {

    const numericAmount = Number(amount)

    setMessage('')


    /*
      Basic amount validation.
    */

    if (!numericAmount || numericAmount <= 0) {

      setMessage(
        'Please enter an amount greater than ₹0.'
      )

      return
    }


    /*
      No future transaction dates.
    */

    if (date > getToday()) {

      setMessage(
        'Future transaction dates are not allowed.'
      )

      return
    }


    /*
      Transaction must belong to selected month.
    */

    if (
      date.slice(0, 7) !== selectedMonth
    ) {

      setMessage(
        `This transaction belongs to ${formatMonth(
          date.slice(0, 7)
        )}. Please select that month first.`
      )

      return
    }


    /*
      Borrowed money needs a person.
    */

    if (
      transactionType === 'borrowed' &&
      !person.trim()
    ) {

      setMessage(
        'Please enter the name of the person you borrowed from.'
      )

      return
    }


    /*
      Borrowed money needs a due date.
    */

    if (
      transactionType === 'borrowed' &&
      !dueDate
    ) {

      setMessage(
        'Please enter a repayment due date.'
      )

      return
    }


    /*
      Due date cannot be before the borrowing date.
    */

    if (
      transactionType === 'borrowed' &&
      dueDate < date
    ) {

      setMessage(
        'The repayment due date cannot be before the borrowing date.'
      )

      return
    }


    /*
      If we are editing a borrowed transaction,
      make sure existing repayments don't become
      invalid.

      A repayment can't happen before the new
      borrowing date.
    */

    if (
      editingId !== null &&
      transactionType === 'borrowed'
    ) {

      const existingRepayments =
        transactions.filter(
          (transaction) =>
            transaction.type === 'repayment' &&
            transaction.borrowedId === editingId
        )


      const invalidRepayment =
        existingRepayments.some(
          (repayment) =>
            repayment.date < date
        )


      if (invalidRepayment) {

        setMessage(
          'This borrowing date cannot be changed because one of its repayments would occur before the borrowing date.'
        )

        return
      }
    }


    /* =======================================================
       EDIT EXISTING TRANSACTION
       ======================================================= */

    if (editingId !== null) {

      const updatedTransactions =
        transactions.map(
          (transaction) => {

            if (
              transaction.id !== editingId
            ) {
              return transaction
            }


            return {
              ...transaction,

              amount: numericAmount,

              type: transactionType,

              category: category,

              note: note,

              date: date,

              person: person,

              dueDate: dueDate,
            }
          }
        )


      /*
        If the transaction changes FROM borrowed
        to something else, its existing repayments
        would lose their parent.

        We don't allow that.

        The user should delete the repayments first
        if they really want to change the borrowing
        into another type.
      */

      const hadRepayments =
        transactions.some(
          (transaction) =>
            transaction.type === 'repayment' &&
            transaction.borrowedId === editingId
        )


      const originalTransaction =
        transactions.find(
          (transaction) =>
            transaction.id === editingId
        )


      if (
        originalTransaction?.type === 'borrowed' &&
        transactionType !== 'borrowed' &&
        hadRepayments
      ) {

        setMessage(
          'This transaction already has repayments attached to it. Delete those repayments first before changing its type.'
        )

        return
      }


      setTransactions(
        updatedTransactions
      )

      setMessage(
        'Transaction updated successfully.'
      )

      cancelEditing()

      return
    }


    /* =======================================================
       ADD NEW TRANSACTION
       ======================================================= */

    const newTransaction = {

      id: Date.now(),

      amount: numericAmount,

      type: transactionType,

      category: category,

      note: note,

      date: date,

      person: person,

      dueDate: dueDate,

      borrowedId: null,
    }


    setTransactions([
      ...transactions,
      newTransaction,
    ])


    setAmount('')

    setNote('')

    setPerson('')

    setDueDate('')

    setDate(getToday())


    setMessage(
      'Transaction added successfully.'
    )
  }


  /* =========================================================
     OPEN REPAYMENT FORM
     ========================================================= */

  function openPaymentForm(borrowedTransaction) {

    setPaymentBorrowedId(
      borrowedTransaction.id
    )

    setPaymentAmount('')

    /*
      Payment defaults to today.
    */

    setPaymentDate(getToday())

    setMessage('')
  }


  /* =========================================================
     CLOSE REPAYMENT FORM
     ========================================================= */

  function closePaymentForm() {

    setPaymentBorrowedId(null)

    setPaymentAmount('')

    setPaymentDate(getToday())
  }


  /* =========================================================
     RECORD REPAYMENT
     ========================================================= */

  function recordRepayment() {

    if (paymentBorrowedId === null) {
      return
    }


    const borrowedTransaction =
      transactions.find(
        (transaction) =>
          transaction.id ===
          paymentBorrowedId
      )


    if (!borrowedTransaction) {
      return
    }


    const numericPayment =
      Number(paymentAmount)


    /*
      Validate amount.
    */

    if (
      !numericPayment ||
      numericPayment <= 0
    ) {

      setMessage(
        'Please enter a valid repayment amount.'
      )

      return
    }


    /*
      Repayment cannot be before borrowing.
    */

    if (
      paymentDate <
      borrowedTransaction.date
    ) {

      setMessage(
        `The repayment date cannot be before the borrowing date (${formatDate(
          borrowedTransaction.date
        )}).`
      )

      return
    }


    /*
      Repayment cannot be in the future.
    */

    if (paymentDate > getToday()) {

      setMessage(
        'Future repayment dates are not allowed.'
      )

      return
    }


    /*
      Calculate how much is still owed.
    */

    const remaining =
      getRemainingAmount(
        borrowedTransaction
      )


    /*
      Don't allow overpayment.

      If ₹3,000 is owed, the user can't enter
      ₹3,500 as a repayment.
    */

    if (numericPayment > remaining) {

      setMessage(
        `You only have ₹${formatMoney(
          remaining
        )} remaining to repay.`
      )

      return
    }


    /*
      Create the repayment.

      borrowedId connects this repayment to
      the original borrowing.
    */

    const repayment = {

      id: Date.now(),

      amount: numericPayment,

      type: 'repayment',

      category: 'Repayment',

      note:
        `Repayment to ${borrowedTransaction.person}`,

      date: paymentDate,

      person: borrowedTransaction.person,

      dueDate: '',

      borrowedId:
        borrowedTransaction.id,
    }


    setTransactions([
      ...transactions,
      repayment,
    ])


    closePaymentForm()

    setMessage(
      numericPayment === remaining
        ? `₹${formatMoney(
            numericPayment
          )} fully repaid.`
        : `₹${formatMoney(
            numericPayment
          )} repaid. ₹${formatMoney(
            remaining - numericPayment
          )} is still due.`
    )
  }


  /* =========================================================
     DELETE TRANSACTION
     ========================================================= */

  function deleteTransaction(id) {

    const transaction =
      transactions.find(
        (item) => item.id === id
      )


    /*
      If a borrowed transaction has repayments,
      don't let the user accidentally delete the
      parent and leave orphaned repayments.
    */

    if (
      transaction?.type === 'borrowed'
    ) {

      const hasRepayments =
        transactions.some(
          (item) =>
            item.type === 'repayment' &&
            item.borrowedId === id
        )


      if (hasRepayments) {

        setMessage(
          'This borrowing has repayments attached to it. Delete the repayments first.'
        )

        return
      }
    }


    const updatedTransactions =
      transactions.filter(
        (item) => item.id !== id
      )


    setTransactions(
      updatedTransactions
    )
  }


  /* =========================================================
     MONTHLY DATA
     ========================================================= */

  const monthTransactions =
    transactions.filter(
      (transaction) =>
        transaction.date.slice(0, 7) ===
        selectedMonth
    )


  const salary =
    monthTransactions
      .filter(
        (transaction) =>
          transaction.type === 'salary'
      )
      .reduce(
        (total, transaction) =>
          total + Number(transaction.amount),
        0
      )


  const extraIncome =
    monthTransactions
      .filter(
        (transaction) =>
          transaction.type === 'income'
      )
      .reduce(
        (total, transaction) =>
          total + Number(transaction.amount),
        0
      )


  const totalIncome =
    salary + extraIncome


  const totalExpenses =
    monthTransactions
      .filter(
        (transaction) =>
          transaction.type === 'expense'
      )
      .reduce(
        (total, transaction) =>
          total + Number(transaction.amount),
        0
      )


  const totalRepayments =
    monthTransactions
      .filter(
        (transaction) =>
          transaction.type === 'repayment'
      )
      .reduce(
        (total, transaction) =>
          total + Number(transaction.amount),
        0
      )


  /*
    Savings now accounts for repayments too.

    Example:

    Income       ₹50,000
    Expenses     ₹20,000
    Repayments    ₹2,000

    Actual remaining money:

    ₹28,000
  */

  const monthlySavings =
    totalIncome -
    totalExpenses -
    totalRepayments


  /* =========================================================
     PREVIOUS MONTH
     ========================================================= */

  const previousMonth =
    getPreviousMonth(selectedMonth)


  const previousMonthTransactions =
    transactions.filter(
      (transaction) =>
        transaction.date.slice(0, 7) ===
        previousMonth
    )


  const previousIncome =
    previousMonthTransactions
      .filter(
        (transaction) =>
          transaction.type === 'salary' ||
          transaction.type === 'income'
      )
      .reduce(
        (total, transaction) =>
          total + Number(transaction.amount),
        0
      )


  const previousExpenses =
    previousMonthTransactions
      .filter(
        (transaction) =>
          transaction.type === 'expense' ||
          transaction.type === 'repayment'
      )
      .reduce(
        (total, transaction) =>
          total + Number(transaction.amount),
        0
      )


  const previousSavings =
    previousIncome -
    previousExpenses


  const savingsDifference =
    monthlySavings -
    previousSavings


  /* =========================================================
     INSIGHT
     ========================================================= */

  function getInsight() {

    if (
      previousMonthTransactions.length === 0
    ) {

      return `Keep tracking your ${formatMonth(
        selectedMonth
      )} transactions. SpendWise will compare this month with previous months once data is available.`
    }


    if (savingsDifference > 0) {

      return `🎉 You saved ₹${formatMoney(
        savingsDifference
      )} more than ${formatMonth(
        previousMonth
      )}.`
    }


    if (savingsDifference < 0) {

      return `💡 You saved ₹${formatMoney(
        Math.abs(savingsDifference)
      )} less than ${formatMonth(
        previousMonth
      )}.`
    }


    return `Your savings were the same as ${formatMonth(
      previousMonth
    )}.`
  }


  /* =========================================================
     SORT + GROUP
     ========================================================= */

  const sortedTransactions =
    [...monthTransactions].sort(
      (a, b) =>
        b.date.localeCompare(a.date)
    )


  const transactionsByDate =
    sortedTransactions.reduce(
      (groups, transaction) => {

        if (!groups[transaction.date]) {
          groups[transaction.date] = []
        }

        groups[transaction.date].push(
          transaction
        )

        return groups
      },
      {}
    )


  /* =========================================================
     UI
     ========================================================= */

  return (

    <div
      style={{
        padding: '20px',
        position: 'relative',
      }}
    >

      {/* =====================================================
          MONEY DUE BUTTON
          ===================================================== */}

      <button
        onClick={() =>
          setShowMoneyDue(
            !showMoneyDue
          )
        }

        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
        }}
      >
        💰 Money Due
        {moneyDue.length > 0 &&
          ` (${moneyDue.length})`}
      </button>


      {/* =====================================================
          MONEY DUE PANEL
          ===================================================== */}

      {showMoneyDue && (

        <div
          style={{
            position: 'absolute',
            top: '60px',
            right: '20px',
            width: '320px',
            padding: '15px',
            border: '1px solid #ccc',
            borderRadius: '8px',
            background: 'white',
            zIndex: 10,
          }}
        >

          <h3>
            💰 Money Due
          </h3>


          {moneyDue.length === 0 ? (

            <p>
              🎉 You have no outstanding repayments.
            </p>

          ) : (

            moneyDue.map(
              (borrowed) => {

                const remaining =
                  getRemainingAmount(
                    borrowed
                  )

                const paid =
                  Number(
                    borrowed.amount
                  ) - remaining


                return (

                  <div
                    key={borrowed.id}
                    style={{
                      marginBottom: '15px',
                    }}
                  >

                    <strong>
                      {borrowed.person}
                    </strong>


                    <p>
                      Originally borrowed:
                      {' '}
                      ₹
                      {formatMoney(
                        borrowed.amount
                      )}
                    </p>


                    {paid > 0 && (
                      <p>
                        Already paid:
                        {' '}
                        ₹
                        {formatMoney(paid)}
                      </p>
                    )}


                    <p>
                      <strong>
                        Still due:
                        {' '}
                        ₹
                        {formatMoney(
                          remaining
                        )}
                      </strong>
                    </p>


                    <p>
                      Due date:
                      {' '}
                      {formatDate(
                        borrowed.dueDate
                      )}
                    </p>


                    <button
                      onClick={() =>
                        openPaymentForm(
                          borrowed
                        )
                      }
                    >
                      Record Payment
                    </button>


                    <hr />

                  </div>

                )
              }
            )

          )}

        </div>

      )}


      <h1>
        Individual Expense Tracker
      </h1>


      <button onClick={onBack}>
        ← Back
      </button>


      <hr />


      {/* =====================================================
          PAYMENT FORM
          ===================================================== */}

      {paymentBorrowedId !== null && (

        <div
          style={{
            border: '2px solid #ccc',
            padding: '15px',
            marginBottom: '20px',
          }}
        >

          <h2>
            Record Repayment
          </h2>


          {(() => {

            const borrowed =
              transactions.find(
                (transaction) =>
                  transaction.id ===
                  paymentBorrowedId
              )


            if (!borrowed) {
              return null
            }


            const remaining =
              getRemainingAmount(
                borrowed
              )


            return (

              <>

                <p>
                  Repaying:
                  {' '}
                  <strong>
                    {borrowed.person}
                  </strong>
                </p>


                <p>
                  Remaining:
                  {' '}
                  ₹
                  {formatMoney(
                    remaining
                  )}
                </p>


                <p>
                  Payment amount
                </p>


                <input
                  type="number"
                  min="1"
                  max={remaining}
                  placeholder="Amount paid"
                  value={paymentAmount}
                  onChange={(e) =>
                    setPaymentAmount(
                      e.target.value
                    )
                  }
                />


                <p>
                  Date paid
                </p>


                <input
                  type="date"
                  min={borrowed.date}
                  max={getToday()}
                  value={paymentDate}
                  onChange={(e) =>
                    setPaymentDate(
                      e.target.value
                    )
                  }
                />


                <br />
                <br />


                <button
                  onClick={
                    recordRepayment
                  }
                >
                  Confirm Payment
                </button>


                {' '}


                <button
                  onClick={
                    closePaymentForm
                  }
                >
                  Cancel
                </button>

              </>

            )
          })()}

        </div>

      )}


      {/* =====================================================
          MESSAGE
          ===================================================== */}

      {message && (

        <p>
          <strong>
            {message}
          </strong>
        </p>

      )}


      {/* =====================================================
          MONTH
          ===================================================== */}

      <h2>
        Month
      </h2>


      <select
        value={selectedMonth}
        onChange={(e) =>
          setSelectedMonth(
            e.target.value
          )
        }
      >

        {availableMonths.map(
          (month) => (

            <option
              key={month}
              value={month}
            >
              {formatMonth(month)}
            </option>

          )
        )}

      </select>


      <hr />


      {/* =====================================================
          SUMMARY
          ===================================================== */}

      <h2>
        {formatMonth(
          selectedMonth
        )} Summary
      </h2>


      <p>
        💼 Salary:
        {' '}
        ₹
        {formatMoney(salary)}
      </p>


      <p
        style={{
          color: 'green',
        }}
      >
        + Extra Income:
        {' '}
        ₹
        {formatMoney(extraIncome)}
      </p>


      <p>
        <strong>
          Total Income:
          {' '}
          ₹
          {formatMoney(totalIncome)}
        </strong>
      </p>


      <p
        style={{
          color: 'red',
        }}
      >
        − Expenses:
        {' '}
        ₹
        {formatMoney(totalExpenses)}
      </p>


      <p
        style={{
          color: 'red',
        }}
      >
        − Repayments:
        {' '}
        ₹
        {formatMoney(totalRepayments)}
      </p>


      <hr />


      <h2>

        {monthlySavings >= 0

          ? `💰 Saved: ₹${formatMoney(
              monthlySavings
            )}`

          : `⚠️ Negative Balance: ₹${formatMoney(
              Math.abs(
                monthlySavings
              )
            )}`}

      </h2>


      <hr />


      {/* =====================================================
          INSIGHT
          ===================================================== */}

      <h2>
        ✨ SpendWise Insight
      </h2>


      <p>
        {getInsight()}
      </p>


      <hr />


      {/* =====================================================
          ADD / EDIT TRANSACTION
          ===================================================== */}

      <h2>
        {editingId !== null
          ? '✏️ Edit Transaction'
          : 'Add Transaction'}
      </h2>


      <p>
        Transaction Type
      </p>


      <select
        value={transactionType}
        onChange={(e) =>
          handleTypeChange(
            e.target.value
          )
        }
      >

        <option value="salary">
          Salary
        </option>

        <option value="income">
          Extra Income
        </option>

        <option value="expense">
          Expense
        </option>

        <option value="borrowed">
          Borrowed Money
        </option>

        <option value="repayment">
          Repayment
        </option>

      </select>


      <p>
        Amount
      </p>


      <input
        type="number"
        min="1"
        placeholder="Enter amount"
        value={amount}
        onChange={(e) =>
          setAmount(
            e.target.value
          )
        }
      />


      {/* =====================================================
          CATEGORY
          ===================================================== */}

      <p>
        Category
      </p>


      {transactionType === 'salary' && (

        <select
          value={category}
          onChange={(e) =>
            setCategory(
              e.target.value
            )
          }
        >

          <option value="Salary">
            Salary
          </option>

        </select>

      )}


      {transactionType === 'income' && (

        <select
          value={category}
          onChange={(e) =>
            setCategory(
              e.target.value
            )
          }
        >

          <option value="Gift">
            Gift
          </option>

          <option value="Bonus">
            Bonus
          </option>

          <option value="Bank Interest">
            Bank Interest
          </option>

          <option value="Other Income">
            Other Income
          </option>

        </select>

      )}


      {transactionType === 'expense' && (

        <select
          value={category}
          onChange={(e) =>
            setCategory(
              e.target.value
            )
          }
        >

          <option value="Food">
            Food
          </option>

          <option value="Transport">
            Transport
          </option>

          <option value="Shopping">
            Shopping
          </option>

          <option value="Entertainment">
            Entertainment
          </option>

          <option value="Education">
            Education
          </option>

          <option value="Bills">
            Bills
          </option>

          <option value="Health">
            Health
          </option>

          <option value="Other">
            Other
          </option>

        </select>

      )}


      {transactionType === 'borrowed' && (

        <p>
          Borrowed Money
        </p>

      )}


      {transactionType === 'repayment' && (

        <p>
          Repayment
        </p>

      )}


      {/* =====================================================
          PERSON
          ===================================================== */}

      {(transactionType === 'borrowed' ||
        transactionType === 'repayment') && (

        <>

          <p>
            Person
          </p>


          <input
            type="text"
            placeholder="Person's name"
            value={person}
            onChange={(e) =>
              setPerson(
                e.target.value
              )
            }
          />

        </>

      )}


      {/* =====================================================
          DUE DATE
          ===================================================== */}

      {transactionType === 'borrowed' && (

        <>

          <p>
            Repayment Due Date
          </p>


          <input
            type="date"
            min={date}
            value={dueDate}
            onChange={(e) =>
              setDueDate(
                e.target.value
              )
            }
          />

        </>

      )}


      {/* =====================================================
          NOTE
          ===================================================== */}

      <p>
        Note
      </p>


      <input
        type="text"
        placeholder="Add a note"
        value={note}
        onChange={(e) =>
          setNote(
            e.target.value
          )
        }
      />


      {/* =====================================================
          DATE
          ===================================================== */}

      <p>
        Transaction Date
      </p>


      <input
        type="date"
        max={getToday()}
        value={date}
        onChange={(e) =>
          setDate(
            e.target.value
          )
        }
      />


      <br />
      <br />


      <button
        onClick={
          saveTransaction
        }
      >
        {editingId !== null
          ? 'Save Changes'
          : 'Add Transaction'}
      </button>


      {editingId !== null && (

        <button
          onClick={
            cancelEditing
          }
        >
          Cancel Edit
        </button>

      )}


      <hr />


      {/* =====================================================
          DIARY
          ===================================================== */}

      <h2>
        📖 {formatMonth(
          selectedMonth
        )} Diary
      </h2>


      {monthTransactions.length === 0 ? (

        <p>
          No transactions recorded for this month yet.
        </p>

      ) : (

        Object.entries(
          transactionsByDate
        ).map(
          ([transactionDate, dateTransactions]) => (

            <div
              key={transactionDate}
            >

              <h3>
                {formatDate(
                  transactionDate
                )}
              </h3>


              {dateTransactions.map(
                (transaction) => {

                  const isCredit =
                    transaction.type === 'salary' ||
                    transaction.type === 'income'


                  const isDebit =
                    transaction.type === 'expense' ||
                    transaction.type === 'repayment'


                  const isBorrowed =
                    transaction.type === 'borrowed'


                  return (

                    <div
                      key={transaction.id}
                    >

                      <p>

                        <strong>

                          {isCredit && (

                            <span
                              style={{
                                color: 'green',
                              }}
                            >
                              +
                            </span>

                          )}


                          {isDebit && (

                            <span
                              style={{
                                color: 'red',
                              }}
                            >
                              −
                            </span>

                          )}


                          {isBorrowed && (

                            <span
                              style={{
                                color: 'blue',
                              }}
                            >
                              +
                            </span>

                          )}


                          {' ₹'}

                          {formatMoney(
                            transaction.amount
                          )}

                        </strong>


                        {' — '}


                        {transaction.category}

                      </p>


                      {transaction.person && (

                        <p>
                          Person:
                          {' '}
                          {transaction.person}
                        </p>

                      )}


                      {transaction.note && (

                        <p>
                          {transaction.note}
                        </p>

                      )}


                      {transaction.dueDate && (

                        <p>
                          Due:
                          {' '}
                          {formatDate(
                            transaction.dueDate
                          )}
                        </p>

                      )}


                      {/* REMAINING BALANCE
                          FOR BORROWING */}

                      {transaction.type === 'borrowed' && (

                        <p>

                          Still due:
                          {' '}

                          <strong>
                            ₹
                            {formatMoney(
                              getRemainingAmount(
                                transaction
                              )
                            )}
                          </strong>

                        </p>

                      )}


                      {/* EDIT */}

                      <button
                        onClick={() =>
                          startEditing(
                            transaction
                          )
                        }
                      >
                        ✏️ Edit
                      </button>


                      {' '}


                      {/* DELETE */}

                      <button
                        onClick={() =>
                          deleteTransaction(
                            transaction.id
                          )
                        }
                      >
                        Delete
                      </button>


                      <hr />

                    </div>

                  )
                }
              )}

            </div>

          )
        )

      )}

            {/* =====================================================
          MONTH NAVIGATION
          ===================================================== */}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '30px',
          padding: '15px 0',
          borderTop: '1px solid #ddd',
        }}
      >

        <button
          onClick={() => {

            const currentIndex =
              availableMonths.indexOf(
                selectedMonth
              )

            if (
              currentIndex <
              availableMonths.length - 1
            ) {

              setSelectedMonth(
                availableMonths[
                  currentIndex + 1
                ]
              )

            }

          }}

          disabled={
            availableMonths.indexOf(
              selectedMonth
            ) ===
            availableMonths.length - 1
          }
        >
          ← Previous Month
        </button>


        <strong>
          {formatMonth(selectedMonth)}
        </strong>


        <button
          onClick={() => {

            const currentIndex =
              availableMonths.indexOf(
                selectedMonth
              )

            if (currentIndex > 0) {

              setSelectedMonth(
                availableMonths[
                  currentIndex - 1
                ]
              )

            }

          }}

          disabled={
            availableMonths.indexOf(
              selectedMonth
            ) === 0
          }
        >
          Next Month →
        </button>

      </div>

    </div>

  )
}


/* =========================================================
   FAMILY TRACKER
   ========================================================= */

function FamilyTracker() {
  // =========================================================
  // FAMILY TRACKER
  // Front-end prototype only.
  // Data will later move to Supabase.
  // =========================================================

  const getTodayLocal = () => {
    const now = new Date()

    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  }

  const getCurrentMonthLocal = () => {
    return getTodayLocal().slice(0, 7)
  }

  const formatFamilyDate = (date) => {
    if (!date) return ''

    const parts = date.split('-')

    if (parts.length !== 3) return date

    return `${parts[2]}-${parts[1]}-${parts[0]}`
  }

  const formatFamilyMonth = (month) => {
    if (!month) return ''

    const [year, monthNumber] = month.split('-')

    const date = new Date(
      Number(year),
      Number(monthNumber) - 1,
      1
    )

    return date.toLocaleString('en-IN', {
      month: 'long',
      year: 'numeric',
    })
  }

  const getFamilyPreviousMonth = (month) => {
    const [year, monthNumber] = month.split('-')

    const date = new Date(
      Number(year),
      Number(monthNumber) - 2,
      1
    )

    const yearValue = date.getFullYear()
    const monthValue = String(
      date.getMonth() + 1
    ).padStart(2, '0')

    return `${yearValue}-${monthValue}`
  }

  const getFamilyNextMonth = (month) => {
    const [year, monthNumber] = month.split('-')

    const date = new Date(
      Number(year),
      Number(monthNumber),
      1
    )

    const yearValue = date.getFullYear()
    const monthValue = String(
      date.getMonth() + 1
    ).padStart(2, '0')

    return `${yearValue}-${monthValue}`
  }

  const formatFamilyMoney = (amount) => {
    return `₹${Number(amount || 0).toLocaleString('en-IN')}`
  }

  // =========================================================
  // FAMILY SETUP
  // =========================================================

  const [familyName, setFamilyName] = useState('')

  const [familyCreated, setFamilyCreated] = useState(false)

  const [members, setMembers] = useState([
    {
      id: 'member-1',
      name: 'Mom',
      role: 'Parent',
      startingBalance: 0,
    },
    {
      id: 'member-2',
      name: 'Dad',
      role: 'Parent',
      startingBalance: 0,
    },
    {
      id: 'member-3',
      name: 'Kid',
      role: 'Child',
      startingBalance: 0,
    },
  ])

  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberRole, setNewMemberRole] = useState('Child')

  // =========================================================
  // MONTH
  // =========================================================

  const [selectedMonth, setSelectedMonth] =
    useState(getCurrentMonthLocal())

  // =========================================================
  // TRANSACTIONS
  //
  // type:
  // salary
  // extraIncome
  // expense
  // transfer
  // borrowed
  // repayment
  // =========================================================

  const [transactions, setTransactions] = useState([])

  // =========================================================
  // ADD TRANSACTION FORM
  // =========================================================

  const [transactionType, setTransactionType] =
    useState('expense')

  const [selectedMember, setSelectedMember] =
    useState('')

  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Food')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(getTodayLocal())

  const [borrowedFrom, setBorrowedFrom] =
    useState('')

  const [dueDate, setDueDate] =
    useState('')

  // Transfer fields

  const [transferFrom, setTransferFrom] =
    useState('')

  const [transferTo, setTransferTo] =
    useState('')

  // Editing

  const [editingId, setEditingId] =
    useState(null)

  // =========================================================
  // MONEY DUE / REPAYMENT
  // =========================================================

  const [showMoneyDue, setShowMoneyDue] =
    useState(false)

  const [paymentBorrowedId, setPaymentBorrowedId] =
    useState(null)

  const [paymentAmount, setPaymentAmount] =
    useState('')

  const [paymentDate, setPaymentDate] =
    useState(getTodayLocal())

  const [message, setMessage] =
    useState('')

  // =========================================================
  // CATEGORIES
  // =========================================================

  const categories = [
    'Food',
    'Transport',
    'Shopping',
    'Education',
    'Bills',
    'Health',
    'Entertainment',
    'Travel',
    'Household',
    'Personal',
    'Other',
  ]

  // =========================================================
  // AVAILABLE MONTHS
  // =========================================================

  const availableMonths = (() => {
    const months = new Set()

    months.add(getCurrentMonthLocal())

    transactions.forEach((transaction) => {
      if (transaction.date) {
        months.add(transaction.date.slice(0, 7))
      }
    })

    return Array.from(months).sort(
      (a, b) => b.localeCompare(a)
    )
  })()

  // =========================================================
  // MEMBER LOOKUP
  // =========================================================

  const getMemberName = (memberId) => {
    const member = members.find(
      (item) => item.id === memberId
    )

    return member ? member.name : 'Unknown'
  }

  // =========================================================
  // RESET FORM
  // =========================================================

  const resetTransactionForm = () => {
    setTransactionType('expense')
    setSelectedMember(
      members.length > 0 ? members[0].id : ''
    )
    setAmount('')
    setCategory('Food')
    setNote('')
    setDate(getTodayLocal())

    setBorrowedFrom('')
    setDueDate('')

    setTransferFrom('')
    setTransferTo('')

    setEditingId(null)
  }

  // =========================================================
  // CREATE FAMILY
  // =========================================================

  const createFamily = () => {
    if (!familyName.trim()) {
      setMessage('Please enter a family name.')
      return
    }

    setFamilyCreated(true)

    if (members.length > 0) {
      setSelectedMember(members[0].id)
    }

    setMessage(
      `${familyName.trim()} has been created.`
    )
  }

  // =========================================================
  // ADD MEMBER
  // =========================================================

  const addMember = () => {
    const cleanName = newMemberName.trim()

    if (!cleanName) {
      setMessage('Please enter the member name.')
      return
    }

    const newMember = {
      id: `member-${Date.now()}`,
      name: cleanName,
      role: newMemberRole,
      startingBalance: 0,
    }

    setMembers((previous) => [
      ...previous,
      newMember,
    ])

    setNewMemberName('')

    setMessage(
      `${cleanName} was added to the family.`
    )
  }

  // =========================================================
  // REMOVE MEMBER
  // =========================================================

  const removeMember = (memberId) => {
    const member = members.find(
      (item) => item.id === memberId
    )

    if (!member) return

    const hasTransactions =
      transactions.some(
        (transaction) =>
          transaction.memberId === memberId ||
          transaction.fromMemberId === memberId ||
          transaction.toMemberId === memberId
      )

    if (hasTransactions) {
      setMessage(
        'This member has transactions and cannot be removed yet.'
      )

      return
    }

    if (members.length <= 1) {
      setMessage(
        'A family must have at least one member.'
      )

      return
    }

    setMembers((previous) =>
      previous.filter(
        (item) => item.id !== memberId
      )
    )

    setMessage(
      `${member.name} was removed.`
    )
  }

  // =========================================================
  // SAVE TRANSACTION
  // =========================================================

  const saveTransaction = () => {
    const today = getTodayLocal()

    // -------------------------------------------------------
    // FUTURE DATE CHECK
    // -------------------------------------------------------

    if (date > today) {
      setMessage(
        'Future dates are not allowed.'
      )

      return
    }

    // -------------------------------------------------------
    // TRANSFER
    // -------------------------------------------------------

    if (transactionType === 'transfer') {
      const transferAmount = Number(amount)

      if (
        !transferFrom ||
        !transferTo
      ) {
        setMessage(
          'Please select both members.'
        )

        return
      }

      if (transferFrom === transferTo) {
        setMessage(
          'Money cannot be transferred to the same member.'
        )

        return
      }

      if (
        !transferAmount ||
        transferAmount <= 0
      ) {
        setMessage(
          'Please enter a valid transfer amount.'
        )

        return
      }

      const transfer = {
        id:
          editingId ||
          `transaction-${Date.now()}`,

        type: 'transfer',

        fromMemberId: transferFrom,
        toMemberId: transferTo,

        amount: transferAmount,

        date,
        note:
          note.trim() ||
          'Internal family transfer',
      }

      if (editingId) {
        setTransactions((previous) =>
          previous.map((item) =>
            item.id === editingId
              ? transfer
              : item
          )
        )

        setMessage(
          'Transfer updated successfully.'
        )
      } else {
        setTransactions((previous) => [
          ...previous,
          transfer,
        ])

        setMessage(
          'Money transferred successfully.'
        )
      }

      resetTransactionForm()

      return
    }

    // -------------------------------------------------------
    // NORMAL TRANSACTION
    // -------------------------------------------------------

    const numericAmount = Number(amount)

    if (!selectedMember) {
      setMessage(
        'Please select a family member.'
      )

      return
    }

    if (
      !numericAmount ||
      numericAmount <= 0
    ) {
      setMessage(
        'Please enter a valid amount.'
      )

      return
    }

    // -------------------------------------------------------
    // BORROWED MONEY
    // -------------------------------------------------------

    if (
      transactionType === 'borrowed' &&
      !borrowedFrom.trim()
    ) {
      setMessage(
        'Please enter who the money was borrowed from.'
      )

      return
    }

    if (
      transactionType === 'borrowed' &&
      dueDate &&
      dueDate < date
    ) {
      setMessage(
        'The due date cannot be before the borrowing date.'
      )

      return
    }

    // -------------------------------------------------------
    // SALARY
    // -------------------------------------------------------

    if (
      transactionType === 'salary' &&
      !category
    ) {
      setMessage(
        'Please select a category.'
      )

      return
    }

    // -------------------------------------------------------
    // BUILD TRANSACTION
    // -------------------------------------------------------

    const transaction = {
      id:
        editingId ||
        `transaction-${Date.now()}`,

      type: transactionType,

      memberId: selectedMember,

      amount: numericAmount,

      category:
        transactionType === 'salary'
          ? 'Salary'
          : category,

      note: note.trim(),

      date,

      borrowedFrom:
        transactionType === 'borrowed'
          ? borrowedFrom.trim()
          : '',

      dueDate:
        transactionType === 'borrowed'
          ? dueDate
          : '',

      borrowedId: null,
    }

    if (editingId) {
      setTransactions((previous) =>
        previous.map((item) =>
          item.id === editingId
            ? transaction
            : item
        )
      )

      setMessage(
        'Transaction updated successfully.'
      )
    } else {
      setTransactions((previous) => [
        ...previous,
        transaction,
      ])

      setMessage(
        'Transaction added successfully.'
      )
    }

    resetTransactionForm()
  }

  // =========================================================
  // EDIT TRANSACTION
  // =========================================================

  const editTransaction = (transaction) => {
    setEditingId(transaction.id)

    setTransactionType(transaction.type)

    if (transaction.type === 'transfer') {
      setTransferFrom(
        transaction.fromMemberId
      )

      setTransferTo(
        transaction.toMemberId
      )

      setAmount(
        String(transaction.amount)
      )

      setDate(transaction.date)
      setNote(transaction.note || '')

      return
    }

    setSelectedMember(
      transaction.memberId
    )

    setAmount(
      String(transaction.amount)
    )

    setCategory(
      transaction.category || 'Other'
    )

    setNote(
      transaction.note || ''
    )

    setDate(
      transaction.date
    )

    setBorrowedFrom(
      transaction.borrowedFrom || ''
    )

    setDueDate(
      transaction.dueDate || ''
    )

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  // =========================================================
  // DELETE TRANSACTION
  // =========================================================

  const deleteTransaction = (transactionId) => {
    const transaction =
      transactions.find(
        (item) =>
          item.id === transactionId
      )

    if (!transaction) return

    const hasRepayment =
      transactions.some(
        (item) =>
          item.type === 'repayment' &&
          item.borrowedId === transactionId
      )

    if (
      transaction.type === 'borrowed' &&
      hasRepayment
    ) {
      setMessage(
        'This borrowing has repayments attached to it. Delete the repayments first.'
      )

      return
    }

    setTransactions((previous) =>
      previous.filter(
        (item) =>
          item.id !== transactionId
      )
    )

    setMessage(
      'Transaction deleted.'
    )
  }

  // =========================================================
  // BORROWED MONEY CALCULATIONS
  // =========================================================

  const getPaidAmount = (borrowedId) => {
    return transactions
      .filter(
        (transaction) =>
          transaction.type === 'repayment' &&
          transaction.borrowedId === borrowedId
      )
      .reduce(
        (total, transaction) =>
          total + Number(transaction.amount || 0),
        0
      )
  }

  const getRemainingBorrowedAmount = (
    transaction
  ) => {
    const paid = getPaidAmount(
      transaction.id
    )

    return Math.max(
      0,
      Number(transaction.amount || 0) -
        paid
    )
  }

  const moneyDue = transactions.filter(
    (transaction) =>
      transaction.type === 'borrowed' &&
      getRemainingBorrowedAmount(
        transaction
      ) > 0
  )

  // =========================================================
  // RECORD REPAYMENT
  // =========================================================

  const recordRepayment = () => {
    if (!paymentBorrowedId) {
      setMessage(
        'Please select a borrowing.'
      )

      return
    }

    const borrowedTransaction =
      transactions.find(
        (transaction) =>
          transaction.id ===
          paymentBorrowedId
      )

    if (!borrowedTransaction) {
      setMessage(
        'Borrowing record not found.'
      )

      return
    }

    const numericPayment =
      Number(paymentAmount)

    if (
      !numericPayment ||
      numericPayment <= 0
    ) {
      setMessage(
        'Please enter a valid repayment amount.'
      )

      return
    }

    const remaining =
      getRemainingBorrowedAmount(
        borrowedTransaction
      )

    if (numericPayment > remaining) {
      setMessage(
        `You only owe ${formatFamilyMoney(
          remaining
        )}.`
      )

      return
    }

    if (
      paymentDate > getTodayLocal()
    ) {
      setMessage(
        'Future repayment dates are not allowed.'
      )

      return
    }

    if (
      paymentDate <
      borrowedTransaction.date
    ) {
      setMessage(
        'Repayment cannot happen before the borrowing date.'
      )

      return
    }

    const repayment = {
      id: `repayment-${Date.now()}`,

      type: 'repayment',

      memberId:
        borrowedTransaction.memberId,

      borrowedId:
        borrowedTransaction.id,

      amount: numericPayment,

      date: paymentDate,

      note:
        `Repayment to ${
          borrowedTransaction.borrowedFrom
        }`,
    }

    setTransactions((previous) => [
      ...previous,
      repayment,
    ])

    setPaymentAmount('')
    setPaymentBorrowedId(null)
    setPaymentDate(getTodayLocal())

    setMessage(
      'Repayment recorded successfully.'
    )
  }

  // =========================================================
  // CURRENT MONTH TRANSACTIONS
  // =========================================================

  const monthlyTransactions =
    transactions.filter(
      (transaction) =>
        transaction.date &&
        transaction.date.startsWith(
          selectedMonth
        )
    )

  // =========================================================
  // FAMILY INCOME
  //
  // IMPORTANT:
  // Transfers are NOT included.
  // Borrowed money is NOT treated as income.
  // =========================================================

  const monthlySalary =
    monthlyTransactions
      .filter(
        (transaction) =>
          transaction.type === 'salary'
      )
      .reduce(
        (total, transaction) =>
          total + Number(transaction.amount || 0),
        0
      )

  const monthlyExtraIncome =
    monthlyTransactions
      .filter(
        (transaction) =>
          transaction.type ===
          'extraIncome'
      )
      .reduce(
        (total, transaction) =>
          total + Number(transaction.amount || 0),
        0
      )

  const totalFamilyIncome =
    monthlySalary +
    monthlyExtraIncome

  // =========================================================
  // FAMILY EXPENSE
  //
  // Transfers and repayments are NOT family expenses.
  //
  // A repayment IS money leaving the member, but the
  // original borrowed money was not counted as income.
  // For family accounting, repayment is therefore treated
  // as an outflow.
  // =========================================================

  const monthlyExpenses =
    monthlyTransactions
      .filter(
        (transaction) =>
          transaction.type ===
          'expense'
      )
      .reduce(
        (total, transaction) =>
          total + Number(transaction.amount || 0),
        0
      )

  const monthlyRepayments =
    monthlyTransactions
      .filter(
        (transaction) =>
          transaction.type ===
          'repayment'
      )
      .reduce(
        (total, transaction) =>
          total + Number(transaction.amount || 0),
        0
      )

  const totalFamilyOutflow =
    monthlyExpenses +
    monthlyRepayments

  const monthlyFamilyBalance =
    totalFamilyIncome -
    totalFamilyOutflow

  // =========================================================
  // MEMBER BALANCES
  //
  // Starting balance
  // + income
  // + borrowed money
  // + transfers received
  // - expenses
  // - repayments
  // - transfers sent
  // =========================================================

  const getMemberBalance = (
    memberId
  ) => {
    const member = members.find(
      (item) => item.id === memberId
    )

    let balance = Number(
      member?.startingBalance || 0
    )

    transactions.forEach(
      (transaction) => {
        if (
          transaction.memberId ===
          memberId
        ) {
          if (
            transaction.type ===
              'salary' ||
            transaction.type ===
              'extraIncome' ||
            transaction.type ===
              'borrowed'
          ) {
            balance += Number(
              transaction.amount || 0
            )
          }

          if (
            transaction.type ===
              'expense' ||
            transaction.type ===
              'repayment'
          ) {
            balance -= Number(
              transaction.amount || 0
            )
          }
        }

        if (
          transaction.type ===
            'transfer' &&
          transaction.fromMemberId ===
            memberId
        ) {
          balance -= Number(
            transaction.amount || 0
          )
        }

        if (
          transaction.type ===
            'transfer' &&
          transaction.toMemberId ===
            memberId
        ) {
          balance += Number(
            transaction.amount || 0
          )
        }
      }
    )

    return balance
  }

  // =========================================================
  // MONTHLY MEMBER BALANCES
  //
  // Used for dashboard cards.
  // =========================================================

  const getMonthlyMemberBalance =
    (memberId) => {
      const member = members.find(
        (item) => item.id === memberId
      )

      let balance = Number(
        member?.startingBalance || 0
      )

      transactions
        .filter(
          (transaction) =>
            transaction.date &&
            transaction.date <=
              `${selectedMonth}-31`
        )
        .forEach(
          (transaction) => {
            if (
              transaction.memberId ===
              memberId
            ) {
              if (
                transaction.type ===
                  'salary' ||
                transaction.type ===
                  'extraIncome' ||
                transaction.type ===
                  'borrowed'
              ) {
                balance += Number(
                  transaction.amount || 0
                )
              }

              if (
                transaction.type ===
                  'expense' ||
                transaction.type ===
                  'repayment'
              ) {
                balance -= Number(
                  transaction.amount || 0
                )
              }
            }

            if (
              transaction.type ===
                'transfer' &&
              transaction.fromMemberId ===
                memberId
            ) {
              balance -= Number(
                transaction.amount || 0
              )
            }

            if (
              transaction.type ===
                'transfer' &&
              transaction.toMemberId ===
                memberId
            ) {
              balance += Number(
                transaction.amount || 0
              )
            }
          }
        )

      return balance
    }

  // =========================================================
  // PREVIOUS MONTH INSIGHT
  // =========================================================

  const previousMonth =
    getFamilyPreviousMonth(
      selectedMonth
    )

  const previousMonthSalary =
    transactions
      .filter(
        (transaction) =>
          transaction.date &&
          transaction.date.startsWith(
            previousMonth
          ) &&
          transaction.type ===
            'salary'
      )
      .reduce(
        (total, transaction) =>
          total + Number(transaction.amount || 0),
        0
      )

  const previousMonthExtraIncome =
    transactions
      .filter(
        (transaction) =>
          transaction.date &&
          transaction.date.startsWith(
            previousMonth
          ) &&
          transaction.type ===
            'extraIncome'
      )
      .reduce(
        (total, transaction) =>
          total + Number(transaction.amount || 0),
        0
      )

  const previousMonthExpenses =
    transactions
      .filter(
        (transaction) =>
          transaction.date &&
          transaction.date.startsWith(
            previousMonth
          ) &&
          transaction.type ===
            'expense'
      )
      .reduce(
        (total, transaction) =>
          total + Number(transaction.amount || 0),
        0
      )

  const previousMonthRepayments =
    transactions
      .filter(
        (transaction) =>
          transaction.date &&
          transaction.date.startsWith(
            previousMonth
          ) &&
          transaction.type ===
            'repayment'
      )
      .reduce(
        (total, transaction) =>
          total + Number(transaction.amount || 0),
        0
      )

  const previousMonthIncome =
    previousMonthSalary +
    previousMonthExtraIncome

  const previousMonthOutflow =
    previousMonthExpenses +
    previousMonthRepayments

  const previousMonthSavings =
    previousMonthIncome -
    previousMonthOutflow

  let familyInsight = ''

  if (
    previousMonthIncome > 0 &&
    totalFamilyIncome > 0
  ) {
    const currentSavings =
      monthlyFamilyBalance

    const oldSavings =
      previousMonthSavings

    if (
      oldSavings > 0 &&
      currentSavings > oldSavings
    ) {
      const improvement =
        (
          (
            currentSavings -
            oldSavings
          ) /
          oldSavings
        ) *
        100

      familyInsight =
        `Your family saved ${improvement.toFixed(
          1
        )}% more this month than last month. Great job! 🎉`
    } else if (
      oldSavings > 0 &&
      currentSavings < oldSavings
    ) {
      const decrease =
        (
          (
            oldSavings -
            currentSavings
          ) /
          oldSavings
        ) *
        100

      familyInsight =
        `Family savings are ${decrease.toFixed(
          1
        )}% lower than last month. It may be worth checking the expense categories.`
    } else if (
      currentSavings ===
      oldSavings
    ) {
      familyInsight =
        'Your family saved about the same amount as last month.'
    }
  }

  // =========================================================
  // DIARY
  // =========================================================

  const diaryTransactions =
    [...monthlyTransactions].sort(
      (a, b) =>
        b.date.localeCompare(a.date)
    )

  const groupedDiary = {}

  diaryTransactions.forEach(
    (transaction) => {
      if (
        !groupedDiary[
          transaction.date
        ]
      ) {
        groupedDiary[
          transaction.date
        ] = []
      }

      groupedDiary[
        transaction.date
      ].push(transaction)
    }
  )

  // =========================================================
  // TRANSACTION DISPLAY
  // =========================================================

  const getTransactionTitle = (
    transaction
  ) => {
    if (
      transaction.type ===
      'salary'
    ) {
      return 'Salary'
    }

    if (
      transaction.type ===
      'extraIncome'
    ) {
      return 'Extra Income'
    }

    if (
      transaction.type ===
      'expense'
    ) {
      return (
        transaction.category ||
        'Expense'
      )
    }

    if (
      transaction.type ===
      'borrowed'
    ) {
      return 'Borrowed Money'
    }

    if (
      transaction.type ===
      'repayment'
    ) {
      return 'Debt Repayment'
    }

    if (
      transaction.type ===
      'transfer'
    ) {
      return 'Family Transfer'
    }

    return 'Transaction'
  }

  const getTransactionAmountText =
    (transaction) => {
      if (
        transaction.type ===
        'expense'
      ) {
        return `- ${formatFamilyMoney(
          transaction.amount
        )}`
      }

      if (
        transaction.type ===
        'repayment'
      ) {
        return `- ${formatFamilyMoney(
          transaction.amount
        )}`
      }

      if (
        transaction.type ===
          'salary' ||
        transaction.type ===
          'extraIncome'
      ) {
        return `+ ${formatFamilyMoney(
          transaction.amount
        )}`
      }

      if (
        transaction.type ===
        'borrowed'
      ) {
        return `+ ${formatFamilyMoney(
          transaction.amount
        )}`
      }

      if (
        transaction.type ===
        'transfer'
      ) {
        return `↔ ${formatFamilyMoney(
          transaction.amount
        )}`
      }

      return formatFamilyMoney(
        transaction.amount
      )
    }

  // =========================================================
  // FORM TYPE CHANGE
  // =========================================================

  const changeTransactionType = (
    newType
  ) => {
    setTransactionType(newType)

    if (
      newType === 'transfer'
    ) {
      setTransferFrom(
        members.length > 0
          ? members[0].id
          : ''
      )

      setTransferTo(
        members.length > 1
          ? members[1].id
          : ''
      )
    }
  }

  // =========================================================
  // RENDER
  // =========================================================

  if (!familyCreated) {
    return (
      <div
        style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '30px',
        }}
      >
        <button
          onClick={() =>
            window.history.back()
          }
          style={{
            marginBottom: '20px',
          }}
        >
          ← Back
        </button>

        <h1>
          Family Expense Tracker
        </h1>

        <p>
          Set up your family before
          tracking income, expenses and
          transfers.
        </p>

        <div
          style={{
            border: '1px solid #ddd',
            borderRadius: '12px',
            padding: '20px',
            marginTop: '20px',
          }}
        >
          <h2>
            Create Your Family
          </h2>

          <input
            type="text"
            placeholder="Family name"
            value={familyName}
            onChange={(event) =>
              setFamilyName(
                event.target.value
              )
            }
            style={{
              width: '100%',
              padding: '10px',
              marginBottom: '15px',
            }}
          />

          <button
            onClick={createFamily}
          >
            Create Family
          </button>

          {message && (
            <p>
              {message}
            </p>
          )}
        </div>

        <div
          style={{
            border: '1px solid #ddd',
            borderRadius: '12px',
            padding: '20px',
            marginTop: '20px',
          }}
        >
          <h2>
            Family Members
          </h2>

          {members.map(
            (member) => (
              <div
                key={member.id}
                style={{
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  alignItems:
                    'center',
                  padding:
                    '10px 0',
                  borderBottom:
                    '1px solid #eee',
                }}
              >
                <div>
                  <strong>
                    {member.name}
                  </strong>

                  <div>
                    {member.role}
                  </div>
                </div>

                <button
                  onClick={() =>
                    removeMember(
                      member.id
                    )
                  }
                >
                  Remove
                </button>
              </div>
            )
          )}

          <div
            style={{
              marginTop: '20px',
            }}
          >
            <input
              type="text"
              placeholder="New member name"
              value={newMemberName}
              onChange={(event) =>
                setNewMemberName(
                  event.target.value
                )
              }
              style={{
                padding: '10px',
                marginRight: '10px',
              }}
            />

            <select
              value={newMemberRole}
              onChange={(event) =>
                setNewMemberRole(
                  event.target.value
                )
              }
              style={{
                padding: '10px',
                marginRight: '10px',
              }}
            >
              <option value="Parent">
                Parent
              </option>

              <option value="Child">
                Child
              </option>
            </select>

            <button
              onClick={addMember}
            >
              Add Member
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '30px',
      }}
    >

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div
        style={{
          display: 'flex',
          justifyContent:
            'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <div>
          <h1>
            {familyName}
          </h1>

          <p>
            Family Expense Tracker
          </p>
        </div>

        <button
          onClick={() =>
            setShowMoneyDue(
              !showMoneyDue
            )
          }
        >
          💰 Money Due
        </button>
      </div>

      {/* =====================================================
          MONEY DUE
      ===================================================== */}

      {showMoneyDue && (
        <div
          style={{
            border:
              '1px solid #ddd',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px',
          }}
        >
          <h2>
            Money Due
          </h2>

          {moneyDue.length === 0 ? (
            <p>
              No outstanding borrowed
              money.
            </p>
          ) : (
            moneyDue.map(
              (transaction) => {
                const remaining =
                  getRemainingBorrowedAmount(
                    transaction
                  )

                const isPaying =
                  paymentBorrowedId ===
                  transaction.id

                return (
                  <div
                    key={
                      transaction.id
                    }
                    style={{
                      borderBottom:
                        '1px solid #eee',
                      padding:
                        '15px 0',
                    }}
                  >
                    <strong>
                      {
                        transaction.borrowedFrom
                      }
                    </strong>

                    <p>
                      Borrowed by:{' '}
                      {
                        getMemberName(
                          transaction.memberId
                        )
                      }
                    </p>

                    <p>
                      Remaining:{' '}
                      <strong>
                        {formatFamilyMoney(
                          remaining
                        )}
                      </strong>
                    </p>

                    {transaction.dueDate && (
                      <p>
                        Due:{' '}
                        {formatFamilyDate(
                          transaction.dueDate
                        )}
                      </p>
                    )}

                    {!isPaying ? (
                      <button
                        onClick={() =>
                          setPaymentBorrowedId(
                            transaction.id
                          )
                        }
                      >
                        Record Repayment
                      </button>
                    ) : (
                      <div
                        style={{
                          marginTop:
                            '10px',
                        }}
                      >
                        <input
                          type="number"
                          placeholder="Repayment amount"
                          value={
                            paymentAmount
                          }
                          onChange={(
                            event
                          ) =>
                            setPaymentAmount(
                              event
                                .target
                                .value
                            )
                          }
                          style={{
                            padding:
                              '8px',
                            marginRight:
                              '8px',
                          }}
                        />

                        <input
                          type="date"
                          value={
                            paymentDate
                          }
                          max={
                            getTodayLocal()
                          }
                          onChange={(
                            event
                          ) =>
                            setPaymentDate(
                              event
                                .target
                                .value
                            )
                          }
                          style={{
                            padding:
                              '8px',
                            marginRight:
                              '8px',
                          }}
                        />

                        <button
                          onClick={
                            recordRepayment
                          }
                        >
                          Save
                        </button>

                        <button
                          onClick={() => {
                            setPaymentBorrowedId(
                              null
                            )
                            setPaymentAmount(
                              ''
                            )
                          }}
                          style={{
                            marginLeft:
                              '8px',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )
              }
            )
          )}
        </div>
      )}

      {/* =====================================================
          MESSAGE
      ===================================================== */}

      {message && (
        <div
          style={{
            padding: '12px',
            marginBottom: '20px',
            border:
              '1px solid #ddd',
            borderRadius: '8px',
          }}
        >
          {message}
        </div>
      )}

      {/* =====================================================
          MONTH SELECTOR
      ===================================================== */}

      <div
        style={{
          marginBottom: '20px',
        }}
      >
        <label>
          <strong>
            Selected Month
          </strong>
        </label>

        <br />

        <select
          value={selectedMonth}
          onChange={(event) =>
            setSelectedMonth(
              event.target.value
            )
          }
          style={{
            padding: '10px',
            marginTop: '8px',
          }}
        >
          {availableMonths.map(
            (month) => (
              <option
                key={month}
                value={month}
              >
                {formatFamilyMonth(
                  month
                )}
              </option>
            )
          )}
        </select>
      </div>

      {/* =====================================================
          FAMILY SUMMARY
      ===================================================== */}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px',
          marginBottom: '25px',
        }}
      >
        <div
          style={{
            border:
              '1px solid #ddd',
            borderRadius: '12px',
            padding: '18px',
          }}
        >
          <p>
            Family Income
          </p>

          <h2>
            {formatFamilyMoney(
              totalFamilyIncome
            )}
          </h2>
        </div>

        <div
          style={{
            border:
              '1px solid #ddd',
            borderRadius: '12px',
            padding: '18px',
          }}
        >
          <p>
            Family Expenses
          </p>

          <h2>
            {formatFamilyMoney(
              monthlyExpenses
            )}
          </h2>
        </div>

        <div
          style={{
            border:
              '1px solid #ddd',
            borderRadius: '12px',
            padding: '18px',
          }}
        >
          <p>
            Debt Repayments
          </p>

          <h2>
            {formatFamilyMoney(
              monthlyRepayments
            )}
          </h2>
        </div>

        <div
          style={{
            border:
              '1px solid #ddd',
            borderRadius: '12px',
            padding: '18px',
          }}
        >
          <p>
            Family Savings
          </p>

          <h2>
            {formatFamilyMoney(
              monthlyFamilyBalance
            )}
          </h2>
        </div>
      </div>

      {/* =====================================================
          INCOME BREAKDOWN
      ===================================================== */}

      <div
        style={{
          border:
            '1px solid #ddd',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '25px',
        }}
      >
        <h2>
          Income This Month
        </h2>

        <p>
          Salary:{' '}
          <strong>
            {formatFamilyMoney(
              monthlySalary
            )}
          </strong>
        </p>

        <p>
          Extra Income:{' '}
          <strong>
            {formatFamilyMoney(
              monthlyExtraIncome
            )}
          </strong>
        </p>

        <p>
          Total:{' '}
          <strong>
            {formatFamilyMoney(
              totalFamilyIncome
            )}
          </strong>
        </p>
      </div>

      {/* =====================================================
          MEMBER BALANCES
      ===================================================== */}

      <div
        style={{
          marginBottom: '25px',
        }}
      >
        <h2>
          Family Members
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '15px',
          }}
        >
          {members.map(
            (member) => (
              <div
                key={member.id}
                style={{
                  border:
                    '1px solid #ddd',
                  borderRadius:
                    '12px',
                  padding:
                    '18px',
                }}
              >
                <h3>
                  {member.name}
                </h3>

                <p>
                  {member.role}
                </p>

                <p>
                  Balance:
                </p>

                <h2>
                  {formatFamilyMoney(
                    getMonthlyMemberBalance(
                      member.id
                    )
                  )}
                </h2>
              </div>
            )
          )}
        </div>
      </div>

      {/* =====================================================
          FAMILY INSIGHT
      ===================================================== */}

      {familyInsight && (
        <div
          style={{
            border:
              '1px solid #ddd',
            borderRadius: '12px',
            padding: '18px',
            marginBottom: '25px',
          }}
        >
          <h2>
            Monthly Insight
          </h2>

          <p>
            {familyInsight}
          </p>
        </div>
      )}

      {/* =====================================================
          ADD TRANSACTION
      ===================================================== */}

      <div
        style={{
          border:
            '1px solid #ddd',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '25px',
        }}
      >
        <h2>
          {editingId
            ? 'Edit Transaction'
            : 'Add Family Transaction'}
        </h2>

        <label>
          Transaction Type
        </label>

        <br />

        <select
          value={transactionType}
          onChange={(event) =>
            changeTransactionType(
              event.target.value
            )
          }
          style={{
            padding: '10px',
            marginTop: '8px',
            marginBottom:
              '15px',
            width: '100%',
          }}
        >
          <option value="expense">
            Expense
          </option>

          <option value="salary">
            Salary / Monthly Income
          </option>

          <option value="extraIncome">
            Extra Income
          </option>

          <option value="transfer">
            Family Transfer
          </option>

          <option value="borrowed">
            Borrowed Money
          </option>
        </select>

        {/* ---------------------------------------------------
            TRANSFER FORM
        --------------------------------------------------- */}

        {transactionType ===
        'transfer' ? (
          <>
            <label>
              From Member
            </label>

            <select
              value={
                transferFrom
              }
              onChange={(
                event
              ) =>
                setTransferFrom(
                  event.target.value
                )
              }
              style={{
                padding:
                  '10px',
                marginTop:
                  '8px',
                marginBottom:
                  '15px',
                width:
                  '100%',
              }}
            >
              {members.map(
                (member) => (
                  <option
                    key={
                      member.id
                    }
                    value={
                      member.id
                    }
                  >
                    {
                      member.name
                    }
                  </option>
                )
              )}
            </select>

            <label>
              To Member
            </label>

            <select
              value={
                transferTo
              }
              onChange={(
                event
              ) =>
                setTransferTo(
                  event.target.value
                )
              }
              style={{
                padding:
                  '10px',
                marginTop:
                  '8px',
                marginBottom:
                  '15px',
                width:
                  '100%',
              }}
            >
              {members.map(
                (member) => (
                  <option
                    key={
                      member.id
                    }
                    value={
                      member.id
                    }
                  >
                    {
                      member.name
                    }
                  </option>
                )
              )}
            </select>
          </>
        ) : (
          <>
            <label>
              Member
            </label>

            <select
              value={
                selectedMember
              }
              onChange={(
                event
              ) =>
                setSelectedMember(
                  event.target.value
                )
              }
              style={{
                padding:
                  '10px',
                marginTop:
                  '8px',
                marginBottom:
                  '15px',
                width:
                  '100%',
              }}
            >
              {members.map(
                (member) => (
                  <option
                    key={
                      member.id
                    }
                    value={
                      member.id
                    }
                  >
                    {
                      member.name
                    }{' '}
                    —{' '}
                    {
                      member.role
                    }
                  </option>
                )
              )}
            </select>
          </>
        )}

        <label>
          Amount
        </label>

        <br />

        <input
          type="number"
          min="0"
          placeholder="Enter amount"
          value={amount}
          onChange={(event) =>
            setAmount(
              event.target.value
            )
          }
          style={{
            padding: '10px',
            marginTop: '8px',
            marginBottom:
              '15px',
            width: '100%',
          }}
        />

        <label>
          Date
        </label>

        <br />

        <input
          type="date"
          value={date}
          max={getTodayLocal()}
          onChange={(event) =>
            setDate(
              event.target.value
            )
          }
          style={{
            padding: '10px',
            marginTop: '8px',
            marginBottom:
              '15px',
            width: '100%',
          }}
        />

        {/* ---------------------------------------------------
            EXPENSE / EXTRA INCOME CATEGORY
        --------------------------------------------------- */}

        {transactionType ===
          'expense' && (
          <>
            <label>
              Category
            </label>

            <br />

            <select
              value={category}
              onChange={(
                event
              ) =>
                setCategory(
                  event.target.value
                )
              }
              style={{
                padding:
                  '10px',
                marginTop:
                  '8px',
                marginBottom:
                  '15px',
                width:
                  '100%',
              }}
            >
              {categories.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                )
              )}
            </select>
          </>
        )}

        {/* ---------------------------------------------------
            BORROWED MONEY
        --------------------------------------------------- */}

        {transactionType ===
          'borrowed' && (
          <>
            <label>
              Borrowed From
            </label>

            <br />

            <input
              type="text"
              placeholder="e.g. Rahul"
              value={
                borrowedFrom
              }
              onChange={(
                event
              ) =>
                setBorrowedFrom(
                  event.target
                    .value
                )
              }
              style={{
                padding:
                  '10px',
                marginTop:
                  '8px',
                marginBottom:
                  '15px',
                width:
                  '100%',
              }}
            />

            <label>
              Due Date
            </label>

            <br />

            <input
              type="date"
              value={
                dueDate
              }
              min={date}
              max="9999-12-31"
              onChange={(
                event
              ) =>
                setDueDate(
                  event.target
                    .value
                )
              }
              style={{
                padding:
                  '10px',
                marginTop:
                  '8px',
                marginBottom:
                  '15px',
                width:
                  '100%',
              }}
            />
          </>
        )}

        {/* ---------------------------------------------------
            NOTE
        --------------------------------------------------- */}

        <label>
          Note
        </label>

        <br />

        <textarea
          placeholder="Optional note"
          value={note}
          onChange={(event) =>
            setNote(
              event.target.value
            )
          }
          style={{
            padding: '10px',
            marginTop: '8px',
            marginBottom:
              '15px',
            width: '100%',
            minHeight:
              '80px',
          }}
        />

        <button
          onClick={
            saveTransaction
          }
        >
          {editingId
            ? 'Update Transaction'
            : 'Add Transaction'}
        </button>

        {editingId && (
          <button
            onClick={() => {
              resetTransactionForm()
              setMessage('')
            }}
            style={{
              marginLeft:
                '10px',
            }}
          >
            Cancel Edit
          </button>
        )}
      </div>

      {/* =====================================================
          FAMILY DIARY
      ===================================================== */}

      <div
        style={{
          marginBottom: '30px',
        }}
      >
        <h2>
          {formatFamilyMonth(
            selectedMonth
          )}{' '}
          — Family Diary
        </h2>

        {Object.keys(
          groupedDiary
        ).length === 0 ? (
          <p>
            No transactions recorded
            for this month.
          </p>
        ) : (
          Object.entries(
            groupedDiary
          ).map(
            ([
              diaryDate,
              diaryItems,
            ]) => (
              <div
                key={diaryDate}
                style={{
                  border:
                    '1px solid #ddd',
                  borderRadius:
                    '12px',
                  padding:
                    '18px',
                  marginBottom:
                    '15px',
                }}
              >
                <h3>
                  {formatFamilyDate(
                    diaryDate
                  )}
                </h3>

                {diaryItems.map(
                  (transaction) => (
                    <div
                      key={
                        transaction.id
                      }
                      style={{
                        display:
                          'flex',
                        justifyContent:
                          'space-between',
                        alignItems:
                          'center',
                        padding:
                          '12px 0',
                        borderTop:
                          '1px solid #eee',
                      }}
                    >
                      <div>
                        <strong>
                          {getTransactionTitle(
                            transaction
                          )}
                        </strong>

                        {transaction.type ===
                          'transfer' && (
                          <p>
                            {
                              getMemberName(
                                transaction.fromMemberId
                              )
                            }{' '}
                            →{' '}
                            {
                              getMemberName(
                                transaction.toMemberId
                              )
                            }
                          </p>
                        )}

                        {transaction.type !==
                          'transfer' && (
                          <p>
                            {
                              getMemberName(
                                transaction.memberId
                              )
                            }
                          </p>
                        )}

                        {transaction.note && (
                          <small>
                            {
                              transaction.note
                            }
                          </small>
                        )}

                        {transaction.type ===
                          'borrowed' && (
                          <p>
                            Borrowed from{' '}
                            {
                              transaction.borrowedFrom
                            }
                          </p>
                        )}
                      </div>

                      <div
                        style={{
                          textAlign:
                            'right',
                        }}
                      >
                        <strong>
                          {
                            getTransactionAmountText(
                              transaction
                            )
                          }
                        </strong>

                        <br />

                        {transaction.type ===
                          'borrowed' && (
                          <small>
                            Remaining:{' '}
                            {formatFamilyMoney(
                              getRemainingBorrowedAmount(
                                transaction
                              )
                            )}
                          </small>
                        )}

                        <div
                          style={{
                            marginTop:
                              '8px',
                          }}
                        >
                          <button
                            onClick={() =>
                              editTransaction(
                                transaction
                              )
                            }
                          >
                            Edit
                          </button>

                          <button
                            onClick={() =>
                              deleteTransaction(
                                transaction.id
                              )
                            }
                            style={{
                              marginLeft:
                                '6px',
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            )
          )
        )}
      </div>

      {/* =====================================================
          MONTH NAVIGATION
      ===================================================== */}

      <div
        style={{
          display: 'flex',
          justifyContent:
            'space-between',
          alignItems: 'center',
          marginTop: '30px',
          padding: '15px 0',
          borderTop:
            '1px solid #ddd',
        }}
      >
        <button
          onClick={() => {
            const previous =
              getFamilyPreviousMonth(
                selectedMonth
              )

            setSelectedMonth(
              previous
            )
          }}
        >
          ← Previous Month
        </button>

        <strong>
          {formatFamilyMonth(
            selectedMonth
          )}
        </strong>

        <button
          onClick={() => {
            const next =
              getFamilyNextMonth(
                selectedMonth
              )

            if (
              next <=
              getCurrentMonthLocal()
            ) {
              setSelectedMonth(
                next
              )
            }
          }}
          disabled={
            selectedMonth ===
            getCurrentMonthLocal()
          }
        >
          Next Month →
        </button>
      </div>
    </div>
  )
}


/* =========================================================
   MAIN APP
   ========================================================= */

function App() {

  const [mode, setMode] =
    useState(null)


  if (mode === 'family') {

    return (

      <FamilyTracker
        onBack={() =>
          setMode(null)
        }
      />

    )
  }


  if (mode === 'individual') {

    return (

      <IndividualTracker
        onBack={() =>
          setMode(null)
        }
      />

    )
  }


  return (

    <div>

      <h1>
        SpendWise
      </h1>


      <p>
        How do you want to track your expenses?
      </p>


      <button
        onClick={() =>
          setMode('family')
        }
      >
        Family Expense Tracker
      </button>


      <button
        onClick={() =>
          setMode('individual')
        }
      >
        Individual Expense Tracker
      </button>

    </div>

  )
}


export default App