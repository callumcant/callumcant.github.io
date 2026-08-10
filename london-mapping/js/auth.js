// Thin wrapper around MSAL Browser (loaded from esm.sh so there's no npm
// install / build step — this is a static site). Only used once
// CONFIG.USE_MOCK_DATA is false and SETUP.md's app-registration step is done.
import { CONFIG } from "./config.js";

const GRAPH_SCOPES = ["Files.ReadWrite", "Sites.ReadWrite.All", "User.Read"];

let msalModulePromise = null;
function loadMsal() {
  if (!msalModulePromise) {
    msalModulePromise = import("https://esm.sh/@azure/msal-browser@3.24.0");
  }
  return msalModulePromise;
}

let pca = null;
async function getClient() {
  if (pca) return pca;
  const { PublicClientApplication } = await loadMsal();
  pca = new PublicClientApplication({
    auth: {
      clientId: CONFIG.msal.clientId,
      authority: `https://login.microsoftonline.com/${CONFIG.msal.tenantId}`,
      redirectUri: CONFIG.msal.redirectUri,
    },
    cache: { cacheLocation: "sessionStorage" },
  });
  await pca.initialize();
  const redirectResult = await pca.handleRedirectPromise();
  if (redirectResult?.account) {
    pca.setActiveAccount(redirectResult.account);
  } else {
    const accounts = pca.getAllAccounts();
    if (accounts.length) pca.setActiveAccount(accounts[0]);
  }
  return pca;
}

export async function getAccount() {
  const client = await getClient();
  return client.getActiveAccount();
}

export async function signIn() {
  const client = await getClient();
  await client.loginRedirect({ scopes: GRAPH_SCOPES });
}

export async function signOut() {
  const client = await getClient();
  await client.logoutRedirect();
}

export async function getAccessToken() {
  const client = await getClient();
  const account = client.getActiveAccount();
  if (!account) throw new Error("Not signed in");
  try {
    const result = await client.acquireTokenSilent({ scopes: GRAPH_SCOPES, account });
    return result.accessToken;
  } catch (err) {
    await client.acquireTokenRedirect({ scopes: GRAPH_SCOPES, account });
    throw err; // acquireTokenRedirect navigates away; this line won't be reached
  }
}
