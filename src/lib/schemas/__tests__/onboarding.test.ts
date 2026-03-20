import { describe, it, expect } from "vitest";
import { step1Schema, step2Schema, step6Schema } from "../onboarding";

/** A complete, valid Step 1 data object. */
function validStep1() {
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + 7);

  const dob = new Date(today);
  dob.setFullYear(dob.getFullYear() - 20);

  return {
    position_applied: "Barista",
    expected_salary: "2500",
    date_available: futureDate.toISOString().split("T")[0],
    full_name: "Jane Tan",
    date_of_birth: dob.toISOString().split("T")[0],
    place_of_birth: "Singapore",
    nationality: "Singaporean",
    race: "Chinese",
    gender: "Female",
    marital_status: "Single",
    address_block: "123",
    address_street: "Orchard Road",
    address_postal: "238888",
    contact_number: "+6591234567",
    email: "jane@example.com",
  };
}

describe("step1Schema", () => {
  it("accepts valid complete data", () => {
    const result = step1Schema.safeParse(validStep1());
    expect(result.success).toBe(true);
  });

  it("rejects when full_name is missing", () => {
    const data = { ...validStep1(), full_name: "" };
    const result = step1Schema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email address", () => {
    const data = { ...validStep1(), email: "not-an-email" };
    const result = step1Schema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects a postal code that is not 6 digits", () => {
    const data = { ...validStep1(), address_postal: "1234" };
    const result = step1Schema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects a postal code with letters", () => {
    const data = { ...validStep1(), address_postal: "12345A" };
    const result = step1Schema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe("step2Schema", () => {
  it("requires emergency contact fields", () => {
    const result = step2Schema.safeParse({
      emergency_name: "",
      emergency_relationship: "",
      emergency_contact: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("emergency_name");
      expect(paths).toContain("emergency_relationship");
    }
  });

  it("accepts valid emergency contact without NS fields for non-SG male", () => {
    const result = step2Schema.safeParse({
      nationality: "Malaysian",
      gender: "Male",
      emergency_name: "John Tan",
      emergency_relationship: "Father",
      emergency_contact: "+6581234567",
    });
    expect(result.success).toBe(true);
  });

  it("requires NS service status for Singaporean males", () => {
    const result = step2Schema.safeParse({
      nationality: "Singaporean",
      gender: "Male",
      emergency_name: "John Tan",
      emergency_relationship: "Father",
      emergency_contact: "+6581234567",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("ns_service_status");
    }
  });

  it("requires NS status for SG males when not exempted", () => {
    const result = step2Schema.safeParse({
      nationality: "Singaporean",
      gender: "Male",
      ns_service_status: "NSman",
      ns_enlistment_date: "2020-01-01",
      ns_ord_date: "2022-01-01",
      emergency_name: "John Tan",
      emergency_relationship: "Father",
      emergency_contact: "+6581234567",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("ns_status");
    }
  });

  it("does not require NS status when exempted", () => {
    const result = step2Schema.safeParse({
      nationality: "Singaporean",
      gender: "Male",
      ns_service_status: "Exempted",
      emergency_name: "John Tan",
      emergency_relationship: "Father",
      emergency_contact: "+6581234567",
    });
    expect(result.success).toBe(true);
  });
});

describe("step6Schema", () => {
  /** A complete, valid Step 6 data object. */
  function validStep6() {
    return {
      additional_health: false,
      additional_dismissed: false,
      additional_convicted: false,
      additional_bankrupt: false,
      additional_relatives: false,
      additional_prev_applied: false,
      declaration_agreed: true as const,
    };
  }

  it("accepts valid data with declaration agreed", () => {
    const result = step6Schema.safeParse(validStep6());
    expect(result.success).toBe(true);
  });

  it("rejects when declaration_agreed is not true", () => {
    const data = { ...validStep6(), declaration_agreed: false };
    const result = step6Schema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("requires additional_health_detail when additional_health is true", () => {
    const data = { ...validStep6(), additional_health: true };
    const result = step6Schema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("additional_health_detail");
    }
  });

  it("accepts additional_health true with detail provided", () => {
    const data = {
      ...validStep6(),
      additional_health: true,
      additional_health_detail: "Had knee surgery in 2020",
    };
    const result = step6Schema.safeParse(data);
    expect(result.success).toBe(true);
  });
});
