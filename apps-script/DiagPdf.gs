/**
 * Dollar Express — שאלון דיאגנוסטי → PDF + מייל
 * ------------------------------------------------------------
 * קובץ נפרד בפרויקט ה-Apps Script של הגיליון "Dollar Express — Lead Backup"
 * (ליד Code.gs, שבו נמצא doPost). לא נוגע בשום פונקציה קיימת.
 *
 * התקנה:
 *   1. ליצור קובץ חדש בפרויקט בשם DiagPdf ולהדביק את כל הקובץ הזה.
 *   2. ב-Code.gs, בתוך doPost, להחליף את הבלוק:
 *        if (data.event === 'diagnostic-complete' && data.diagReport) {
 *          try { sendDiagPdf(data, phone, ts); } catch(pdfErr) { ... }
 *        }
 *      בשורה אחת:
 *        if (data.event === 'diagnostic-complete') diagHandleComplete_(data);
 *   3. Deploy → Manage deployments → עיפרון → Version: New version → Deploy
 *      (אותו URL, לא צריך לשנות כלום באתר).
 *   4. להריץ פעם אחת את diagResendRow (שולח את השאלון של שורה 379 = טל תורג׳מן).
 *
 * העיקרון: אף שאלון לא נבלע בשקט.
 *   - הדפדפן שלח diagReport → PDF ומייל כמו קודם.
 *   - diagReport חסר → הדוח נבנה כאן מהתשובות הגולמיות, המייל יוצא בכל זאת,
 *     ונשלחת אזהרה לשמואל שהקוד באתר לא שולח diagReport.
 *   - כל שגיאה → מייל התראה לשמואל עם התשובות הגולמיות.
 */

var DIAG_RECIPIENTS = ['info@dollaracademy.co.il', 'gill.andreyev@gmail.com', 'sam@shmuelmordechay.com'];
var DIAG_ALERT_TO = 'sam@shmuelmordechay.com';

// סדר ותוויות של השאלון החדש (?fill=1) — זהה ל-STEPS ב-lp/index.html
var DIAG_SECTIONS = [
  { title: '01 · העסק', fields: [
    ['links', 'קישורים לעסק'],
    ['_files', 'קבצים שיעזרו לנו להכיר את העסק'],
    ['first_offer', 'מה תרצה למכור ראשון בארה״ב, ובאיזה מחיר הוא נמכר היום?'],
    ['business_type', 'סוג העסק'],
    ['physical_details', 'איפה מייצרים, ומה העלות ליחידה בערך?'],
    ['service_details', 'אפשר לספק את השירות מרחוק? וכמה לקוחות אפשר לקחת בחודש?'],
    ['software_details', 'מה מודל התמחור: מנוי, רישיון או אחר?']
  ]},
  { title: '02 · הלקוחות', fields: [
    ['ideal_client', 'מי הלקוח שהיית רוצה לשכפל פי עשרה?'],
    ['lead_sources', 'מאיפה מגיעים הלקוחות היום?'],
    ['lead_sources_other', 'איזה ערוץ?'],
    ['annual_revenue', 'מחזור שנתי'],
    ['avg_deal', 'עסקה ממוצעת']
  ]},
  { title: '03 · ארה״ב', fields: [
    ['success_12m', 'איך נראית הצלחה בארה״ב בעוד 12 חודשים?'],
    ['us_assets', 'מה כבר יש לך בארה״ב?'],
    ['us_assets_details', 'פירוט בקצרה'],
    ['regulation', 'האם המוצר או השירות דורשים אישור, רישיון או תקן?'],
    ['regulation_details', 'איזה אישור או תקן?'],
    ['ip_status', 'פטנט, סימן מסחר או מדגם']
  ]},
  { title: '04 · הפגישה', fields: [
    ['competitors', 'קישורים לעד שלושה מתחרים, בישראל או בארה״ב'],
    ['budget_y1', 'תקציב לשנה הראשונה בארה״ב, כולל שיווק'],
    ['meeting_goal', 'מה הכי חשוב לך לצאת איתו מהפגישה?']
  ]}
];
// מפתחות של פרטי קשר — מוצגים בסעיף "פרטי קשר" ולא כתשובות
var DIAG_CONTACT_KEYS = ['_firstName', '_lastName', '_businessName', '_phone', '_email', 'name', 'lastName', 'phone', 'email'];

/* ===================== נקודת הכניסה מ-doPost ===================== */

function diagHandleComplete_(data, opts) {
  opts = opts || {};
  var ts = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });
  var phone = String(data.phone || '').replace(/\D/g, '');
  try {
    var report = diagParse_(data.diagReport);
    var builtHere = false;
    if (!Array.isArray(report) || !report.length) {
      report = diagReportFromAnswers_(data);
      builtHere = true;
    }
    var hasAnswers = report.some(function (s) { return s.title !== 'פרטי קשר' && s.items && s.items.length; });
    if (!hasAnswers) throw new Error('השאלון הגיע בלי תשובות (diagAnswers ריק)');

    diagSendPdf_(data, report, phone, ts);

    if (builtHere && !opts.manual) {
      diagAlert_('diagReport חסר: המייל נשלח בכל זאת, אבל הקוד באתר לא שולח את הדוח', data, null);
    }
  } catch (err) {
    Logger.log('diagHandleComplete_ error: ' + (err && err.stack || err));
    diagAlert_('יצירת ה-PDF או שליחת המייל נכשלו', data, err);
  }
}

