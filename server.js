require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const stripeRoutes = require("./routes/stripeRoutes");
const btcpayRoutes = require("./routes/btcpayRoutes");
const nowpaymentsRoutes = require("./routes/nowpaymentsRoutes");
const wooRoutes = require("./routes/wooRoutes");
const cartRoutes = require("./routes/cartRoutes");

const app = express();

const allowedOrigins = [
   process.env.FRONTEND_URL,
   "http://localhost:3000",
   "http://localhost:64952",
   "http://localhost:5173"
];

app.use(
   cors({
      origin: function (origin, callback) {
         // allow requests with no origin (like Postman)
         if (!origin) return callback(null, true);

         if (allowedOrigins.includes(origin)) {
            return callback(null, true);
         } else {
            return callback(new Error("Not allowed by CORS"));
         }
      },
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
   })
);

app.use(express.json());
app.use("/images", express.static(path.join(__dirname, "../public/images")));

// Set Cross-Origin-Opener-Policy for Google Auth
app.use((req, res, next) => {
   res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
   next();
});

/* ===========================
   ROUTES
=========================== */

app.use("/api", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api", stripeRoutes);
// app.use("/api/btcpay", btcpayRoutes);
app.use("/api/nowpayments", nowpaymentsRoutes);
app.use("/api/wc", wooRoutes);
app.use("/api/cart", cartRoutes);

// Multer Config
const storage = multer.diskStorage({
   destination: function (req, file, cb) {
      const brand = req.body.brand || "General";
      const dir = path.join(__dirname, "../public/images", brand);

      if (!fs.existsSync(dir)) {
         fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
   },
   filename: function (req, file, cb) {
      // Sanitize filename to prevent issues
      const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
      cb(null, Date.now() + '-' + safeName);
   }
});
const upload = multer({ storage: storage });

app.post("/api/upload", upload.single("image"), (req, res) => {
   if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
   }

   const brand = req.body.brand || "General";
   // The path accessible by frontend relative to public/
   const imageUrl = `/images/${brand}/${req.file.filename}`;
   res.json({ url: imageUrl, message: "File uploaded successfully" });
});

app.post("/create-invoice", async (req, res) => {
   try {
      const response = await fetch("https://api.nowpayments.io/v1/invoice", {
         method: "POST",
         headers: {
            "x-api-key": "9XMXR71-ZCMMNTK-HYC1SW4-58FGBSR",
            "Content-Type": "application/json"
         },
         body: JSON.stringify({
            price_amount: 12,
            price_currency: "usd",
            order_id: "RGDBP-21314",
            order_description: "Apple Macbook Pro 2019 x 1",
            ipn_callback_url: "https://nowpayments.io",
            success_url: "https://nowpayments.io/success",
            cancel_url: "https://nowpayments.io/cancel"
         })
      });

      const data = await response.json();

      // send invoice_url to frontend
      res.json({ invoice_url: data.invoice_url });

   } catch (err) {
      res.status(500).json({ error: err.message });
   }
});

/* ===========================
   SERVER START
=========================== */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
   console.log("Server running on port " + PORT);
});
