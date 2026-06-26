// Domain schemas + types. Ported/distilled from the reference repo's
// shared/schema.ts. UI-specific form schemas and Drizzle table defs are
// intentionally dropped — only domain types the analysis algorithm and MCP
// tools need live here.

import { z } from "zod";

/** A single shared signal between a team member and a prospect. */
export const commonalitySchema = z.object({
  type: z.enum(["alma_mater", "company", "location", "linkedin_connection"]),
  value: z.string(),
  strength: z.number(),
});
export type Commonality = z.infer<typeof commonalitySchema>;

/**
 * A team member whose network we mine for warm paths. This is the rich domain
 * shape the matching algorithm consumes — the persisted `employees` row is
 * leaner (schools/past_companies jsonb); the DB layer maps rows into this type.
 */
export const employeeSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  almaMater: z.string().optional().nullable(),
  graduationYear: z.string().optional().nullable(),
  degrees: z.array(z.string()).optional().nullable(),
  fieldsOfStudy: z.array(z.string()).optional().nullable(),
  pastCompanies: z.array(z.string()).optional().nullable(),
  currentLocation: z.string().optional().nullable(),
  linkedinUrl: z.string().optional().nullable(),
  profileImage: z.string().optional().nullable(),
  connectionCount: z.number().optional().nullable(),
  bio: z.string().optional().nullable(),
});
export type Employee = z.infer<typeof employeeSchema>;

/** Lean company shape used by outreach/call-prep generation. */
export const companySchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  context: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
});
export type Company = z.infer<typeof companySchema>;

/** The data Cassidy returns for a single LinkedIn profile (enrichment). */
export const enrichmentDataSchema = z.object({
  name: z.string(),
  title: z.string(),
  company: z.string(),
  almaMater: z.string().optional(),
  graduationYear: z.string().optional(),
  degrees: z.array(z.string()),
  fieldsOfStudy: z.array(z.string()),
  pastCompanies: z.array(z.string()),
  currentLocation: z.string().optional(),
  profileImage: z.string().optional(),
  connectionCount: z.number().optional(),
  bio: z.string().optional(),
  email: z.string().optional(),
});
export type EnrichmentData = z.infer<typeof enrichmentDataSchema>;

/** A prospect being analyzed against the team's collective network. */
export const prospectProfileSchema = z.object({
  name: z.string(),
  title: z.string().optional(),
  company: z.string().optional(),
  almaMater: z.string().optional(),
  graduationYear: z.string().optional(),
  pastCompanies: z.array(z.string()).optional(),
  currentLocation: z.string().optional(),
  bio: z.string().optional(),
  degrees: z.array(z.string()).optional(),
  fieldsOfStudy: z.array(z.string()).optional(),
  connectionCount: z.number().optional(),
});
export type ProspectProfile = z.infer<typeof prospectProfileSchema>;

/**
 * A ranked warm path: one employee, the commonalities they share with the
 * prospect, and the aggregate strength score. (ConnectionResult in the
 * reference repo.)
 */
export interface WarmPath {
  employee: Employee;
  commonalities: Commonality[];
  strengthScore: number;
}