/* ===================== בניית דוח מהתשובות הגולמיות ===================== */

function diagReportFromAnswers_(data) {
  var ans = diagParse_(data.diagAnswers) || {};
  if (typeof ans !== 'object' || Array.isArray(ans)) ans = {};
  var report = [];

  var name = [ans._firstName || ans.name || data.firstName, ans._lastName || ans.lastName || data.lastName]
    .map(diagClean_).filter(String).join(' ');
  var contact = [
    { q: 'שם', a: name },
    { q: 'שם העסק', a: diagClean_(ans._businessName || data.businessName) },
    { q: 'טלפון', a: diagClean_(ans._phone || ans.phone || data.phone) },
    { q: 'אימייל', a: diagClean_(ans._email || ans.email || data.email) }
  ].filter(function (it) { return it.a; });
  if (contact.length) report.push({ title: 'פרטי קשר', items: contact });

  var used = {};
  DIAG_CONTACT_KEYS.forEach(function (k) { used[k] = true; });

  DIAG_SECTIONS.forEach(function (sec) {
    var items = [];
    sec.fields.forEach(function (f) {
      used[f[0]] = true;
      var a = f[0] === '_files' ? diagFilesText_(ans._files) : diagFmt_(ans[f[0]]);
      if (a) items.push({ q: f[1], a: a });
    });
    if (items.length) report.push({ title: sec.title, items: items });
  });

  // כל מפתח שלא מוכר (למשל השאלון הישן של הפאנל) — לא מוותרים עליו
  var extra = [];
  Object.keys(ans).forEach(function (k) {
    if (used[k]) return;
    var a = k === '_files' ? diagFilesText_(ans[k]) : diagFmt_(ans[k]);
    if (a) extra.push({ q: k, a: a });
  });
  if (extra.length) report.push({ title: 'תשובות נוספות', items: extra });

  return report;
}

function diagFilesText_(files) {
  if (!Array.isArray(files) || !files.length) return '';
  return files.map(function (f) { return f && f.name ? f.name : ''; }).filter(String).join(', ')
    + ' (הקבצים עצמם לא נשמרים, צריך לבקש אותם מהלקוח)';
}

function diagFmt_(v) {
  if (v == null || v === '' || v === false) return '';
  if (Array.isArray(v)) {
    return v.map(function (x) {
      if (x && typeof x === 'object' && x.name) return diagClean_(x.name) + (x.price ? ', ' + x.price + ' ₪' : '');
      return diagFmt_(x);
    }).filter(String).join('; ');
  }
  if (typeof v === 'object') {
    if (v.none === true) return 'לא מכיר';
    if (v.unsure === true) return 'לא בטוח';
    if (Array.isArray(v.items)) return diagFmt_(v.items);
    if (v.value != null) return diagClean_(v.value);
    return Object.keys(v).map(function (k) {
      var s = diagFmt_(v[k]);
      return s && v[k] !== true ? k + ': ' + s : '';
    }).filter(String).join(', ');
  }
  if (v === true) return 'כן';
  return diagClean_(v);
}

/* ===================== PDF + מייל (אותו עיצוב כמו sendDiagPdf) ===================== */

