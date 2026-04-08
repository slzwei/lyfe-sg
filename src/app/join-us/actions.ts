"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { checkRateLimitAsync } from "@/lib/rate-limit";
import { calculateDiscScores, DISC_TYPE_INFO } from "@/app/candidate/disc-quiz/scoring";
import { generateDiscPdf } from "@/lib/pdf";
import { uploadCandidatePdf } from "@/lib/supabase/storage";
import { sendDiscResultsEmail } from "@/lib/email";
import * as Sentry from "@sentry/nextjs";

const STEVEN_ID = "4ac16477-e844-462e-881b-6e44045b30d7";

const EDUCATION_OPTIONS = [
  "PSLE", "GCE N-Level", "GCE O-Level", "GCE A-Level",
  "ITE/NITEC", "Diploma", "Advanced Diploma", "Bachelor's Degree",
  "Postgraduate Diploma", "Master's Degree", "Doctorate (PhD)",
  "Professional Qualification", "Other",
];

// ── Submit application form ─────────────────────────────────────────────────

interface ApplicationData {
  fullName: string;
  phone: string;
  email: string;
  highestEducation: string;
  dateOfBirth: string;
  dateAvailable: string;
  honeypot?: string;
}

export async function submitApplication(data: ApplicationData): Promise<{
  success: boolean;
  error?: string;
}> {
  // Honeypot check
  if (data.honeypot) return { success: false, error: "Submission blocked." };

  // Rate limit
  const ip = (await headers()).get("x-forwarded-for") || "unknown";
  const { allowed } = await checkRateLimitAsync(`join-us:${ip}`, 20, 3_600_000);
  if (!allowed) return { success: false, error: "Too many submissions. Please try again later." };

  // ── Validate fields ────────────────────────────────────────────────────
  const name = data.fullName?.trim();
  const email = data.email?.trim().toLowerCase();
  const phone = data.phone?.trim();
  const education = data.highestEducation?.trim();
  const dob = data.dateOfBirth?.trim();
  const startDate = data.dateAvailable?.trim();

  if (!name || name.length < 2 || name.length > 255) {
    return { success: false, error: "Please enter a valid name." };
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Please enter a valid email address." };
  }

  // Phone: SG +65 number, 8 digits starting with 8 or 9
  const phoneDigits = phone?.replace(/\D/g, "").replace(/^65/, "");
  if (!phoneDigits || !/^[89]\d{7}$/.test(phoneDigits)) {
    return { success: false, error: "Please enter a valid Singapore phone number." };
  }
  const normalizedPhone = `+65${phoneDigits}`;

  if (!education || !EDUCATION_OPTIONS.includes(education)) {
    return { success: false, error: "Please select your highest education." };
  }

  if (!dob) return { success: false, error: "Please enter your date of birth." };
  const dobDate = new Date(dob);
  const age = (Date.now() - dobDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (age < 18) return { success: false, error: "You must be at least 18 years old." };
  if (age > 100) return { success: false, error: "Please enter a valid date of birth." };

  if (!startDate) return { success: false, error: "Please enter your earliest start date." };
  const startDateObj = new Date(startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (startDateObj < today) return { success: false, error: "Start date must be today or later." };

  // ── Check duplicates ───────────────────────────────────────────────────
  const admin = getAdminClient();

  const { data: existingByEmail } = await admin
    .from("candidates")
    .select("id")
    .ilike("email", email)
    .limit(1)
    .maybeSingle();

  if (existingByEmail) {
    return { success: false, error: "An application with this email already exists." };
  }

  const { data: existingByPhone } = await admin
    .from("candidates")
    .select("id")
    .eq("phone", normalizedPhone)
    .limit(1)
    .maybeSingle();

  if (existingByPhone) {
    return { success: false, error: "An application with this phone number already exists." };
  }

  // ── Create auth user ───────────────────────────────────────────────────
  const { data: createData, error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    app_metadata: { role: "candidate" },
    user_metadata: { full_name: name },
  });

  if (createError) {
    if (createError.message?.includes("already been registered")) {
      return { success: false, error: "An account with this email already exists." };
    }
    console.error("[join-us] createUser failed:", createError.message);
    return { success: false, error: "Something went wrong. Please try again." };
  }

  const authUserId = createData.user.id;

  // ── Establish session via magic link ───────────────────────────────────
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (linkError || !linkData.properties?.hashed_token) {
    console.error("[join-us] generateLink failed:", linkError?.message);
    await admin.auth.admin.deleteUser(authUserId).catch(() => {});
    return { success: false, error: "Session setup failed. Please try again." };
  }

  const serverClient = await createClient();
  const { error: verifyError } = await serverClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "magiclink",
  });

  if (verifyError) {
    console.error("[join-us] verifyOtp failed:", verifyError.message);
    await admin.auth.admin.deleteUser(authUserId).catch(() => {});
    return { success: false, error: "Session setup failed. Please try again." };
  }

  // ── Create candidate pipeline record ───────────────────────────────────
  const { data: candidateRecord, error: candidateError } = await admin
    .from("candidates")
    .insert({
      name,
      email,
      phone: normalizedPhone,
      status: "applied",
      assigned_manager_id: STEVEN_ID,
      created_by_id: STEVEN_ID,
      notes: "Public application via /join-us",
    })
    .select("id")
    .single();

  if (candidateError || !candidateRecord) {
    console.error("[join-us] candidates insert failed:", candidateError?.message);
    await admin.auth.admin.deleteUser(authUserId).catch(() => {});
    return { success: false, error: "Something went wrong. Please try again." };
  }

  // ── Create candidate profile ───────────────────────────────────────────
  const { error: profileError } = await admin.from("candidate_profiles").upsert(
    {
      user_id: authUserId,
      candidate_id: candidateRecord.id,
      full_name: name,
      email,
      contact_number: normalizedPhone,
      date_of_birth: dob,
      date_available: startDate,
      education: { highest_qualification: education },
      completed: true,
      onboarding_step: 6,
    },
    { onConflict: "user_id" }
  );

  if (profileError) {
    console.error("[join-us] candidate_profiles upsert failed:", profileError.message);
    // Clean up — delete candidate record + auth user
    await admin.from("candidates").delete().eq("id", candidateRecord.id).then(null, () => {});
    await admin.auth.admin.deleteUser(authUserId).catch(() => {});
    return { success: false, error: "Something went wrong. Please try again." };
  }

  return { success: true };
}

