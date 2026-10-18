import assert from "node:assert/strict";
import { ResendEmailAdapter, ResendServiceError } from "../src/integrations/email/resendEmailAdapter.js";
import {
  setEmailProviderConfig,
  getEmailAdapter,
  assertEmailProviderConfiguration,
  sendInquiryNotification
} from "../src/integrations/email/emailService.js";

async function runTests() {
  console.log("--- Resend Adapter Unit Tests ---");

  // 1. Throws without API key
  const originalKey = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;

  const adapterNoKey = new ResendEmailAdapter();
  assert.throws(
    () => adapterNoKey.assertConfigured(),
    (err) => err instanceof ResendServiceError && err.code === "RESEND_NOT_CONFIGURED"
  );
  console.log("PASS: throws ResendServiceError when API key is missing");

  // 2. Mock client to verify delivery calls
  process.env.RESEND_API_KEY = "re_test_mock_key";
  process.env.ADMIN_NOTIFICATION_EMAIL = "ivanbhattarai042@gmail.com";

  let lastSentPayload = null;
  const mockResendClient = {
    emails: {
      send: async (payload) => {
        lastSentPayload = payload;
        return { data: { id: "msg_test_123" } };
      },
    },
  };

  const adapter = new ResendEmailAdapter(mockResendClient);

  // Test Password Reset
  const resetResult = await adapter.sendPasswordReset({
    to: "teacher@kmes.edu.np",
    resetClientUrl: "https://kmes.com.np/reset-password?token=safe_token_123",
  });
  assert.equal(resetResult.ok, true);
  assert.equal(resetResult.id, "msg_test_123");
  assert.equal(lastSentPayload.to, "teacher@kmes.edu.np");
  assert.ok(lastSentPayload.subject.includes("password"));
  assert.ok(lastSentPayload.html.includes("https://kmes.com.np/reset-password?token=safe_token_123"));
  console.log("PASS: sendPasswordReset dispatches valid email payload");

  // Test Security Notification
  const notifResult = await adapter.sendSecurityNotification({
    to: "admin@kmes.edu.np",
    subject: "Security Alert: Password Changed",
    text: "Your password was updated successfully.",
  });
  assert.equal(notifResult.ok, true);
  assert.equal(lastSentPayload.to, "admin@kmes.edu.np");
  assert.equal(lastSentPayload.subject, "Security Alert: Password Changed");
  console.log("PASS: sendSecurityNotification dispatches alert");

  // Test Inquiry Notification
  const inquiryResult = await adapter.sendInquiryNotification({
    name: "Ram Sharma",
    email: "ram@example.com",
    phone: "9841000000",
    subject: "[ADMISSION INQUIRY] Grade 5",
    message: "Seeking admission for my daughter.",
  });
  assert.equal(inquiryResult.ok, true);
  assert.equal(lastSentPayload.to, "ivanbhattarai042@gmail.com");
  assert.ok(lastSentPayload.subject.includes("Ram Sharma"));
  assert.ok(lastSentPayload.html.includes("Seeking admission for my daughter"));
  console.log("PASS: sendInquiryNotification sends parent inquiry to school admin");

  // Test emailService provider selection
  const origProvider = process.env.EMAIL_PROVIDER;
  process.env.EMAIL_PROVIDER = "resend";
  setEmailProviderConfig({ provider: "resend" });
  assert.equal(getEmailAdapter() instanceof ResendEmailAdapter, true);
  assert.equal(assertEmailProviderConfiguration(), "resend");
  console.log("PASS: emailService correctly selects Resend provider when configured");

  // Restore environment
  if (originalKey) {
    process.env.RESEND_API_KEY = originalKey;
  } else {
    delete process.env.RESEND_API_KEY;
  }
  process.env.EMAIL_PROVIDER = origProvider || "mock";
  setEmailProviderConfig({ provider: "mock" });

  console.log("\nAll Resend unit tests passed!");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
