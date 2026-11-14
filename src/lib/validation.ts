import { z } from "zod";
import { cleanAadhaar, isValidAadhaar } from "./aadhaar";
import { GUARDIAN_RELATIONS } from "./society";

// Shared by the browser (instant feedback) and the server (the real check).
// Messages are i18n keys — the UI translates them with t().

const text = (msg: string, max = 120) => z.string().trim().min(1, msg).max(max, "v.tooLong");

const phone = z
  .string()
  .transform((s) => s.replace(/[\s()-]/g, "").replace(/^(\+91|91|0)(?=\d{10}$)/, ""))
  .refine((s) => /^[6-9]\d{9}$/.test(s), "v.phone");

const aadhaar = z
  .string()
  .transform(cleanAadhaar)
  .refine((s) => s.length > 0, "v.aadhaarRequired")
  .refine((s) => s.length === 0 || isValidAadhaar(s), "v.aadhaarInvalid");

// Indian bank account numbers are 9–18 digits; IFSC is 4 letters (bank) + "0" + 6 letters/digits (branch).
export const cleanAccount = (s: string) => (s || "").replace(/[\s-]/g, "");
export const ACCOUNT_RE = /^\d{9,18}$/;
export const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

const bankAccount = z
  .string()
  .transform(cleanAccount)
  .refine((s) => s.length > 0, "v.bankAccountRequired")
  .refine((s) => s.length === 0 || ACCOUNT_RE.test(s), "v.bankAccount");

const ifsc = z
  .string()
  .transform((s) => s.trim().toUpperCase())
  .refine((s) => s.length > 0, "v.ifscRequired")
  .refine((s) => s.length === 0 || IFSC_RE.test(s), "v.ifsc");

const age = (min: number, minMsg: string) =>
  z
    .string()
    .trim()
    .min(1, "v.ageRequired")
    .transform(Number)
    .refine((n) => Number.isInteger(n), "v.ageInvalid")
    .refine((n) => n >= min, minMsg)
    .refine((n) => n <= 110, "v.ageInvalid");

const baseSchema = z.object({
    name: text("v.name", 100),
    guardianRelation: z.string().refine((v) => (GUARDIAN_RELATIONS as readonly string[]).includes(v), "v.relation"),
    guardianName: text("v.guardianName", 100),
    age: age(18, "v.ageMin18"),
    occupation: text("v.occupation", 80),
    phone,
    aadhaar,
    address: text("v.address", 400),
    desam: text("v.desam", 80),
    village: text("v.village", 80),
    taluk: text("v.taluk", 80),

    bankHolder: text("v.bankHolder", 100),
    bankAccount,
    bankAccount2: z.string().transform(cleanAccount),
    bankIfsc: ifsc,
    bankName: text("v.bankName", 100),
    bankBranch: text("v.bankBranch", 100),

    nomineeName: text("v.nomineeName", 100),
    nomineeRelation: text("v.nomineeRelation", 40),
    nomineeAge: age(1, "v.ageInvalid"),
    nomineePhone: phone,
    nomineeAadhaar: aadhaar,
    nomineeAddress: text("v.nomineeAddress", 400),

    shares: z
      .string()
      .trim()
      .min(1, "v.sharesRequired")
      .transform(Number)
      .refine((n) => Number.isInteger(n) && n >= 1, "v.sharesMin")
      .refine((n) => n <= 1000, "v.sharesMax"),

    declaration: z.literal("on", { message: "v.declaration" }),
});

export const applicationSchema = baseSchema
  .refine((d) => d.nomineeAadhaar !== d.aadhaar, {
    path: ["nomineeAadhaar"],
    message: "v.nomineeAadhaarSame",
  })
  .refine((d) => d.bankAccount2 === d.bankAccount, {
    path: ["bankAccount2"],
    message: "v.bankAccountMismatch",
  });

export type ApplicationInput = z.output<typeof applicationSchema>;

/**
 * Checks that compare two fields. zod skips object-level refinements while other fields
 * still have errors, so these run on their own and are shown together with the rest.
 */
export function crossFieldErrors(raw: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  const acc = cleanAccount(raw.bankAccount ?? "");
  const acc2 = cleanAccount(raw.bankAccount2 ?? "");
  if (acc && acc2 !== acc) out.bankAccount2 = "v.bankAccountMismatch";
  const a = cleanAadhaar(raw.aadhaar ?? "");
  if (a && cleanAadhaar(raw.nomineeAadhaar ?? "") === a) out.nomineeAadhaar = "v.nomineeAadhaarSame";
  return out;
}

/** All errors for a submitted form: per-field messages win over the cross-field ones. */
export function allErrors(raw: Record<string, string>, err?: z.ZodError): Record<string, string> {
  return { ...crossFieldErrors(raw), ...(err ? fieldErrors(err) : {}) };
}

/** Text fields from FormData. Unticked checkboxes / unselected selects are sent as "" so they get our own messages. */
export function formText(fd: FormData): Record<string, string> {
  const raw: Record<string, string> = {};
  for (const k of Object.keys(baseSchema.shape)) {
    const v = fd.get(k);
    raw[k] = typeof v === "string" ? v : "";
  }
  return raw;
}

export function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of err.issues) {
    const k = i.path.join(".") || "_";
    out[k] ??= i.message;
  }
  return out;
}

export const FILE_SLOTS = [
  "photo",
  "signature",
  "aadhaarFront",
  "aadhaarBack",
  "nomineePhoto",
  "nomineeAadhaarFront",
  "nomineeAadhaarBack",
] as const;
export type FileSlot = (typeof FILE_SLOTS)[number];
/** Photos of the applicant and nominee may be left out; signature and Aadhaar images are required. */
export const OPTIONAL_SLOTS: ReadonlySet<FileSlot> = new Set(["photo", "nomineePhoto"]);
export const MAX_EXTRA = 3;
