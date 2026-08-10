import { signIn } from "../auth.js";

export async function render(container) {
  container.innerHTML = `
    <div class="signin-wrap">
      <h1>NEU London Project Mapping</h1>
      <p>Sign in with your union Microsoft 365 account to view live campaign data and add dispute/field-note updates.</p>
      <button class="btn btn-primary" id="signin-btn">Sign in with Microsoft</button>
    </div>
  `;
  container.querySelector("#signin-btn").addEventListener("click", () => signIn());
}
