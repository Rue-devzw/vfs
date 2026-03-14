import type { FirebaseError } from "firebase/app";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/invalid-email": "The email address is invalid.",
  "auth/operation-not-allowed": "Email/password sign-in is not enabled in Firebase Authentication.",
  "auth/weak-password": "The password is too weak. Use at least 8 characters.",
  "auth/network-request-failed": "Network request failed while contacting Firebase Authentication.",
  "auth/too-many-requests": "Too many attempts. Wait a moment and try again.",
  "auth/user-not-found": "No account exists for that email address.",
  "auth/wrong-password": "The password is incorrect.",
  "auth/invalid-credential": "The email or password is incorrect.",
  "auth/user-disabled": "This Firebase user has been disabled.",
  "auth/requires-recent-login": "Please sign in again and retry this action.",
  "auth/unauthorized-domain": "This domain is not authorized in Firebase Authentication.",
};

export function getFirebaseAuthErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as FirebaseError).code);
    return AUTH_ERROR_MESSAGES[code] ?? `${code}: ${String((error as FirebaseError).message ?? "Authentication request failed.")}`;
  }

  return error instanceof Error ? error.message : "Authentication request failed.";
}
