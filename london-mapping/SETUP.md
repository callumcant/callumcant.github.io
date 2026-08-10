# Going live

The site works right now on sample data — open it and click around, no setup
needed. This page covers switching it to your real workbook.

**There are three things to do**, and only one of them is yours:

1. Upload the workbook to SharePoint and paste in your real data — **you**
2. Register the site as an app in Entra ID — **your IT/M365 admin**
3. Fill in three values in one file — **you, 2 minutes**

Then it's live. There is no flag to flip afterwards: filling in the three
values *is* going live.

Check progress at any time on the site's own **Setup** page (in the left-hand
menu). It tells you which values are still missing and, once connected,
checks every table in the workbook and names anything that's wrong.

---

## 1. The workbook

Use `workbook-template/London_Project_Mapping_template.xlsx` from this
repository — **not** the original spreadsheet. The original was built in Google
Sheets and its formulas don't survive being opened as a live Excel file, so it
won't recalculate correctly on OneDrive. The template holds the same data as
plain Excel Tables, which is what the app reads and writes.

1. Upload it to the shared Microsoft 365 / SharePoint site your team already
   uses (a Teams channel's Files tab is the same thing).
2. Share it with everyone who'll use the app — edit access for anyone who
   needs to add disputes, notes, meetings or reps.
3. Delete the `EXAMPLE` rows and paste in your real data:
   - `SourceGIAS` — your DfE GIAS export
   - `SourceWorkforce` — your DfE School Workforce Census export
   - `SourceNEUDashboard` — your NEU membership/organising export
   - `WCtoURN` — workplace code → URN mapping
   - `BranchFacts` — tick which boroughs are project branches
   - `MatFacts` — one row per MAT you're tracking

**Keep the columns in the order they're in.** The app maps columns by position,
so inserting or reordering one shifts everything after it. Adding data below
the last row is fine — that's what Excel Tables are for.

**Never edit or delete rows in `Snapshots`.** It's an append-only record of how
things looked at the time, written automatically, and it cannot be
reconstructed if lost.

---

## 2. What IT needs to do

*This section can be forwarded as-is.*

> We need a Microsoft Entra ID app registration so a static internal web app
> can read and write one Excel workbook in our SharePoint, signed in as the
> person using it.
>
> 1. In [entra.microsoft.com](https://entra.microsoft.com) → **Identity →
>    Applications → App registrations → New registration**.
> 2. Name: `NEU London Project Mapping`.
> 3. **Supported account types:** *Accounts in this organizational directory
>    only* (single tenant). This is what restricts access to our own staff.
> 4. **Redirect URI:** platform **Single-page application (SPA)**, value:
>    `https://callumcant.github.io/london-mapping/`
>    (must match exactly, including the trailing slash)
> 5. **API permissions → Microsoft Graph → Delegated permissions**, add:
>    - `Files.ReadWrite.All`
>    - `User.Read`
>
>    then **Grant admin consent**.
> 6. **No client secret is needed** — single-page apps use PKCE, so there is no
>    credential to store or rotate.
> 7. Send back the **Application (client) ID** and **Directory (tenant) ID**
>    from the registration's Overview page.
>
> These are delegated permissions: the app can only ever reach files the
> signed-in person could already open themselves. It cannot act on its own or
> access anything when nobody is signed in.

**If sign-in works but the workbook returns a 403:** some tenants restrict the
Graph endpoint used to resolve a SharePoint link. Ask IT to add the delegated
permission `Sites.ReadWrite.All` alongside the two above and re-consent. It's
deliberately not requested up front because it's much broader than needed.

---

## 3. The three values

Open `london-mapping/js/config.js`. You can do this on github.com — open the
file, click the pencil icon, edit, and commit at the bottom. No software to
install, no git knowledge needed. The site rebuilds within about a minute.

```js
export const CONFIG = {
  clientId: "…",      // from IT, step 2
  tenantId: "…",      // from IT, step 2
  workbookUrl: "…",   // see below
  ...
};
```

For `workbookUrl`: open the workbook in SharePoint or Teams in a browser and
copy the address from the address bar. Any normal link to the file works — the
app resolves it to the actual file itself, so there are no IDs to hunt down.

Then open the site's **Setup** page. It should show all three as Set, name the
workbook it connected to, and list every table as OK.

---

## Keeping it running

**Refreshing source data** stays a manual paste into the workbook, exactly as
before — the app reads whatever is currently in those tables, so nothing needs
redeploying when the data changes.

**Snapshots** are captured automatically: the first person to open the site in
a given week triggers one silently. That covers normal use, but a quiet week
produces no snapshot, and it can't be backfilled later. To make capture happen
regardless, see `docs/scheduled-snapshot.md`.

**The map** needs postcodes turned into coordinates once. Open the Map page and
click "Locate missing schools" — it looks up only schools that don't have
coordinates yet and caches the results in the workbook, so it's a one-off (plus
a quick top-up whenever schools are added).
