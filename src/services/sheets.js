// This talks to a Google Apps Script "Web App" deployed on top of a Google Sheet.
// Setup steps are in /backend/APPS_SCRIPT_SETUP.md — it's free, no server, no billing.

async function callSheetsApi(scriptUrl, payload) {
  const res = await fetch(scriptUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' }, // avoids CORS preflight on Apps Script
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error(`sheets_error_${res.status}`)
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data
}

export async function addTask(scriptUrl, task) {
  return callSheetsApi(scriptUrl, { action: 'add_task', task })
}

export async function listTasks(scriptUrl) {
  const data = await callSheetsApi(scriptUrl, { action: 'list_tasks' })
  return data.tasks || []
}

export async function completeTask(scriptUrl, title) {
  return callSheetsApi(scriptUrl, { action: 'complete_task', task: { title } })
}

export async function deleteTask(scriptUrl, title) {
  return callSheetsApi(scriptUrl, { action: 'delete_task', task: { title } })
}

// originalTitle identifies the row to update; the rest of `task` is the new values.
// Falls back to delete+add on the backend if an older Apps Script deploy doesn't
// support 'update_task' yet (see APPS_SCRIPT_SETUP.md — redeploy to get this).
export async function updateTask(scriptUrl, originalTitle, task) {
  try {
    return await callSheetsApi(scriptUrl, { action: 'update_task', originalTitle, task })
  } catch (e) {
    if (String(e.message || e).includes('unknown_action')) {
      await callSheetsApi(scriptUrl, { action: 'delete_task', task: { title: originalTitle } })
      return callSheetsApi(scriptUrl, { action: 'add_task', task })
    }
    throw e
  }
}
