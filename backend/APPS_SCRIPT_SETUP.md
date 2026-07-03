# Google Sheets backend — setup (5 minutes, free forever)

1. Go to [sheets.google.com](https://sheets.google.com) and create a new blank sheet. Name it e.g. "ARIA Tasks".
2. In the sheet, go to **Extensions → Apps Script**.
3. Delete the placeholder code and paste in the contents of `Code.gs` from this folder.
4. Click **Save** (disk icon), name the project "ARIA Backend".
5. Click **Deploy → New deployment**.
6. Click the gear icon next to "Select type" → choose **Web app**.
7. Fill in:
   - Description: `ARIA API`
   - Execute as: **Me**
   - Who has access: **Anyone** (this is what lets your phone call it without a login flow — it's still private in the sense that nobody can find the URL unless you share it, but don't post the URL publicly)
8. Click **Deploy**. Google will ask you to authorize — click through (it'll warn "Google hasn't verified this app" since it's your own script; click **Advanced → Go to ARIA Backend (unsafe)**, this is normal for personal scripts).
9. Copy the **Web app URL** it gives you — looks like `https://script.google.com/macros/s/XXXXXXX/exec`.
10. Paste that URL into the ARIA app's Settings panel (gear icon) under "Sheets Script URL".

That's it — every task ARIA adds will now appear as a row in your Google Sheet, and you can read/edit/filter it manually any time too, exactly like a normal spreadsheet.

## Updating the script later
If you edit `Code.gs` again, you must do **Deploy → Manage deployments → edit (pencil) → New version → Deploy** for changes to take effect. Just saving the script does not update the live web app.

## Cost
₹0. Apps Script web apps on your personal Google account have no billing tier at all for this kind of usage — it's part of free Google Workspace personal tooling.
