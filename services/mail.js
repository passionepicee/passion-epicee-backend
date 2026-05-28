const RESEND_API_KEY = process.env.RESEND_API_KEY;
const MAIL_FROM      = process.env.MAIL_FROM || 'commandes@passion-epicee.ca';

async function sendMail({ to, subject, html }) {
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ from: MAIL_FROM, to, subject, html }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.message || 'Erreur envoi email');
  return data;
}

function orderConfirmationHtml({ customerName, orderId, items, subtotal, shipping, total, address, payMethod }) {
  const itemsRows = (items || []).map(i =>
    `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #f0ece4;font-size:14px;color:#333;">${i.name}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0ece4;font-size:14px;color:#333;text-align:center;">x${i.qty}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0ece4;font-size:14px;color:#333;text-align:right;">${(i.price * i.qty).toFixed(2)} $</td>
    </tr>`
  ).join('');

  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f9f7f4;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7f4;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr><td style="background:#111;padding:32px 40px;text-align:center;">
          <p style="color:#cab683;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;margin:0 0 8px;">Passion Épicée</p>
          <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0;text-transform:uppercase;letter-spacing:0.05em;">Commande confirmée</h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px 40px;">
          <p style="font-size:15px;color:#333;margin:0 0 6px;">Bonjour <strong>${customerName}</strong>,</p>
          <p style="font-size:14px;color:#666;margin:0 0 28px;">Merci pour votre commande ! Nous l'avons bien reçue et nous préparons votre envoi.</p>

          ${orderId ? `<p style="font-size:12px;color:#999;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 16px;">Commande #${orderId}</p>` : ''}

          <!-- Articles -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr>
              <th style="text-align:left;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.1em;padding-bottom:10px;border-bottom:2px solid #f0ece4;">Produit</th>
              <th style="text-align:center;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.1em;padding-bottom:10px;border-bottom:2px solid #f0ece4;">Qté</th>
              <th style="text-align:right;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.1em;padding-bottom:10px;border-bottom:2px solid #f0ece4;">Prix</th>
            </tr>
            ${itemsRows}
          </table>

          <!-- Totaux -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr>
              <td style="font-size:13px;color:#666;padding:4px 0;">Sous-total</td>
              <td style="font-size:13px;color:#333;text-align:right;padding:4px 0;">${parseFloat(subtotal||0).toFixed(2)} $</td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#666;padding:4px 0;">Livraison</td>
              <td style="font-size:13px;color:#333;text-align:right;padding:4px 0;">${parseFloat(shipping||0).toFixed(2)} $</td>
            </tr>
            <tr>
              <td style="font-size:15px;font-weight:700;color:#111;padding:12px 0 4px;border-top:2px solid #f0ece4;">Total</td>
              <td style="font-size:15px;font-weight:700;color:#cab683;text-align:right;padding:12px 0 4px;border-top:2px solid #f0ece4;">${parseFloat(total||0).toFixed(2)} $</td>
            </tr>
          </table>

          ${address ? `<p style="font-size:13px;color:#666;margin:0 0 4px;"><strong>Livraison à :</strong></p><p style="font-size:13px;color:#444;margin:0 0 24px;">${address}</p>` : ''}
          ${payMethod === 'interac' ? `<div style="background:#fff8ee;border-left:3px solid #cab683;padding:14px 18px;border-radius:0 6px 6px 0;margin-bottom:24px;"><p style="font-size:13px;color:#7a5c00;margin:0;"><strong>Paiement Interac en attente</strong><br>Envoyez votre virement à <strong>commandes@passion-epicee.ca</strong> avec la commande #${orderId} en message.</p></div>` : ''}

          <p style="font-size:13px;color:#888;margin:0;">Des questions ? Écrivez-nous à <a href="mailto:commandes@passion-epicee.ca" style="color:#cab683;">commandes@passion-epicee.ca</a></p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9f7f4;padding:20px 40px;text-align:center;border-top:1px solid #eee;">
          <p style="font-size:11px;color:#aaa;margin:0;">© 2026 Passion Épicée Inc. — passion-epicee.ca</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = { sendMail, orderConfirmationHtml };
