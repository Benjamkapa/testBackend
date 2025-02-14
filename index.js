// index.js
const express = require("express");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 9823;

// Allow cross-origin requests
app.use(cors());
// Parse JSON bodies
app.use(express.json());

// In-memory storage for payments and connected SSE clients
let payments = [];
let clients = [];

// Helper function: Broadcast payment to all SSE clients
const broadcastPayment = (payment) => {
  clients.forEach((client) => {
    client.res.write(`data: ${JSON.stringify(payment)}\n\n`);
  });
};

// SSE Endpoint for notifications
app.get("/notifications", (req, res) => {
  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // // Optionally send an initial event
  // res.write(`data: ${JSON.stringify({ message: "Connected to notifications stream" })}\n\n`);

  // Save the client connection for later broadcasts
  const clientId = Date.now();
  const newClient = { id: clientId, res };
  clients.push(newClient);
  console.log(`Client ${clientId} connected. Total clients: ${clients.length}`);

  // Remove client when connection is closed
  req.on("close", () => {
    console.log(`Client ${clientId} disconnected.`);
    clients = clients.filter(client => client.id !== clientId);
  });
});

// Endpoint to retrieve all payments (optional)
app.get("/payments", (req, res) => {
  res.json(payments);
});

// POST endpoint to add a new payment
app.post("/payments", (req, res) => {
  const payment = req.body;
  // Create a unique id and record the timestamp
  payment.id = Date.now();
  payment.timestamp = new Date().toISOString();
  payments.push(payment);

  // Broadcast the new payment via SSE
  broadcastPayment(payment);
  console.log("Broadcasting new payment:", payment);

  // Respond with the created payment
  res.status(201).json(payment);
});

// Start the server
app.listen(port, () => {
  console.log(`Server's running on http://localhost:${port} 🤓🥵`);
});
