# Setup: connecting the app to your real OneDrive/SharePoint data

The app works today in **preview mode** against fake sample data — no setup
needed, just open `index.html`. This doc covers the one-time steps to switch
it over to your real workbook, most of which need a Microsoft 365 admin
(someone with rights to register an app in Entra ID / Azure AD).

Nothing in this repo is secret. The app is a static site; all real data
stays in your OneDrive/SharePoint file and only ever reaches the signed-in
user's own browser — the code published here contains no credentials.

## 1. Upload the workbook

Use the template at `workbook-template/London_Project_Mapping_template.xlsx`
(built from this repo — see that folder's own notes) as the starting point,
**not** the original spreadsheet — the original's formulas won't recalculate
correctly once opened as a live Excel file (they were written in Google
Sheets and don't survive the round-trip). The template has the same data in
plain Excel Tables the app can read/write directly.

1. Upload the template to the shared Microsoft 365/SharePoint Team site the
   organising team already uses (a Teams channel's Files tab is the same
   thing as a SharePoint document library).
2. Share it with everyone who should be able to use the app, with edit
   access for anyone submitting dispute-tracker/field-notes updates.
3. Re-paste your live DfE/NEU export data into the `SourceGIAS`,
   `SourceWorkforce`, `WCtoURN`, and `SourceNEUDashboard` tables — same
   manual process as before, just into the new tables instead of the old
   tabs.

## 2. Register the app in Entra ID (needs tenant admin)

1. Go to [entra.microsoft.com](https://entra.microsoft.com) → **Identity →
   Applications → App registrations → New registration**.
2. Name it something like `NEU London Project Mapping`.
3. **Supported account types**: "Accounts in this organizational directory
   only" (single tenant) — this is what restricts sign-in to your union's
   accounts.
4. **Redirect URI**: platform **Single-page application (SPA)**, value
   `https://<your-username>.github.io/london-mapping/` (the exact URL the
   site is published at — include the trailing slash).
5. After creation, note down from the **Overview** page:
   - **Application (client) ID**
   - **Directory (tenant) ID**
6. Go to **API permissions → Add a permission → Microsoft Graph →
   Delegated permissions**, and add:
   - `Files.ReadWrite`
   - `Sites.ReadWrite.All`
   - `User.Read`
   Then click **Grant admin consent** for these.
7. Nothing else needs configuring — no client secret is created (SPAs use
   PKCE, not a secret).

## 3. Find the SharePoint site ID and workbook's item ID

With the app registration's client ID from step 2, the easiest way is
Microsoft's [Graph Explorer](https://developer.microsoft.com/en-us/graph/graph-explorer),
signed in with an account that has access to the file:

1. `GET https://graph.microsoft.com/v1.0/sites/<your-tenant>.sharepoint.com:/sites/<site-name>`
   → copy the `id` field (this is your **site ID**).
2. `GET https://graph.microsoft.com/v1.0/sites/<site ID>/drive/root:/<path to the file, e.g. Shared Documents/London_Project_Mapping_template.xlsx>`
   → copy the `id` field (this is your **workbook item ID**).

## 4. Fill in `js/config.js`

```js
export const CONFIG = {
  USE_MOCK_DATA: false,   // flip this once the rest is filled in
  msal: {
    clientId: "…from step 2…",
    tenantId: "…from step 2…",
    redirectUri: window.location.origin + window.location.pathname,
  },
  graph: {
    siteId: "…from step 3…",
    driveItemId: "…from step 3…",
  },
};
```

Commit and push that change — it's not a secret, so it's fine in the public
repo (see the note at the top of this file).

## 5. Test

1. Open the deployed site. You should land on a Microsoft sign-in screen
   instead of the dashboard.
2. Sign in with a union Microsoft 365 account that has access to the
   workbook.
3. The dashboard should load real numbers from the workbook. Try adding a
   field note or a dispute and confirm the new row appears in the Excel file
   on OneDrive.

If sign-in fails with an "AADSTS..." error, it's almost always the redirect
URI in step 2.4 not exactly matching the site's real URL, or admin consent
not yet granted in step 2.6.

## Ongoing data refresh

`SourceGIAS`, `SourceWorkforce`, `WCtoURN`, and `SourceNEUDashboard` stay a
manual paste-in-Excel job, same as before — whoever refreshes the DfE/NEU
exports keeps doing that directly in the workbook. The app just reads
whatever's currently in those tables, so there's nothing to redeploy when
that data changes.

`BranchFacts` and `MatFacts` hold the "project scope" flags (which
branches/MATs count toward the dashboard's headline KPIs) plus a few
manually-tracked figures (school meetings held, reps trained, whether a MAT
rep committee exists) — edit those rows directly in Excel when the project's
scope changes.
