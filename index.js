const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = 9823;

// MySQL Connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',   // Change to your DB user
  password: '',   // Change to your DB password
  database: 'test' // Change to your DB name
});

db.connect(err => {
  if (err) throw err;
  console.log('MySQL Connected...🤓🥵');
});

// SSE Clients
let clients = [];

// SSE: Send updates to connected clients
const sendEvent = (data) => {
  clients.forEach(client => client.res.write(`data: ${JSON.stringify(data)}\n\n`));
};

// Endpoint for Server-Sent Events
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  clients.push({ res });

  req.on('close', () => {
    clients = clients.filter(client => client.res !== res);
  });
});

// Store Payment in Database
app.post('/payments', (req, res) => {
  const { reg_no, phone, amount, paymentMethod } = req.body;

  const sql = `INSERT INTO payments (reg_no, phone, amount, payment_method) VALUES (?, ?, ?, ?)`;
  db.query(sql, [reg_no, phone, amount, paymentMethod], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }

    const newPayment = { id: result.insertId, reg_no, phone, amount, paymentMethod, status: 'pending' };
    
    // Notify clients via SSE
    sendEvent(newPayment);
    
    res.status(201).json({ success: true, message: 'Payment recorded', payment: newPayment });
  });
});

// Broadcasts data from the database
app.get('/payments', (req, res) => {
  const sql = 'SELECT * FROM payments';
  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
