const express = require('express');
const router = express.Router();
const financeController = require('../controllers/financeController');
const { auth } = require('../middleware/auth');

// Incomes
router.get('/incomes', auth, financeController.getAllIncomes);
router.post('/incomes', auth, financeController.createIncome);
router.put('/incomes/:id', auth, financeController.updateIncome);
router.delete('/incomes/:id', auth, financeController.deleteIncome);

// Expenses
router.get('/expenses', auth, financeController.getAllExpenses);
router.post('/expenses', auth, financeController.createExpense);
router.put('/expenses/:id', auth, financeController.updateExpense);
router.delete('/expenses/:id', auth, financeController.deleteExpense);

// Types
router.get('/income-types', auth, financeController.getIncomeTypes);
router.post('/income-types', auth, financeController.createIncomeType);
router.put('/income-types/:id', auth, financeController.updateIncomeType);
router.delete('/income-types/:id', auth, financeController.deleteIncomeType);

router.get('/expense-types', auth, financeController.getExpenseTypes);
router.post('/expense-types', auth, financeController.createExpenseType);
router.put('/expense-types/:id', auth, financeController.updateExpenseType);
router.delete('/expense-types/:id', auth, financeController.deleteExpenseType);

module.exports = router;
