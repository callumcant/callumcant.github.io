# Guaranteed weekly snapshots (for IT)

## What already works, and why this is still worth doing

The app captures a weekly snapshot on its own: when someone opens it and the
newest snapshot is a week old, it silently writes a new one. Nobody clicks
anything, and no setup was needed.

The gap is that **it only runs when someone opens the site**. A quiet week —
half term, a holiday, everyone in meetings — produces no snapshot, and that
week's numbers are gone for good. Snapshots cannot be reconstructed after the
fact: the source tables only ever hold current values.

This document covers making capture happen regardless of whether anyone opens
the site. It needs someone with Microsoft 365 admin rights.

## Recommended: a Power Automate scheduled flow

This keeps everything inside your own Microsoft 365 tenant — no credentials
stored outside it, no third-party service, and it uses the same workbook the
app already writes to.

The flow does exactly what the app does: read the current membership figures,
and append one row per school to the `Snapshots` table, stamped with today's
date.

**Outline:**

1. In [make.powerautomate.com](https://make.powerautomate.com), create a new
   **Scheduled cloud flow**.
2. Set it to repeat **every 1 week** — pick a quiet time, e.g. Sunday 03:00.
3. Add **Excel Online (Business) → List rows present in a table**, pointing at
   the workbook in SharePoint and the `SourceNEUDashboard` table.
4. Add **Excel Online (Business) → List rows present in a table** again for
   `WCtoURN` (the workplace-code → URN mapping) and `SourceWorkforce`.
5. Loop over the membership rows, and for each one add **Excel Online
   (Business) → Add a row into a table** against `Snapshots`, mapping:

   | Snapshots column | Source |
   |---|---|
   | Snapshot date | `utcNow('yyyy-MM-dd')` |
   | URN | matched from `WCtoURN` on workplace code |
   | Overall members | `SourceNEUDashboard` → Overall members |
   | Rep count | `SourceNEUDashboard` → Rep count |
   | Workforce headcount | `SourceWorkforce` → Workforce headcount |
   | Voted | `SourceNEUDashboard` → Voted |
   | Volunteers | `SourceNEUDashboard` → Volunteers |
   | WP conversations | `SourceNEUDashboard` → WP conversations |

**Worth knowing before you start:**

- Row-by-row writes are slow in Power Automate. At ~530 schools this is fine
  as an overnight job; if this grows to all-London (~3,000 schools) it is worth
  doing the work in an **Office Script** instead and having the flow call it
  with a single **Run script** action — one call rather than thousands.
- **Confirm your licence covers what you need.** The Excel Online (Business)
  connector and scheduled triggers are standard rather than premium
  connectors, but plan entitlements change and vary by tenant — check before
  committing to this approach rather than taking this document's word for it.
- The app and the flow both writing in the same week is harmless: the app
  de-duplicates on `(snapshot date, URN)` when reading, so at worst one
  redundant set of rows sits in the table.
- **Never edit or delete rows in `Snapshots`.** It is append-only by design and
  is the only record of how things looked at the time.

## Alternative: GitHub Actions with workload identity federation

If you'd rather the schedule live alongside the code, a GitHub Actions
workflow on a weekly `cron` can do the same job by calling Microsoft Graph
directly.

The reason to mention it specifically: **it can authenticate without storing a
secret anywhere.** Entra's workload identity federation lets the Action prove
its identity to Microsoft using a short-lived GitHub-issued token, so there is
no client secret sitting in the repository's settings to leak or rotate.

If you go this route, grant the app registration the **`Sites.Selected`**
application permission rather than `Files.ReadWrite.All`. `Sites.Selected`
grants access only to the specific SharePoint site an admin explicitly names,
so a compromise of the workflow cannot reach the rest of the tenant's files.

The trade-off against Power Automate is that this puts an automated,
credentialed writer outside your Microsoft 365 boundary — which is a
governance question for your organisation, not a technical one.

## How to tell whether it's working

The dashboard shows the number of snapshots and their date range under "Change
over time". If capture stops, that range stops moving, and after six weeks
without a snapshot the dashboard shows a warning banner.
