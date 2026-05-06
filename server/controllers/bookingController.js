const db = require('../db');
const { v4: uuidv4 } = require('uuid');

exports.getAllBookings = async (req, res) => {
  try {
    const { from, to, status } = req.query;
    let sql = `
      SELECT b.*, 
             s.name as slot_name, s.color as slot_color, 
             s.start_time as slot_start_time, s.end_time as slot_end_time,
             s.is_overnight as slot_is_overnight
      FROM bookings b
      LEFT JOIN time_slots s ON b.slot_id = s.id
      WHERE b.deleted_at IS NULL
    `;
    const args = [];
    if (from) { sql += ` AND b.booking_date >= ?`; args.push(from); }
    if (to)   { sql += ` AND b.booking_date <= ?`; args.push(to); }
    if (status && status !== 'all') { sql += ` AND b.status = ?`; args.push(status); }
    sql += ` ORDER BY b.booking_date DESC, b.created_at DESC`;

    const result = await db.execute({ sql, args });
    
    const formatted = result.rows.map(r => ({
      ...r,
      slot: r.slot_id ? {
        name: r.slot_name,
        color: r.slot_color,
        start_time: r.slot_start_time,
        end_time: r.slot_end_time,
        is_overnight: r.slot_is_overnight
      } : null
    }));
    
    res.json(formatted);
  } catch (err) {
    console.error('Get bookings error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getBookingById = async (req, res) => {
  try {
    const result = await db.execute({
      sql: `SELECT b.*, s.name as slot_name, s.color as slot_color
            FROM bookings b
            LEFT JOIN time_slots s ON b.slot_id = s.id
            WHERE b.id = ? AND b.deleted_at IS NULL`,
      args: [req.params.id]
    });
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    const r = result.rows[0];
    res.json({
      ...r,
      slot: r.slot_id ? { name: r.slot_name, color: r.slot_color } : null
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createBooking = async (req, res) => {
  const { 
    customer_name, mobile, booking_date, slot_id, guests, 
    agreed_total, advance_paid, discount, status, notes,
    id_proof_type, id_proof_number
  } = req.body;

  if (!customer_name || !mobile || !booking_date) {
    return res.status(400).json({ error: 'customer_name, mobile, and booking_date are required' });
  }

  try {
    const id = uuidv4();
    let order_id;
    let attempts = 0;
    while (attempts < 5) {
      order_id = `EF${Math.floor(100000 + Math.random() * 900000)}`;
      const existing = await db.execute({ sql: 'SELECT id FROM bookings WHERE order_id = ?', args: [order_id] });
      if (existing.rows.length === 0) break;
      attempts++;
    }

    await db.execute({
      sql: `INSERT INTO bookings (
        id, order_id, customer_name, mobile, booking_date, slot_id, guests,
        agreed_total, advance_paid, discount, status, notes,
        id_proof_type, id_proof_number, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id, order_id, customer_name, mobile, booking_date, 
        slot_id || null, guests || 1,
        agreed_total || 0, advance_paid || 0, discount || 0, 
        status || 'Pending', notes || null,
        id_proof_type || null, id_proof_number || null, req.user.id
      ]
    });

    res.status(201).json({ id, order_id });
  } catch (err) {
    console.error('Create booking error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateBooking = async (req, res) => {
  const { id } = req.params;
  const { 
    customer_name, mobile, booking_date, slot_id, guests, 
    agreed_total, advance_paid, discount, status, notes,
    id_proof_type, id_proof_number
  } = req.body;

  try {
    const check = await db.execute({ sql: 'SELECT id FROM bookings WHERE id = ?', args: [id] });
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    await db.execute({
      sql: `UPDATE bookings SET 
        customer_name = ?, mobile = ?, booking_date = ?, slot_id = ?, guests = ?,
        agreed_total = ?, advance_paid = ?, discount = ?, status = ?, notes = ?,
        id_proof_type = ?, id_proof_number = ?
        WHERE id = ?`,
      args: [
        customer_name, mobile, booking_date, slot_id || null, guests,
        agreed_total, advance_paid, discount, status, notes || null,
        id_proof_type || null, id_proof_number || null, id
      ]
    });

    res.json({ message: 'Booking updated' });
  } catch (err) {
    console.error('Update booking error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteBooking = async (req, res) => {
  const { id } = req.params;
  try {
    const check = await db.execute({ sql: 'SELECT id FROM bookings WHERE id = ?', args: [id] });
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    await db.execute({
      sql: 'UPDATE bookings SET deleted_at = ? WHERE id = ?',
      args: [new Date().toISOString(), id]
    });
    res.json({ message: 'Booking deleted' });
  } catch (err) {
    console.error('Delete booking error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.downloadReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get booking data
    const bResult = await db.execute({
      sql: `SELECT b.*, s.name as slot_name
            FROM bookings b
            LEFT JOIN time_slots s ON b.slot_id = s.id
            WHERE b.id = ? AND b.deleted_at IS NULL`,
      args: [id]
    });
    
    if (bResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Get settings
    const sResult = await db.execute({ sql: 'SELECT * FROM settings LIMIT 1' });
    const settings = sResult.rows[0] || {};
    const booking = bResult.rows[0];

    const { generateReceipt } = require('../pdf/receiptGenerator');
    const buffer = await generateReceipt(booking, settings);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${booking.order_id}.pdf`);
    res.send(buffer);
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
};
