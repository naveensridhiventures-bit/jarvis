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
