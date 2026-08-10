import { signIn } from "../auth.js";

export async function render(container) {
  container.innerHTML = `
    <div class="signin-wrap">
      <h1>NEU London Project Mapping</h1>
      <p>Sign in with your union Microsoft 365 account to view live campaign data and add dispute/field-note updates.</p>
      <button class="btn btn-primary" id="signin-btn">Sign in with Microsoft</button>
      <p class="muted-cell" id="signin-error" role="status"></p>
    </div>
  `;
  const btn = container.querySelector("#signin-btn");
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.textContent = "Opening Microsoft sign-in…";
    try {
      await signIn();
    } catch (err) {
      // signIn normally navigates away, so reaching here means it failed to
      // start — usually the CDN-hosted library being blocked.
      console.error("[auth] sign-in failed to start", err);
      btn.disabled = false;
      btn.textContent = "Sign in with Microsoft";
      container.querySelector("#signin-error").textContent =
        `Sign-in couldn't start: ${err?.message || err}`;
    }
  });
}
