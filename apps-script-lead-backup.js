var HEADERS = ['טלפון','שם','אימייל','סוג עסק','מוטיבציה','מחזור','תיאור העסק','ציון פוטנציאל','שלב אחרון','שילם','תאריך כניסה','עדכון אחרון','utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid','referrer','gclid','תשובות דיאגנוסטי'];

var FIELD_MAP = {
  'טלפון':'phone', 'שם':'firstName', 'אימייל':'email', 'סוג עסק':'businessType',
  'מוטיבציה':'motivation', 'מחזור':'revenue', 'תיאור העסק':'businessDesc',
  'ציון פוטנציאל':'score', 'שלב אחרון':'stage', 'שילם':'paid',
  'utm_source':'utm_source', 'utm_medium':'utm_medium', 'utm_campaign':'utm_campaign',
  'utm_content':'utm_content', 'utm_term':'utm_term', 'fbclid':'fbclid',
  'referrer':'referrer', 'gclid':'gclid'
};

var STAGE_ORDER = { 'quiz-partial':0, 'quiz':1, 'potential':2, 'vsl':3, 'diagnostic':4, 'paid':5 };

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
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
        if (h === 'תשובות דיאגנוסטי') return data.diagAnswers ? JSON.stringify(data.diagAnswers) : '';
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
        } else if (data[key] && (h === 'שם' || h === 'אימייל' || h === 'ציון פוטנציאל')) {
          ex[i] = data[key];
        }
      });

      if (data.stage === 'paid') ex[9] = 'כן';
      if (data.diagAnswers) ex[20] = JSON.stringify(data.diagAnswers);
      ex[11] = ts;

      range.setValues([ex]);
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
