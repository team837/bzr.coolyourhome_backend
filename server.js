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



// 27-04-2026
const { db, getUseDb } = require("./config/db");
app.post("/create-invoice", async (req, res) => {
   try {


      const { id, price_amount } = req.body;

      const response = await fetch("https://api.nowpayments.io/v1/invoice", {
         method: "POST",
         headers: {
            "x-api-key": "9XMXR71-ZCMMNTK-HYC1SW4-58FGBSR",
            "Content-Type": "application/json"
         },
         body: JSON.stringify({
            price_amount: price_amount,
            price_currency: "usd",
            order_id: id,
            order_description: "Apple Macbook Pro 2019 x 1",
            ipn_callback_url: "https://nowpayments.io",
            success_url: "https://bzr-coolyourhome-backend.onrender.com/success?id=" + id + "&price=" + price_amount,
            cancel_url: "https://bzr-coolyourhome-backend.onrender.com/cancel"
         })
      });




      const data = await response.json();

      // send invoice_url to frontend
      res.json({ invoice_url: data.invoice_url });

   } catch (err) {
      res.status(500).json({ error: err.message });
   }
});



app.get("/success", (req, res) => {
   const { id, price } = req.query;

   if (!id || !price) {
      return res.status(400).json({ error: "Missing id or price" });
   }

   const userId = parseInt(id, 10);
   const amount = parseFloat(price);

   if (isNaN(userId) || isNaN(amount)) {
      return res.status(400).json({ error: "Invalid id or price" });
   }

   db.query(
      "UPDATE users SET balance = balance + ? WHERE id = ?",
      [amount, userId],
      (err) => {
         if (err) {
            console.error("BALANCE UPDATE ERROR:", err);
            return res.status(500).json({ error: err.message });
         }

         // fetch updated user
         db.query(
            "SELECT id, fullname, email, balance FROM users WHERE id = ?",
            [userId],
            (err, results) => {
               if (err) {
                  return res.status(500).json({ error: err.message });
               }

               if (results.length === 0) {
                  return res.status(404).json({ error: "User not found" });
               }

               res.json({
                  message: "Balance updated successfully",
                  user: results[0]
               });
            }
         );
      }
   );
});

const API_KEY = process.env.MAXELPAY_API_KEY;

app.post("/create_payment", async (req, res) => {
   try {
      const { id, price_amount } = req.body;
      console.log("price");
      console.log(price_amount);


      const paymentData = {
         orderId: "order_123",
         amount: price_amount,
         currency: "USD",
         description: "Order #123 - Premium Package",
         successUrl: `https://bzr-coolyourhome-backend.onrender.com/success?id=${id}&price=${price_amount}`,
         cancelUrl: "https://yoursite.com/cancel",
         callbackUrl: "https://yoursite.com/webhook"
      };

      const response = await fetch(
         "https://api.maxelpay.com/api/v1/payments/sessions",
         {
            method: "POST",
            headers: {
               "X-API-KEY": API_KEY,
               "Content-Type": "application/json"
            },
            body: JSON.stringify(paymentData)
         }
      );

      const data = await response.json();
      console.log(data);
      res.json(data);

   } catch (error) {
      console.error(error);

      res.status(500).json({
         success: false,
         error: error.message
      });
   }
});
/* ===========================
   SERVER START
=========================== */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
   console.log("Server running on port " + PORT);
});