function diagSendPdf_(data, report, phone, ts) {
  var name = [data.firstName, data.lastName].map(diagClean_).filter(String).join(' ')
    || diagClean_(data.phone) || phone;

  var html = '<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8">'
    + '<style>'
    + 'body{font-family:Arial,Helvetica,sans-serif;direction:rtl;margin:0;padding:0;color:#163650;}'
    + '.hdr{background:#163650;padding:28px 32px;}'
    + '.hdr h1{color:#fff;font-size:22px;margin:0;}'
    + '.hdr p{color:rgba(255,255,255,0.7);font-size:13px;margin:4px 0 0;}'
    + '.bar{height:4px;background:#ea7e30;}'
    + '.body{padding:28px 32px;}'
    + '.section{margin-bottom:24px;}'
    + '.section h2{font-size:16px;color:#163650;border-bottom:2px solid #ea7e30;padding-bottom:6px;margin:0 0 12px;}'
    + '.row{display:flex;padding:8px 0;border-bottom:1px solid #f0f0f0;}'
    + '.row-q{font-size:13px;color:#888;min-width:140px;flex-shrink:0;}'
    + '.row-a{font-size:14px;color:#163650;font-weight:600;}'
    + '.footer{background:#f9f9f9;padding:16px 32px;font-size:11px;color:#999;text-align:center;border-top:1px solid #eee;}'
    + '</style></head><body>';
  html += '<div class="hdr"><h1>שאלון דיאגנוסטי — ' + diagEsc_(name) + '</h1>';
  html += '<p>' + diagEsc_(ts) + ' &bull; Dollar Express &bull; אקדמיית הדולר</p></div>';
  html += '<div class="bar"></div><div class="body">';
  report.forEach(function (sec) {
    html += '<div class="section"><h2>' + diagEsc_(sec.title) + '</h2>';
    (sec.items || []).forEach(function (it) {
      html += '<div class="row"><div class="row-q">' + diagEsc_(it.q) + '</div><div class="row-a">'
        + diagEsc_(it.a).replace(/\n/g, '<br>') + '</div></div>';
    });
    html += '</div>';
  });
  html += '</div><div class="footer">דוח אוטומטי — אקדמיית הדולר &bull; Dollar Express &bull; ' + diagEsc_(ts) + '</div>';
  html += '</body></html>';

  var doc = DocumentApp.create('diagnostic-' + (phone || 'no-phone') + '-' + Date.now());
  try {
    var body = doc.getBody();
    body.clear();
    report.forEach(function (sec) {
      var heading = body.appendParagraph(String(sec.title));
      heading.setHeading(DocumentApp.ParagraphHeading.HEADING2);
      heading.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
      heading.setAttributes({ FONT_SIZE: 16, BOLD: true, FOREGROUND_COLOR: '#163650' });
      (sec.items || []).forEach(function (it) {
        var q = String(it.q), a = String(it.a);
        var p = body.appendParagraph(q + ':  ' + a);
        p.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
        var text = p.editAsText();
        text.setFontSize(12);
        text.setForegroundColor(0, q.length, '#888888');
        text.setBold(0, q.length, false);
        text.setForegroundColor(q.length + 3, q.length + 2 + a.length, '#163650');
        text.setBold(q.length + 3, q.length + 2 + a.length, true);
      });
      body.appendParagraph('');
    });
    var footer = body.appendParagraph('Dollar Express — אקדמיית הדולר — ' + ts);
    footer.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    footer.editAsText().setFontSize(9).setForegroundColor('#999999');
    doc.saveAndClose();

    var pdf = DriveApp.getFileById(doc.getId()).getAs('application/pdf');
    pdf.setName('diagnostic-' + name + '.pdf');

    MailApp.sendEmail({
      to: DIAG_RECIPIENTS.join(','),
      subject: 'שאלון דיאגנוסטי — ' + name + ' — Dollar Express',
      htmlBody: html,
      attachments: [pdf],
      name: 'Dollar Express'
    });
    Logger.log('Diagnostic PDF sent: ' + name);
  } finally {
    try { DriveApp.getFileById(doc.getId()).setTrashed(true); } catch (e) {}
  }
}

/* ===================== התראות ===================== */

function diagAlert_(reason, data, err) {
  try {
    var who = [data.firstName, data.lastName].map(diagClean_).filter(String).join(' ') || diagClean_(data.phone) || 'לא ידוע';
    var answers = data.diagAnswers;
    if (typeof answers !== 'string') answers = JSON.stringify(answers || {}, null, 2);
    var html = '<div dir="rtl" style="font-family:Arial,sans-serif;color:#163650">'
      + '<h2 style="color:#c0392b;margin:0 0 8px">⚠ שאלון דיאגנוסטי — ' + diagEsc_(reason) + '</h2>'
      + '<p><b>לקוח:</b> ' + diagEsc_(who) + ' &bull; <b>טלפון:</b> ' + diagEsc_(data.phone || '') + ' &bull; <b>מקור:</b> ' + diagEsc_(data.source || '') + '</p>'
      + (err ? '<p><b>שגיאה:</b> ' + diagEsc_(String(err && err.message || err)) + '</p>' : '')
      + '<p>התשובות המלאות שמורות גם בגיליון, בטאב אירועים.</p>'
      + '<pre dir="ltr" style="white-space:pre-wrap;background:#f6f6f6;padding:12px;font-size:12px">' + diagEsc_(answers) + '</pre>'
      + '</div>';
    MailApp.sendEmail({ to: DIAG_ALERT_TO, subject: '⚠ שאלון דיאגנוסטי — ' + who + ' — ' + reason, htmlBody: html, name: 'Dollar Express' });
  } catch (e) {
    Logger.log('diagAlert_ failed: ' + e);
  }
}

/* ===================== שליחה חוזרת ידנית ===================== */

// משנים את ROW למספר השורה בטאב "אירועים" ומריצים מהעורך.
// 379 = טל תורג׳מן (23.11.2026), השאלון שלא נשלח.
function diagResendRow() {
  var ROW = 379;
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('אירועים');
  var row = sh.getRange(ROW, 1, 1, 5).getValues()[0];
  if (row[3] !== 'diagnostic-complete') throw new Error('שורה ' + ROW + ' היא "' + row[3] + '", לא diagnostic-complete');
  diagHandleComplete_(JSON.parse(row[4]), { manual: true });
}

/* ===================== עזרים ===================== */

function diagParse_(v) {
  if (typeof v === 'string') { try { return JSON.parse(v); } catch (e) { return null; } }
  return v || null;
}
function diagClean_(v) { return v == null ? '' : String(v).trim(); }
function diagEsc_(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
