/**
 * Test data generators and constants for E2E tests.
 *
 * Uses Supabase test OTP numbers: +6580000001 – +6580000006, code: 555555
 */

/** Supabase-whitelisted test phone numbers (OTP code is always 555555). */
export const TEST_PHONES = {
  candidate1: { short: "80000001", full: "+6580000001" },
  candidate2: { short: "80000002", full: "+6580000002" },
  candidate3: { short: "80000003", full: "+6580000003" },
  candidate4: { short: "80000004", full: "+6580000004" },
  candidate5: { short: "80000005", full: "+6580000005" },
  candidate6: { short: "80000006", full: "+6580000006" },
} as const;

export const TEST_OTP = "555555";

export const STAFF_PASSWORD = process.env.STAFF_SECRET || "test-staff-secret";

/** Minimal valid data to pass Step 1 validation. */
export function step1Data() {
  return {
    position_applied: "Software Engineer",
    expected_salary: "5000",
    salary_period: "month",
    date_available: "2026-04-01",
    full_name: "Test Candidate",
    date_of_birth: "1995-06-15",
    place_of_birth: "Singapore",
    nationality: "Singaporean",
    race: "Chinese",
    gender: "Male",
    marital_status: "Single",
    address_postal: "570187",
    address_unit: "#10-123",
  };
}

/** Minimal valid data to pass Step 2 validation. */
export function step2Data() {
  return {
    ns_status: "Completed",
    ns_enlistment_date: "2014-01-01",
    ns_ord_date: "2016-01-01",
    emergency_name: "Jane Doe",
    emergency_relationship: "Mother",
    emergency_contact: "+6591234567",
  };
}

/** Generate a unique email for test invitations. */
export function testEmail(suffix?: string): string {
  const ts = Date.now();
  return `test-${suffix || ts}@example.com`;
}

/** Candidate details for invitation tests. */
export function inviteData(overrides?: Partial<{ email: string; name: string; position: string }>) {
  return {
    email: overrides?.email || testEmail(),
    name: overrides?.name || "E2E Test Candidate",
    position: overrides?.position || "QA Engineer",
  };
}
