IC-North Automotive — quick share package

Inhoud:
- index.html  → de frontend met NL/EN en RDW-kenteken lookup
- server.js   → Node/Express backend met SendGrid (optioneel)
- (tip) styles.css en assets/ logo kun je later toevoegen

Snel delen via WhatsApp (alleen frontend bekijken):
1) Stuur het ZIP-bestand 'icn-website-share.zip' via WhatsApp (als document).
2) De ontvanger pakt de ZIP uit en dubbelklikt 'index.html' om lokaal te openen.

Online link delen (aanrader):
- Upload 'index.html' naar bv. Render Static Site, Netlify, Vercel of GitHub Pages.
- Stuur de URL via WhatsApp.

Backend gebruiken (optioneel):
- Maak een Node service aan met server.js.
- Zet env vars: SENDGRID_API_KEY, MAIL_FROM, MAIL_TO.
- Laat 'index.html' POSTen naar jouw backend-URL of gebruik rewrites.
