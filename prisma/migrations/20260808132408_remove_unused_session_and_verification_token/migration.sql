-- Session: unused because auth.ts uses session: { strategy: "jwt" } — Auth.js
-- never calls the adapter's session-table methods in JWT mode, so this table
-- was always empty.
-- VerificationToken: unused since the Resend magic-link email provider was
-- removed (Google OAuth + guest Credentials don't need it).
DROP TABLE "Session";
DROP TABLE "VerificationToken";
