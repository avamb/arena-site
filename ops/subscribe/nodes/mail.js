// The confirmation letter (double opt-in). Sent from the MAIN domain (noreply@arenasoldout.com, the warm stream),
// never from arenasoldout.org (cold mail). It carries the confirm link and an unsubscribe link; the page language
// picks the text, languages without a text here (cs, no, he) get English, and the link points at the site page of
// that language (the pages exist for the languages in the site menu, the others use the English page).
const p = $('Prepare').first().json;
const SITE = 'https://arenasoldout.com';
const T = {
  en: { subject: 'Confirm your subscription', hi: 'Hello,', body: 'You asked to receive practical tips on selling tickets from ArenaSoldOut.com, one short e-mail every two weeks. Confirm your address to start:', button: 'Confirm subscription', ignore: 'If this was not you, ignore this e-mail: nothing will be sent to you.', unsub: 'Unsubscribe' },
  ru: { subject: 'Подтвердите подписку', hi: 'Здравствуйте!', body: 'Вы попросили присылать практические советы по продаже билетов от ArenaSoldOut.com, одно короткое письмо раз в две недели. Подтвердите адрес, чтобы начать:', button: 'Подтвердить подписку', ignore: 'Если это были не вы, просто проигнорируйте письмо: ничего отправляться не будет.', unsub: 'Отписаться' },
  es: { subject: 'Confirma tu suscripción', hi: 'Hola:', body: 'Has pedido recibir consejos prácticos para vender entradas de ArenaSoldOut.com, un correo breve cada dos semanas. Confirma tu dirección para empezar:', button: 'Confirmar suscripción', ignore: 'Si no has sido tú, ignora este correo: no te enviaremos nada.', unsub: 'Darse de baja' },
  pt: { subject: 'Confirme a sua subscrição', hi: 'Olá,', body: 'Pediu para receber dicas práticas sobre venda de bilhetes da ArenaSoldOut.com, um e-mail curto de duas em duas semanas. Confirme o seu endereço para começar:', button: 'Confirmar subscrição', ignore: 'Se não foi você, ignore este e-mail: não será enviado nada.', unsub: 'Cancelar subscrição' },
  de: { subject: 'Bitte bestätigen Sie Ihr Abonnement', hi: 'Guten Tag,', body: 'Sie möchten praktische Tipps zum Ticketverkauf von ArenaSoldOut.com erhalten, eine kurze E-Mail alle zwei Wochen. Bestätigen Sie Ihre Adresse, um zu beginnen:', button: 'Abonnement bestätigen', ignore: 'Wenn Sie das nicht waren, ignorieren Sie diese E-Mail: Es wird nichts an Sie gesendet.', unsub: 'Abmelden' },
  fr: { subject: 'Confirmez votre abonnement', hi: 'Bonjour,', body: 'Vous avez demandé à recevoir des conseils pratiques sur la vente de billets de la part d’ArenaSoldOut.com, un court e-mail toutes les deux semaines. Confirmez votre adresse pour commencer :', button: 'Confirmer l’abonnement', ignore: 'Si ce n’était pas vous, ignorez cet e-mail : rien ne vous sera envoyé.', unsub: 'Se désabonner' },
  it: { subject: 'Conferma la tua iscrizione', hi: 'Buongiorno,', body: 'Hai chiesto di ricevere consigli pratici sulla vendita di biglietti da ArenaSoldOut.com, una breve e-mail ogni due settimane. Conferma il tuo indirizzo per iniziare:', button: 'Conferma iscrizione', ignore: 'Se non sei stato tu, ignora questa e-mail: non ti verrà inviato nulla.', unsub: 'Annulla iscrizione' },
  pl: { subject: 'Potwierdź subskrypcję', hi: 'Dzień dobry,', body: 'Prosisz o praktyczne wskazówki dotyczące sprzedaży biletów od ArenaSoldOut.com, jedna krótka wiadomość co dwa tygodnie. Potwierdź adres, aby zacząć:', button: 'Potwierdź subskrypcję', ignore: 'Jeśli to nie Ty, zignoruj tę wiadomość: nic do Ciebie nie wyślemy.', unsub: 'Wypisz się' },
  uk: { subject: 'Підтвердьте підписку', hi: 'Вітаємо!', body: 'Ви попросили надсилати практичні поради з продажу квитків від ArenaSoldOut.com, один короткий лист раз на два тижні. Підтвердьте адресу, щоб почати:', button: 'Підтвердити підписку', ignore: 'Якщо це були не ви, просто проігноруйте лист: нічого надсилатися не буде.', unsub: 'Відписатися' },
};
const L = T[p.lang] || T.en;
const MENU = ['es', 'pt', 'de', 'fr', 'it', 'pl', 'uk', 'ru'];
const prefix = MENU.includes(p.lang) ? '/' + p.lang : '';
const confirmUrl = `${SITE}${prefix}/subscribe/confirm?t=${p.token}`;
const unsubUrl = `${SITE}${prefix}/subscribe/unsubscribe?t=${p.token}`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const html = `<!doctype html><html lang="${esc(T[p.lang] ? p.lang : 'en')}"><body style="margin:0;background:#f5f5f7;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1d1d1f">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px">
<tr><td style="padding:32px 32px 8px;font-size:18px;font-weight:700;color:#4f46e5">ArenaSoldOut.com</td></tr>
<tr><td style="padding:8px 32px 0;font-size:16px;line-height:1.55">${esc(L.hi)}<br><br>${esc(L.body)}</td></tr>
<tr><td style="padding:24px 32px"><a href="${esc(confirmUrl)}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:600;font-size:16px">${esc(L.button)}</a></td></tr>
<tr><td style="padding:0 32px 24px;font-size:14px;line-height:1.5;color:#555">${esc(L.ignore)}</td></tr>
<tr><td style="padding:16px 32px 28px;border-top:1px solid #e5e5ea;font-size:12px;line-height:1.5;color:#777">ArenaSoldOut.com · ABH TEAM OÜ<br><a href="${esc(unsubUrl)}" style="color:#777">${esc(L.unsub)}</a></td></tr>
</table></td></tr></table></body></html>`;
const text = `${L.hi}\n\n${L.body}\n${confirmUrl}\n\n${L.ignore}\n\n${L.unsub}: ${unsubUrl}\nArenaSoldOut.com · ABH TEAM OÜ`;
const brevo = {
  sender: { name: 'ArenaSoldOut.com', email: 'noreply@arenasoldout.com' },
  replyTo: { email: 'hello@arenasoldout.com', name: 'ArenaSoldOut.com' },
  to: [{ email: p.email }],
  subject: L.subject,
  htmlContent: html,
  textContent: text,
  headers: { 'List-Unsubscribe': `<${unsubUrl}>` },
  tags: ['subscribe-confirm'],
};
return [{ json: { brevo } }];
