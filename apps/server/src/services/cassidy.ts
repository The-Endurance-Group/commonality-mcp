import type { EnrichmentData } from "@commonality/shared";
import { logger } from "../logger.js";

// Ported from the reference repo (server/services/cassidy.ts). Calls the Cassidy
// enrichment workflow webhook and normalizes the raw profile into EnrichmentData.
// NOTE: callers should go through enrichmentCache.ts so we hit Cassidy at most
// once per LinkedIn URL.

export async function getRawProfile(linkedinUrl: string, timeoutMs = 30_000): Promise<any> {
  const webhookUrl = process.env.CASSIDY_WEBHOOK_URL;
  if (!webhookUrl) throw new Error("CASSIDY_WEBHOOK_URL not set");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linkedin_url: linkedinUrl }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw new Error("AI enrichment timed out - will retry");
    throw err;
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) throw new Error(`Enrichment error: ${response.status} ${response.statusText}`);
  const data = await response.json() as any;
  const raw = data.workflowRun?.actionResults?.[0]?.output?.value;
  return raw ? JSON.parse(raw) : data;
}

function logRawCassidyResponse(profileData: any, linkedinUrl: string) {
  logger.debug({ linkedinUrl, profileData }, "CASSIDY_DEBUG raw response");
}

export async function analyzeLinkedInProfile(linkedinUrl: string, timeoutMs = 30_000): Promise<EnrichmentData> {
  const webhookUrl = process.env.CASSIDY_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error("CASSIDY_WEBHOOK_URL environment variable is not set");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linkedin_url: linkedinUrl }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === "AbortError") throw new Error("AI enrichment timed out - will retry");
    throw err;
  }
  clearTimeout(timeout);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cassidy webhook error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json() as any;

  if (!data.workflowRun?.actionResults?.[0]?.output?.value) {
    throw new Error("Invalid Cassidy response structure - no profile data found");
  }

  const profileData = JSON.parse(data.workflowRun.actionResults[0].output.value) as any;

  if (process.env.CASSIDY_DEBUG === "true") {
    logRawCassidyResponse(profileData, linkedinUrl);
  }

  let almaMater = "";
  let graduationYear = "";
  let degrees: string[] = [];
  let fieldsOfStudy: string[] = [];
  if (profileData.educations && Array.isArray(profileData.educations)) {
    const higherEd = profileData.educations.filter(
      (edu: any) => edu.school && !edu.school.toLowerCase().includes("high school") && !edu.school.toLowerCase().includes("secondary")
    );
    if (higherEd.length > 0) {
      almaMater = [...new Set<string>(higherEd.map((edu: any) => edu.school).filter(Boolean))].join("; ");
      graduationYear = higherEd[0].end_year?.toString() || "";
      degrees = [...new Set<string>(higherEd.map((edu: any) => edu.degree).filter(Boolean))];
      fieldsOfStudy = [...new Set<string>(higherEd.map((edu: any) => edu.field_of_study).filter(Boolean))];
    }
  }

  let pastCompanies: string[] = [];
  let currentCompany = "";
  if (profileData.experiences && Array.isArray(profileData.experiences)) {
    currentCompany = profileData.experiences[0]?.company || "";
    pastCompanies = [...new Set<string>(profileData.experiences.slice(1).map((exp: any) => exp.company).filter(Boolean))];
  }

  const fullName = profileData.full_name || `${profileData.first_name} ${profileData.last_name}`.trim();
  if (!fullName) {
    throw new Error("Could not extract name from LinkedIn profile");
  }

  return {
    name: fullName,
    title: profileData.job_title || profileData.headline || profileData.experiences?.[0]?.title || "",
    company: currentCompany,
    almaMater,
    graduationYear,
    degrees,
    fieldsOfStudy,
    pastCompanies,
    currentLocation: profileData.city ? `${profileData.city}, ${profileData.country || ""}`.replace(/^, |, $/, "") : (profileData.country || profileData.location || ""),
    profileImage: profileData.profile_image_url,
    connectionCount: typeof profileData.connection_count === "number" ? profileData.connection_count : undefined,
    bio: profileData.about || "",
    email: profileData.email || undefined,
  };
}
