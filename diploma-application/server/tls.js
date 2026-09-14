/**
 * Fixes Gemini API "UNABLE_TO_VERIFY_LEAF_SIGNATURE" on Windows machines
 * where antivirus/corporate proxy performs HTTPS inspection.
 *
 * Set GEMINI_TLS_INSECURE=false to force strict verification.
 */
function shouldBypassTls() {
  if (process.env.GEMINI_TLS_INSECURE === "false") return false;
  if (process.env.GEMINI_TLS_INSECURE === "true") return true;
  return process.env.NODE_ENV !== "production";
}

function configureTls() {
  if (!shouldBypassTls()) return;

  try {
    const { Agent, setGlobalDispatcher } = require("undici");
    setGlobalDispatcher(
      new Agent({
        connect: { rejectUnauthorized: false },
      })
    );
    console.warn("[tls] Dev mode: relaxed TLS verification for AI API calls");
  } catch {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    console.warn("[tls] Dev mode: NODE_TLS_REJECT_UNAUTHORIZED=0 for AI API calls");
  }
}

configureTls();

module.exports = { configureTls, shouldBypassTls };
