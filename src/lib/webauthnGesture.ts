/**
 * Uses the device's platform authenticator (Windows Hello / Touch ID / Android fingerprint)
 * purely as a local UX gate before firing a biometric "test scan" — it does NOT verify a
 * stored fingerprint template against anything server-side. Real matching for production
 * attendance happens on the physical device; this only proves "someone tapped a real
 * fingerprint sensor on this machine" before we call the same capture API a real device would.
 */
const CREDENTIAL_KEY = "bloom_webauthn_test_credential_id";

export function isWebAuthnSupported(): boolean {
  return typeof window !== "undefined" && !!window.PublicKeyCredential;
}

/** True only if the OS actually has a fingerprint/Windows Hello/Touch ID reader set up — not just that the API exists. */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

function randomBytes(len: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(len));
}

function bufferToBase64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let str = "";
  bytes.forEach((b) => (str += String.fromCharCode(b)));
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlToBuffer(base64url: string): ArrayBuffer {
  const pad = (4 - (base64url.length % 4)) % 4;
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function ensureCredential(label: string): Promise<string> {
  const existing = localStorage.getItem(CREDENTIAL_KEY);
  if (existing) return existing;

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: randomBytes(32),
      rp: { name: "BloomSchool Attendance (Test)" },
      user: { id: randomBytes(16), name: label, displayName: label },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
      timeout: 60000,
    },
  })) as PublicKeyCredential | null;

  if (!credential) throw new Error("Fingerprint registration was cancelled");

  const id = bufferToBase64url(credential.rawId);
  localStorage.setItem(CREDENTIAL_KEY, id);
  return id;
}

/** Prompts the OS fingerprint/biometric reader. Resolves true on success, throws a readable error otherwise. */
export async function triggerFingerprintGesture(label = "BloomSchool"): Promise<boolean> {
  if (!isWebAuthnSupported()) {
    throw new Error("This browser doesn't support WebAuthn/platform biometrics");
  }
  if (!(await isPlatformAuthenticatorAvailable())) {
    throw new Error(
      "No fingerprint reader is set up for this browser session. On Windows: Settings → Accounts → " +
      "Sign-in options → Fingerprint, and enroll a print there first. On Mac: enroll Touch ID in " +
      "System Settings → Touch ID. Also confirm you're on http://localhost or https:// — WebAuthn is " +
      "blocked on a plain http:// LAN address."
    );
  }

  try {
    const credentialId = await ensureCredential(label);
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: randomBytes(32),
        allowCredentials: [{ id: base64urlToBuffer(credentialId), type: "public-key" }],
        userVerification: "required",
        timeout: 60000,
      },
    });
    return !!assertion;
  } catch (err) {
    // The stored credential id may be stale (e.g. from a previous browser profile/device) — clear it
    // and let the next click re-register from scratch instead of failing the same way forever.
    localStorage.removeItem(CREDENTIAL_KEY);
    throw err;
  }
}
