/**
 * team-api.gs — API קריאה בלבד לדף הצוות
 * ─────────────────────────────────────────
 * פרויקט Apps Script נפרד. לא נוגע בסקריפט הגיבוי.
 * רק קורא מהגיליון ומחזיר JSON של לידים שסיימו דיאגנוסטי.
 *
 * התקנה:
 *   1. script.google.com ▸ New project ▸ שם: "Dollar Express Team API"
 *   2. הדבק את כל הקוד הזה ב-Code.gs (מחק את myFunction)
 *   3. Deploy ▸ New deployment ▸ Web app
 *      - Execute as: Me
 *      - Who has access: Anyone
 *   4. העתק את ה-URL ושים אותו בדף הצוות (CONFIG בתחילת lp/team/index.html)
 *   5. הרץ פעם אחת testRead ← אשר הרשאות
 */

var SHEET_ID = '1RO6KwxQeeAr7JAbJpgLik2lF7G3kBeHg2d3IeCQE6Pg';

function doGet(e) {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName('לידים');
    var data = sheet.getDataRange().getValues();
    var headers = data[0];

    var leads = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var diagCol = headers.indexOf('תשובות דיאגנוסטי');
      var stageCol = headers.indexOf('שלב אחרון');

      // Only return leads that have diagnostic answers OR reached diagnostic/paid stage
      var hasDiag = diagCol >= 0 && row[diagCol] && String(row[diagCol]).trim();
      var stage = stageCol >= 0 ? String(row[stageCol]).trim() : '';
      if (!hasDiag && stage !== 'diagnostic' && stage !== 'paid') continue;

      var lead = {};
      for (var j = 0; j < headers.length; j++) {
        var val = row[j];
        if (val instanceof Date) {
          lead[headers[j]] = Utilities.formatDate(val, 'Asia/Jerusalem', 'dd.MM.yyyy HH:mm');
        } else {
          lead[headers[j]] = val != null ? String(val) : '';
        }
      }

      // Parse diagnostic JSON
      if (hasDiag) {
        try { lead['_diag'] = JSON.parse(row[diagCol]); } catch(ex) {}
      }

      leads.push(lead);
    }

    // Sort: newest first (by last update)
    var updateCol = headers.indexOf('עדכון אחרון');
    if (updateCol >= 0) {
      leads.sort(function(a, b) {
        return (b['עדכון אחרון'] || '').localeCompare(a['עדכון אחרון'] || '');
      });
    }

    var out = JSON.stringify({ ok: true, count: leads.length, leads: leads });
    return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    var errOut = JSON.stringify({ ok: false, error: err.message });
    return ContentService.createTextOutput(errOut).setMimeType(ContentService.MimeType.JSON);
  }
}

function testRead() {
  var result = doGet();
  var parsed = JSON.parse(result.getContent());
  Logger.log('Found ' + parsed.count + ' leads with diagnostic data');
  if (parsed.leads && parsed.leads.length > 0) {
    Logger.log('First lead: ' + parsed.leads[0]['שם פרטי'] + ' ' + parsed.leads[0]['שם משפחה']);
  }
}
