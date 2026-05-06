const PDFDocument = require('pdfkit');

/**
 * Generates a Booking Receipt PDF
 * @param {Object} booking - Booking data
 * @param {Object} settings - Farmhouse settings
 * @returns {Promise<Buffer>}
 */
const generateReceipt = (booking, settings) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // Header
      doc.fillColor('#1A237E').fontSize(24).text(settings.farmhouse_name || '16 EYES Farm House', { align: 'center' });
      doc.fontSize(10).fillColor('#666').text(settings.address || '', { align: 'center' });
      doc.text(`Phone: ${settings.phone || ''}`, { align: 'center' });
      doc.moveDown();

      // Divider
      doc.strokeColor('#FFD700').lineWidth(2).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();

      // Receipt Title
      doc.fillColor('#1A237E').fontSize(18).text('BOOKING RECEIPT', { align: 'center', underline: true });
      doc.moveDown();

      // Booking Details
      doc.fontSize(12).fillColor('#000');
      
      const leftCol = 160;
      const rowHeight = 20;
      let currentY = doc.y;

      const drawRow = (label, value) => {
        doc.font('Helvetica-Bold').text(label, 50, currentY);
        doc.font('Helvetica').text(value, leftCol, currentY);
        currentY += rowHeight;
      };

      drawRow('Order ID:', booking.order_id);
      drawRow('Customer Name:', booking.customer_name);
      drawRow('Mobile:', `+91 ${booking.mobile}`);
      drawRow('Booking Date:', booking.booking_date);
      drawRow('Time Slot:', booking.slot_name || 'Full Day');
      drawRow('Guests:', booking.guests.toString());
      drawRow('Status:', booking.status);
      
      doc.moveDown();
      currentY = doc.y;

      // Financials
      doc.strokeColor('#EEE').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();
      currentY = doc.y;

      drawRow('Agreed Total:', `INR ${booking.agreed_total.toFixed(2)}`);
      drawRow('Advance Paid:', `INR ${booking.advance_paid.toFixed(2)}`);
      drawRow('Discount:', `INR ${booking.discount.toFixed(2)}`);
      
      const balance = booking.agreed_total - booking.advance_paid - booking.discount;
      doc.moveDown();
      currentY = doc.y;
      
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#D32F2F');
      doc.text('REMAINING BALANCE:', 50, currentY);
      doc.text(`INR ${balance.toFixed(2)}`, leftCol, currentY);

      // Footer
      doc.moveDown(4);
      doc.fontSize(10).fillColor('#999').text('Thank you for choosing 16 Eyes Farm House!', { align: 'center', italic: true });
      doc.text('This is a computer-generated receipt.', { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateReceipt };
