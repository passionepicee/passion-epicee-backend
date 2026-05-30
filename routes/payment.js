const express = require("express");
const router  = express.Router();
const Stripe  = require("stripe");
const { sendMail, orderConfirmationHtml } = require("../services/mail");

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// POST /payment/create-intent
router.post("/create-intent", async function (req, res) {
  try {
    const { amount, currency, customerName, customerEmail, orderId } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, error: "Montant invalide." });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount:   Math.round(amount * 100),
      currency: currency || "cad",
      automatic_payment_methods: { enabled: true },
      receipt_email: customerEmail || undefined,
      description:   `Passion Épicée — Commande${orderId ? " #" + orderId : ""}`,
      metadata: {
        customer_name:  customerName  || "",
        customer_email: customerEmail || "",
        order_id:       orderId       || "",
      },
    });

    return res.json({
      success:         true,
      clientSecret:    paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err) {
    console.error("[Stripe]", err.message);
    return res.status(400).json({ success: false, error: err.message });
  }
});

// POST /payment/update-intent
// Attache la référence de commande au PaymentIntent une fois l'orderId connu
// (le PaymentIntent est créé AVANT que la commande n'existe, donc order_id arrive
//  vide à la création — on le complète ici).
router.post("/update-intent", async function (req, res) {
  try {
    const { paymentIntentId, orderId, orderReference } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ success: false, error: "paymentIntentId requis." });
    }

    await stripe.paymentIntents.update(paymentIntentId, {
      description: `Passion Épicée — Commande${orderId ? " #" + orderId : ""}`,
      metadata: {
        order_id:        String(orderId || ""),
        order_reference: String(orderReference || orderId || ""),
      },
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("[Stripe update-intent]", err.message);
    return res.status(400).json({ success: false, error: err.message });
  }
});

// POST /payment/confirm-order
// Envoie l'email de confirmation après commande
router.post("/confirm-order", async function (req, res) {
  try {
    const { customerName, customerEmail, orderId, items, subtotal, shipping, total, address, payMethod, paymentIntentId } = req.body;

    if (!customerEmail) {
      return res.status(400).json({ success: false, error: "Email requis." });
    }

    // Vérifier que le paiement Stripe est bien confirmé (paiements Stripe uniquement)
    if (paymentIntentId) {
      try {
        const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (intent.status !== 'succeeded') {
          return res.status(400).json({ success: false, error: "Paiement non confirmé." });
        }
      } catch (stripeErr) {
        return res.status(400).json({ success: false, error: "Impossible de vérifier le paiement." });
      }
    }

    const html = orderConfirmationHtml({ customerName, orderId, items, subtotal, shipping, total, address, payMethod });

    await sendMail({
      to:      customerEmail,
      subject: `✓ Commande confirmée — Passion Épicée${orderId ? ' #' + orderId : ''}`,
      html,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("[Mail]", err.message);
    return res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