// ── Save quiz progress (auto-save) ──────────────────────────────────────────

export async function saveJoinUsProgress(userId: string, responses: Record<string, number>) {
  if (!userId || Object.keys(responses).length === 0) return;

  const admin = getAdminClient();
  const { error } = await admin.from("disc_responses").upsert(
    {
      user_id: userId,
      responses,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) console.error("[saveJoinUsProgress] upsert failed:", error.message);
}

// ── Submit completed quiz ───────────────────────────────────────────────────

export async function submitJoinUsQuiz(
  responses: Record<string, number>,
  durationSeconds: number
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const answeredCount = Object.keys(responses).length;
  if (answeredCount < 38) {
    return { error: `Please answer all questions (${answeredCount}/38).` };
  }

  // Use admin client for writes (bypasses RLS)
  const admin = getAdminClient();

  // Save raw responses
  const { error: respError } = await admin.from("disc_responses").upsert(
    { user_id: user.id, responses, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
  if (respError) return { error: respError.message };

  // Calculate scores
  const scores = calculateDiscScores(responses);
  const { profile_strength, strength_pct, priorities, ...dbScores } = scores;

  // Save results
  const { error: resultError } = await admin.from("disc_results").upsert(
    { user_id: user.id, duration_seconds: durationSeconds, ...dbScores },
    { onConflict: "user_id" }
  );
  if (resultError) return { error: resultError.message };

  // Fetch profile for PDF/email
  const { data: profile } = await admin
    .from("candidate_profiles")
    .select("full_name, contact_number")
    .eq("user_id", user.id)
    .single();

  // Notify Steven + generate PDF (after response)
  const userId = user.id;
  const candidateName = profile?.full_name || "Unknown";
  const contactNumber = profile?.contact_number || "";
  const isBalanced = profile_strength === "balanced";
  const typeInfo = isBalanced ? DISC_TYPE_INFO["Balanced"] : DISC_TYPE_INFO[scores.disc_type];

  after(async () => {
    const admin = getAdminClient();

    // Push notification to Steven
    await admin.from("notifications").insert({
      user_id: STEVEN_ID,
      type: "candidate_assigned",
      title: "New public application",
      body: `${candidateName} applied via /join-us`,
      data: {},
    }).then(null, (err: unknown) => console.error("[join-us] notification insert failed:", err));

    // Generate DISC PDF
    let pdfBuffer: Buffer | null = null;
    if (typeInfo) {
      try {
        pdfBuffer = await generateDiscPdf({
          full_name: candidateName,
          disc_type: scores.disc_type,
          d_pct: scores.d_pct,
          i_pct: scores.i_pct,
          s_pct: scores.s_pct,
          c_pct: scores.c_pct,
          angle: scores.angle,
          profile_strength,
          strength_pct,
          priorities,
          typeInfo,
        });
        await uploadCandidatePdf(userId, "disc-profile", pdfBuffer);
      } catch (err) {
        Sentry.captureException(err, { tags: { action: "join-us-disc-pdf" } });
        console.error("[join-us] DISC PDF failed:", err);
      }
    }

    // Send admin notification email
    try {
      await sendDiscResultsEmail({
        full_name: candidateName,
        disc_type: scores.disc_type,
        d_pct: scores.d_pct,
        i_pct: scores.i_pct,
        s_pct: scores.s_pct,
        c_pct: scores.c_pct,
        angle: scores.angle,
        profile_strength,
        strength_pct,
        priorities,
        results_email: "",
        contact_number: contactNumber,
        pdfBuffer: pdfBuffer || undefined,
      });
    } catch (err) {
      Sentry.captureException(err, { tags: { action: "join-us-disc-email" } });
      console.error("[join-us] email failed:", err);
    }
  });

  redirect("/join-us/results");
}

// ── Sign out ────────────────────────────────────────────────────────────────

export async function signOutJoinUs() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/join-us/thank-you");
}
