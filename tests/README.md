# Checks for the Damper Inspection app

Small browser checks (Playwright). Each prints GREEN or RED. None of them touch a real Airtable: every Airtable request is answered with made-up data inside the check.

1. From the repo folder, start a local server: `python3 -m http.server 8765`
2. `node tests/make-pdfs.js` (makes two tiny test PDFs, a.pdf and b.pdf, next to these files)
3. Run a check:
   - `node tests/markup-search.js` : Markup's page search looks in the PDF that is open now, not the one opened before.
   - `node tests/damper-save.js clear` : emptying a field on a damper page empties it in Airtable.
   - `node tests/damper-save.js stale` : closing a damper page sends only what was changed, so the office's newer edits are not overwritten.
   - `node tests/damper-save.js unpick` : taking one name off a pick-list sends the shorter list.
   - `node tests/damper-save.js pass`, `paste`, `cell` : the ✓ Pass button, copy/paste and a table cell edit send the right value and show it on the phone straight away.
   - `node tests/damper-save.js new` : a new damper is created with what was typed.
   - `node tests/airtable-read.js` : a 250-damper job read 100 at a time, with one "slow down" reply, shows every damper.
   - `node tests/job-screens.js` : building and floor filters, linked notes shown by name, the missing-info box and the result pill.
   - `node tests/markup-engine.js [url]` : puts labels on a page, tidies them, exports a picture and a PDF, and prints a fingerprint of the picture (the same fingerprint before and after a change = the same drawing).
   - `node tests/location-pic.js` : Location Pic "Mark on map" draws the label and adds the picture (saves location-pic.png to look at).
   - `node tests/save-cancelled.js` : when the phone cancels a save (out of space), the app shows an error instead of hanging.
