// server.js — IC-North Automotive contactformulier backend (Node.js/Express + SendGrid)
// Doel: form data ontvangen en als e-mail doorsturen (naar bedrijf + optioneel bevestiging naar klant)
// Vereist ENV variabelen (Render → Environment):
//   SENDGRID_API_KEY    - API key uit SendGrid
//   MAIL_FROM           - geverifieerd afzenderadres (bijv. noreply@jouwdomein.nl)
//   MAIL_TO             - ontvangstadres(sen) komma-gescheiden (bijv. info@jouwdomein.nl)
//   (optioneel) MAIL_BCC - bcc-adres(sen)
//   (optioneel) PORT    - luistert op deze poort

import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import sg from '@sendgrid/mail';

// ---- Config ----
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const MAIL_FROM = process.env.MAIL_FROM || 'noreply@example.com';
const MAIL_TO = (process.env.MAIL_TO || 'icnorthautomotive@gmail.com').split(',').map(s => s.trim());
const MAIL_BCC = (process.env.MAIL_BCC || '').split(',').map(s => s.trim()).filter(Boolean);
const PORT = process.env.PORT || 3000;

if (!SENDGRID_API_KEY) {
  console.error('FOUT: SENDGRID_API_KEY ontbreekt. Zet deze in je environment.');
  process.exit(1);
}
sg.setApiKey(SENDGRID_API_KEY);

const app = express();
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Pas CORS aan indien frontend op ander domein staat
app.use(cors({ origin: true }));

// Simpel rate limit tegen abuse (IP-based)
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

// Helpers
function sanitize(s) {
  return String(s || '').toString().trim();
}

