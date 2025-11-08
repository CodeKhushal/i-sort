require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const cookieParser = require("cookie-parser");
const app = express();
const cors = require('cors');

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

app.use(cors({
  origin: 'https://isort-v2.vercel.app/', // Replace with your actual Vercel URL
  credentials: true // Allow credentials (cookies) to be sent
}));

// MongoDB Setup
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const UserSchema = new mongoose.Schema({
  email: String,
  username: String,
  password: String,
});
const User = mongoose.model("User", UserSchema);

app.use(express.json());
app.use(cookieParser());
// app.use(express.static('public'));  // Serve static files
// JWT Middleware (moved up so it can protect static file route)
function auth(req, res, next) {
  const authHeader = req.headers["authorization"];
  const tokenFromHeader = authHeader?.split(" ")[1];
  const token = tokenFromHeader || req.cookies?.token;
  if (!token) {
    // If the request expects HTML (browser navigation), redirect to login page
    if (req.accepts && req.accepts('html')) return res.redirect('/');
    return res.status(401).json({ message: 'Missing token' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    if (req.accepts && req.accepts('html')) return res.redirect('/');
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

// Signup Route
app.post("/api/signup", async (req, res) => {
  const { email, username, password } = req.body;
  const exists = await User.findOne({ email });
  if (exists)
    return res.json({ success: false, message: "Email already registered." });
  const hashed = await bcrypt.hash(password, 10);
  await User.create({ email, username, password: hashed });
  res.json({ success: true, message: "Signup successful! Login now." });
});

// Login Route
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.json({ message: "Invalid email or password" });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.json({ message: "Invalid email or password" });
  const token = jwt.sign(
    { id: user._id, username: user.username },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 1000, // 1 hour
    // add secure: true in production with HTTPS
    secure: process.env.NODE_ENV === 'production'
  });
  res.json({ token, message: "Login successful" });
});

// Secure Page Example
app.get("/dashboard.html", auth, (req, res) => {
    res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    Pragma: "no-cache",
    Expires: "0",
  });
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// Protect all sorting pages under /sorts/*.html
app.get("/sorts/:page", auth, (req, res, next) => {
  const allowed = [
    "bubbleSort.html",
    "selectionSort.html",
    "insertionSort.html",
    "countingSort.html"
  ];
  const page = req.params.page;
  if (!allowed.includes(page)) return next(); // let static or 404 handle other files
  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    Pragma: "no-cache",
    Expires: "0",
  });
  res.sendFile(path.join(__dirname, "public", "sorts", page));
});

// API to return authenticated user info used by dashboard client-side
app.get("/api/userinfo", auth, async (req, res) => {
  const user = await User.findById(req.user.id).select("email username");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ email: user.email, username: user.username });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax', path: '/' , secure: process.env.NODE_ENV === 'production' });
  res.json({ message: 'Logged out' });
});

// Serve other static files (styles, scripts, public index, etc.)
app.use(express.static("public"));

// Fallback to index for SPA routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start server
app.listen(3000, () => console.log("Server running at http://localhost:3000"));
