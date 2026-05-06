const db = require('../db');
const { v4: uuidv4 } = require('uuid');

// --- Incomes ---
exports.getAllIncomes = async (req, res) => {
  try {
    const { from, to } = req.query;
    let sql = `
      SELECT i.*, t.name as type_name, t.id as type_id_ref
      FROM incomes i
      LEFT JOIN income_types t ON i.type_id = t.id
      WHERE i.deleted_at IS NULL
    `;
    const args = [];
    if (from) { sql += ` AND i.date >= ?`; args.push(from); }
    if (to)   { sql += ` AND i.date <= ?`; args.push(to); }
    sql += ` ORDER BY i.date DESC, i.created_at DESC`;
    
    const result = await db.execute({ sql, args });
    const formatted = result.rows.map(r => ({
      ...r,
      type: r.type_id ? { id: r.type_id, name: r.type_name } : null
    }));
    
    res.json(formatted);
  } catch (err) {
    console.error('Get incomes error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createIncome = async (req, res) => {
  const { date, type_id, amount, payment_mode, reference, description } = req.body;
  
  if (!date || !amount || !payment_mode) {
    return res.status(400).json({ error: 'Date, amount, and payment_mode are required' });
  }
  
  try {
    const id = uuidv4();
    await db.execute({
      sql: `INSERT INTO incomes (id, date, type_id, amount, payment_mode, reference, description, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, date, type_id || null, amount, payment_mode, reference || null, description || null, req.user.id]
    });
    res.status(201).json({ id });
  } catch (err) {
    console.error('Create income error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateIncome = async (req, res) => {
  const { id } = req.params;
  const { date, type_id, amount, payment_mode, reference, description } = req.body;
  try {
    await db.execute({
      sql: `UPDATE incomes SET date=?, type_id=?, amount=?, payment_mode=?, reference=?, description=? WHERE id=?`,
      args: [date, type_id || null, amount, payment_mode, reference || null, description || null, id]
    });
    res.json({ message: 'Updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteIncome = async (req, res) => {
  try {
    await db.execute({
      sql: 'UPDATE incomes SET deleted_at = ? WHERE id = ?',
      args: [new Date().toISOString(), req.params.id]
    });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// --- Expenses ---
exports.getAllExpenses = async (req, res) => {
  try {
    const { from, to } = req.query;
    let sql = `
      SELECT e.*, t.name as type_name
      FROM expenses e
      LEFT JOIN expense_types t ON e.type_id = t.id
      WHERE e.deleted_at IS NULL
    `;
    const args = [];
    if (from) { sql += ` AND e.date >= ?`; args.push(from); }
    if (to)   { sql += ` AND e.date <= ?`; args.push(to); }
    sql += ` ORDER BY e.date DESC, e.created_at DESC`;
    
    const result = await db.execute({ sql, args });
    const formatted = result.rows.map(r => ({
      ...r,
      type: r.type_id ? { id: r.type_id, name: r.type_name } : null
    }));
    
    res.json(formatted);
  } catch (err) {
    console.error('Get expenses error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createExpense = async (req, res) => {
  const { date, type_id, amount, payment_mode, vendor, reference, description } = req.body;
  
  if (!date || !amount || !payment_mode) {
    return res.status(400).json({ error: 'Date, amount, and payment_mode are required' });
  }
  
  try {
    const id = uuidv4();
    await db.execute({
      sql: `INSERT INTO expenses (id, date, type_id, amount, payment_mode, vendor, reference, description, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, date, type_id || null, amount, payment_mode, vendor || null, reference || null, description || null, req.user.id]
    });
    res.status(201).json({ id });
  } catch (err) {
    console.error('Create expense error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateExpense = async (req, res) => {
  const { id } = req.params;
  const { date, type_id, amount, payment_mode, vendor, reference, description } = req.body;
  try {
    await db.execute({
      sql: `UPDATE expenses SET date=?, type_id=?, amount=?, payment_mode=?, vendor=?, reference=?, description=? WHERE id=?`,
      args: [date, type_id || null, amount, payment_mode, vendor || null, reference || null, description || null, id]
    });
    res.json({ message: 'Updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    await db.execute({
      sql: 'UPDATE expenses SET deleted_at = ? WHERE id = ?',
      args: [new Date().toISOString(), req.params.id]
    });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// --- Income Types ---
exports.getIncomeTypes = async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM income_types ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createIncomeType = async (req, res) => {
  if (!req.body.name || !req.body.name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  try {
    const id = uuidv4();
    await db.execute({ sql: 'INSERT INTO income_types (id, name) VALUES (?, ?)', args: [id, req.body.name.trim()] });
    res.status(201).json({ id });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Type name already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateIncomeType = async (req, res) => {
  if (!req.body.name || !req.body.name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  try {
    await db.execute({ sql: 'UPDATE income_types SET name = ? WHERE id = ?', args: [req.body.name.trim(), req.params.id] });
    res.json({ message: 'Updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteIncomeType = async (req, res) => {
  try {
    const check = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM incomes WHERE type_id = ? AND deleted_at IS NULL',
      args: [req.params.id]
    });
    if (check.rows[0].count > 0) {
      return res.status(409).json({ error: 'Cannot delete: this type has existing income records' });
    }
    await db.execute({ sql: 'DELETE FROM income_types WHERE id = ?', args: [req.params.id] });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// --- Expense Types ---
exports.getExpenseTypes = async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM expense_types ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createExpenseType = async (req, res) => {
  if (!req.body.name || !req.body.name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  try {
    const id = uuidv4();
    await db.execute({ sql: 'INSERT INTO expense_types (id, name) VALUES (?, ?)', args: [id, req.body.name.trim()] });
    res.status(201).json({ id });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Type name already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateExpenseType = async (req, res) => {
  if (!req.body.name || !req.body.name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  try {
    await db.execute({ sql: 'UPDATE expense_types SET name = ? WHERE id = ?', args: [req.body.name.trim(), req.params.id] });
    res.json({ message: 'Updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteExpenseType = async (req, res) => {
  try {
    const check = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM expenses WHERE type_id = ? AND deleted_at IS NULL',
      args: [req.params.id]
    });
    if (check.rows[0].count > 0) {
      return res.status(409).json({ error: 'Cannot delete: this type has existing expense records' });
    }
    await db.execute({ sql: 'DELETE FROM expense_types WHERE id = ?', args: [req.params.id] });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
