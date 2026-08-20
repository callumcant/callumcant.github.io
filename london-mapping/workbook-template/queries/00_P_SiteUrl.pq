// Query name: P_SiteUrl
//
// The SharePoint SITE the mapping data lives on — the site, not a folder URL.
// Everything below Mapping/ is reached by navigation steps from here, which is
// what keeps the spaces and brackets in "London data (do not delete)" out of
// the connection string.
//
// Ignored entirely when P_LocalFolder is set.
let
    Source = "https://neu365.sharepoint.com/sites/NEULondonTeam"
in
    Source
