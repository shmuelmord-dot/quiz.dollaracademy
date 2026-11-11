var HEADERS = ['טלפון','שם פרטי','שם משפחה','אימייל','סוג עסק','מוטיבציה','מחזור','תיאור העסק','ציון פוטנציאל','שלב אחרון','שילם','תאריך כניסה','עדכון אחרון','utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid','referrer','gclid','תשובות דיאגנוסטי'];

var FIELD_MAP = {
  'טלפון':'phone', 'שם פרטי':'firstName', 'שם משפחה':'lastName', 'אימייל':'email',
  'סוג עסק':'businessType', 'מוטיבציה':'motivation', 'מחזור':'revenue',
  'תיאור העסק':'businessDesc', 'ציון פוטנציאל':'score', 'שלב אחרון':'stage', 'שילם':'paid',
  'utm_source':'utm_source', 'utm_medium':'utm_medium', 'utm_campaign':'utm_campaign',
  'utm_content':'utm_content', 'utm_term':'utm_term', 'fbclid':'fbclid',
  'referrer':'referrer', 'gclid':'gclid'
};

var STAGE_ORDER = { 'quiz-partial':0, 'quiz':1, 'potential':2, 'vsl':3, 'diagnostic':4, 'paid':5, 'manual-entry':4 };

function parseBody(e) {
  if (e.postData && e.postData.contents) {
    try { return JSON.parse(e.postData.contents); } catch(_) {}
  }
  return e.parameter || {};
}

function doPost(e) {
  try {
    var data = parseBody(e);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var leads = ss.getSheetByName('לידים');
    var events = ss.getSheetByName('אירועים');
    var ts = new Date().toLocaleString('he-IL', {timeZone:'Asia/Jerusalem'});

    var phone = (data.phone || '').replace(/\D/g, '');
    if (!phone) return resp({error:'no phone'});

    events.appendRow([ts, phone, data.stage || '', data.event || '', JSON.stringify(data)]);

    var phones = leads.getRange('A2:A').getValues().flat();
    var row = -1;
    for (var i = 0; i < phones.length; i++) {
      if (String(phones[i]).replace(/\D/g, '') === phone) { row = i + 2; break; }
    }

    if (row === -1) {
      var newRow = HEADERS.map(function(h) {
        if (h === 'טלפון') return fmtPhone(phone);
        if (h === 'תאריך כניסה' || h === 'עדכון אחרון') return ts;
        if (h === 'שלב אחרון') return data.stage || 'quiz';
        if (h === 'שילם') return data.stage === 'paid' ? 'כן' : '';
        if (h === 'תשובות דיאגנוסטי') {
          var da = data.diagAnswers;
          if (typeof da === 'string') { try { da = JSON.parse(da); } catch(_) {} }
          return da ? JSON.stringify(da) : '';
        }
        return data[FIELD_MAP[h]] || '';
      });
      leads.appendRow(newRow);
    } else {
      var range = leads.getRange(row, 1, 1, HEADERS.length);
      var ex = range.getValues()[0];

      HEADERS.forEach(function(h, i) {
        var key = FIELD_MAP[h];
        if (!key) return;
        if (h === 'שלב אחרון') {
          if ((STAGE_ORDER[data.stage] || 0) > (STAGE_ORDER[ex[i]] || 0)) ex[i] = data.stage;
        } else if (h === 'טלפון' || h === 'תאריך כניסה') {
          // don't overwrite
        } else if (data[key] && !ex[i]) {
          ex[i] = data[key];
        } else if (data[key] && (h === 'שם פרטי' || h === 'שם משפחה' || h === 'אימייל' || h === 'ציון פוטנציאל')) {
          ex[i] = data[key];
        }
      });

      if (data.stage === 'paid') ex[10] = 'כן';
      var da2 = data.diagAnswers;
      if (typeof da2 === 'string') { try { da2 = JSON.parse(da2); } catch(_) {} }
      if (da2) ex[21] = JSON.stringify(da2);
      ex[12] = ts;

      range.setValues([ex]);
    }

    if (data.event === 'diagnostic-complete' && data.diagReport) {
      try { sendDiagPdf(data, phone, ts); } catch(pdfErr) {
        Logger.log('PDF error: ' + pdfErr.message);
      }
    }

    return resp({status:'ok'});
  } catch(err) {
    return resp({error: err.message});
  }
}

function fmtPhone(d) { return d.length === 10 ? d.slice(0,3)+'-'+d.slice(3) : d; }

function resp(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function sendDiagPdf(data, phone, ts) {
  var report;
  if (typeof data.diagReport === 'string') {
    try { report = JSON.parse(data.diagReport); } catch(_) { return; }
  } else {
    report = data.diagReport;
  }
  if (!report || !report.length) return;

  var name = (data.firstName || '') + ' ' + (data.lastName || '');
  name = name.trim() || fmtPhone(phone);

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

  html += '<div class="hdr"><h1>שאלון דיאגנוסטי — ' + name + '</h1>';
  html += '<p>' + ts + ' &bull; Dollar Express &bull; אקדמיית הדולר</p></div>';
  html += '<div class="bar"></div>';
  html += '<div class="body">';

  for (var s = 0; s < report.length; s++) {
    var sec = report[s];
    html += '<div class="section"><h2>' + sec.title + '</h2>';
    for (var i = 0; i < sec.items.length; i++) {
      var it = sec.items[i];
      html += '<div class="row"><div class="row-q">' + it.q + '</div><div class="row-a">' + it.a + '</div></div>';
    }
    html += '</div>';
  }

  html += '</div>';
  html += '<div class="footer">דוח אוטומטי — אקדמיית הדולר &bull; Dollar Express &bull; ' + ts + '</div>';
  html += '</body></html>';

  var doc = DocumentApp.create('diagnostic-' + phone + '-' + Date.now());
  var body = doc.getBody();
  body.clear();

  for (var s = 0; s < report.length; s++) {
    var sec = report[s];
    var heading = body.appendParagraph(sec.title);
    heading.setHeading(DocumentApp.ParagraphHeading.HEADING2);
    heading.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
    heading.setAttributes({FONT_SIZE: 16, BOLD: true, FOREGROUND_COLOR: '#163650'});

    for (var i = 0; i < sec.items.length; i++) {
      var it = sec.items[i];
      var p = body.appendParagraph(it.q + ':  ' + it.a);
      p.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
      var text = p.editAsText();
      text.setFontSize(12);
      text.setForegroundColor(0, it.q.length, '#888888');
      text.setBold(0, it.q.length, false);
      text.setForegroundColor(it.q.length + 3, it.q.length + 3 + it.a.length, '#163650');
      text.setBold(it.q.length + 3, it.q.length + 3 + it.a.length, true);
    }
    body.appendParagraph('');
  }

  var footer = body.appendParagraph('Dollar Express — אקדמיית הדולר — ' + ts);
  footer.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  footer.editAsText().setFontSize(9).setForegroundColor('#999999');

  doc.saveAndClose();

  var pdf = DriveApp.getFileById(doc.getId()).getAs('application/pdf');
  pdf.setName('diagnostic-' + name + '.pdf');

  var subject = 'שאלון דיאגנוסטי — ' + name + ' — Dollar Express';
  var emailHtml = html;

  var recipients = ['info@dollaracademy.co.il', 'gill.andreyev@gmail.com'];
  for (var r = 0; r < recipients.length; r++) {
    MailApp.sendEmail({
      to: recipients[r],
      subject: subject,
      htmlBody: emailHtml,
      attachments: [pdf],
      name: 'Dollar Express'
    });
  }

  DriveApp.getFileById(doc.getId()).setTrashed(true);
}
