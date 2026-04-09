require("dotenv").config();
  const express = require("express");
  const cors = require("cors");
  const helmet = require("helmet");
  const rateLimit = require("express-rate-limit");
  const logger = require("./middleware/logger");
  const shippingRoutes = require("./routes/shipping");

  const app = express();
  const PORT = process.env.PORT || 3001;

  app.use(helmet());
  app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }));
  app.use(express.json({ limit: "50kb" }));
  app.use(logger);

  const limiter = rateLimit({
    windowMs: 60000,
    max: 30,
    message: { success: false, error: "Trop de requetes." }
  });

  app.use("/shipping", limiter, shippingRoutes);

  app.get("/health", function(req, res) {
    res.json({ ok: true, ts: new Date().toISOString() });
  });

  app.use(function(req, res) {
    res.status(404).json({ success: false, error: "Route introuvable." });
  });

  app.use(function(err, req, res, next) {
    res.status(500).json({ success: false, error: "Erreur interne." });
  });

  app.listen(PORT, function() {
    console.log("Serveur demarre sur le port " + PORT);
  });