function formatDutchPlate(input) {
  const s = (input || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const patterns = [
    { re: /^([A-Z]{2})(\d{2})(\d{2})$/, fmt: '$1-$2-$3' },
    { re: /^(\d{2})(\d{2})([A-Z]{2})$/, fmt: '$1-$2-$3' },
    { re: /^(\d{2})([A-Z]{2})(\d{2})$/, fmt: '$1-$2-$3' },
    { re: /^([A-Z]{2})(\d{2})([A-Z]{2})$/, fmt: '$1-$2-$3' },
    { re: /^([A-Z]{2})([A-Z]{2})(\d{2})$/, fmt: '$1-$2-$3' },
    { re: /^(\d{2})([A-Z]{2})([A-Z]{2})$/, fmt: '$1-$2-$3' },
    { re: /^(\d{2})([A-Z]{3})(\d)$/, fmt: '$1-$2-$3' },
    { re: /^(\d)([A-Z]{3})(\d{2})$/, fmt: '$1-$2-$3' },
    { re: /^([A-Z]{2})(\d{3})([A-Z])$/, fmt: '$1-$2-$3' },
    { re: /^([A-Z])(\d{3})([A-Z]{2})$/, fmt: '$1-$2-$3' },
    { re: /^(\d{3})([A-Z]{2})([A-Z])$/, fmt: '$1-$2-$3' },
    { re: /^([A-Z]{3})(\d{2})([A-Z])$/, fmt: '$1-$2-$3' },
    { re: /^([A-Z])(\d{2})([A-Z]{3})$/, fmt: '$1-$2-$3' },
    { re: /^([A-Z]{3})(\d)(\d{2})$/, fmt: '$1-$2-$3' },
    { re: /^([A-Z]{2})(\d{3})([A-Z]{1})$/, fmt: '$1-$2-$3' },
  ];
  for (const p of patterns) {
    if (p.re.test(s)) return s.replace(p.re, p.fmt);
  }
  return s;
}

function validatePayload(body) {
  const errors = [];
  const rawPlate = sanitize(body.license_plate).toUpperCase();
  const cleanPlate = rawPlate.replace(/[^A-Z0-9]/g, ''); // accepteert beide invoeren
  const prettyPlate = formatDutchPlate(cleanPlate);      // altijd met streepjes

  const data = {
    first_name: sanitize(body.first_name),
    last_name: sanitize(body.last_name),
    company: sanitize(body.company),
    license_plate_raw: cleanPlate,
    license_plate_pretty: prettyPlate,
    vin: sanitize(body.vin).toUpperCase(),
    phone: sanitize(body.phone),
    email: sanitize(body.email),
    subject: sanitize(body.subject || 'Contactaanvraag via website'),
    message: sanitize(body.message),
  };

  // Vereist
  if (!data.first_name) errors.push('Voornaam is verplicht.');
  if (!data.last_name) errors.push('Achternaam is verplicht.');
  if (!data.company) errors.push('Bedrijfsnaam of "particulier" is verplicht.');
  if (!data.license_plate_raw) errors.push('Kenteken is verplicht.');
  if (!data.vin) errors.push('Chassisnummer (VIN) is verplicht.');
  if (!data.phone) errors.push('Telefoonnummer is verplicht.');
  if (!data.email) errors.push('E‑mail is verplicht.');
  if (!data.message) errors.push('Bericht is verplicht.');

  // Basischecks
  if (data.vin && data.vin.length !== 17) errors.push('Chassisnummer (VIN) moet 17 tekens zijn.');
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push('E‑mail lijkt ongeldig.');
  if (data.phone && data.phone.replace(/\D/g, '').length < 8) errors.push('Telefoonnummer lijkt ongeldig.');

  return { data, errors };
}

function buildHtmlEmail(d) {
  return `
    <h2>Nieuwe contactaanvraag</h2>
    <p>Er is een nieuw bericht verstuurd via het contactformulier.</p>
    <table border="0" cellpadding="6" cellspacing="0" style="border-collapse:collapse">
      <tr><td><strong>Voornaam</strong></td><td>${d.first_name}</td></tr>
      <tr><td><strong>Achternaam</strong></td><td>${d.last_name}</td></tr>
      <tr><td><strong>Bedrijfsnaam/Particulier</strong></td><td>${d.company}</td></tr>
      <tr><td><strong>Kenteken</strong></td><td>${d.license_plate_pretty} <span style="color:#666">(raw: ${d.license_plate_raw})</span></td></tr>
      <tr><td><strong>Chassisnummer (VIN)</strong></td><td>${d.vin}</td></tr>
      <tr><td><strong>Telefoon</strong></td><td>${d.phone}</td></tr>
      <tr><td><strong>E‑mail</strong></td><td>${d.email}</td></tr>
      <tr><td><strong>Onderwerp</strong></td><td>${d.subject}</td></tr>
      <tr><td><strong>Bericht</strong></td><td>${d.message.replace(/\n/g, '<br/>')}</td></tr>
    </table>
  `;
}

function buildTextEmail(d) {
  return [
    'Nieuwe contactaanvraag',
    '-----------------------',
    `Voornaam: ${d.first_name}`,
    `Achternaam: ${d.last_name}`,
    `Bedrijfsnaam/Particulier: ${d.company}`,
    `Kenteken: ${d.license_plate_pretty} (raw: ${d.license_plate_raw})`,
    `Chassisnummer (VIN): ${d.vin}`,
    `Telefoon: ${d.phone}`,
    `E‑mail: ${d.email}`,
    `Onderwerp: ${d.subject}`,
    '',
    d.message,
  ].join('\n');
}

app.post('/api/contact', async (req, res) => {
  try {
    const { data, errors } = validatePayload(req.body || {});
    if (errors.length) return res.status(400).json({ ok: false, errors });

    const msgToBiz = {
      to: MAIL_TO,
      bcc: MAIL_BCC.length ? MAIL_BCC : undefined,
      from: MAIL_FROM,
      replyTo: data.email,
      subject: `[Website] ${data.subject}`,
      text: buildTextEmail(data),
      html: buildHtmlEmail(data),
    };

    const msgToCustomer = {
      to: data.email,
      from: MAIL_FROM,
      subject: 'Bevestiging: bericht ontvangen',
      text: `Beste ${data.first_name} ${data.last_name},\n\nBedankt voor uw bericht. We hebben uw aanvraag ontvangen en nemen contact met u op.\n\nMet vriendelijke groet,\nIC‑North Automotive`,
      html: `<p>Beste ${data.first_name} ${data.last_name},</p>
             <p>Bedankt voor uw bericht. We hebben uw aanvraag ontvangen en nemen contact met u op.</p>
             <p>Met vriendelijke groet,<br/>IC‑North Automotive</p>`
    };

    await sg.send(msgToBiz);
    await sg.send(msgToCustomer);

    return res.json({ ok: true, message: 'Bericht verzonden. Bedankt!' });
  } catch (err) {
    console.error('SendGrid/API fout:', err?.response?.body || err?.message || err);
    return res.status(500).json({ ok: false, error: 'Er ging iets mis bij het verzenden. Probeer het later opnieuw.' });
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Contact backend luistert op port ${PORT}`);
});
