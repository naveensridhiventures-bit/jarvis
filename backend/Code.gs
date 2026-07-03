// ============================================================
// ARIA backend — paste this into script.google.com (bound to your Sheet)
// Turns a Google Sheet into a free JSON API. No server, no billing, no login wall.
// See APPS_SCRIPT_SETUP.md for step-by-step deploy instructions.
// ============================================================

const SHEET_NAME = 'Tasks';

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['Title', 'Date', 'Time', 'Notes', 'Status', 'CreatedAt']);
  }
  return sheet;
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents || '{}');
  const action = body.action;
  let result;

  try {
    if (action === 'add_task') result = addTask_(body.task || {});
    else if (action === 'list_tasks') result = { tasks: listTasks_() };
    else if (action === 'complete_task') result = completeTask_(body.task || {});
    else if (action === 'delete_task') result = deleteTask_(body.task || {});
    else result = { error: 'unknown_action' };
  } catch (err) {
    result = { error: String(err) };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function addTask_(task) {
  const sheet = getSheet_();
  sheet.appendRow([
    task.title || '(untitled)',
    task.date || '',
    task.time || '',
    task.notes || '',
    'pending',
    new Date().toISOString()
  ]);
  return { ok: true };
}

function listTasks_() {
  const sheet = getSheet_();
  const rows = sheet.getDataRange().getValues();
  const [header, ...data] = rows;
  return data
    .filter((r) => r[0])
    .map((r) => ({
      title: r[0],
      date: r[1],
      time: r[2],
      notes: r[3],
      status: r[4]
    }));
}

function completeTask_(task) {
  const sheet = getSheet_();
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === task.title) {
      sheet.getRange(i + 1, 5).setValue('done');
      return { ok: true };
    }
  }
  return { error: 'task_not_found' };
}

function deleteTask_(task) {
  const sheet = getSheet_();
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === task.title) {
      sheet.deleteRow(i + 1);
      return { ok: true };
    }
  }
  return { error: 'task_not_found' };
}
