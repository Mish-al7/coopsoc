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

export const applicationSchema = baseSchema.refine((d) => d.nomineeAadhaar !== d.aadhaar, {
  path: ["nomineeAadhaar"],
  message: "v.nomineeAadhaarSame",
});

export type ApplicationInput = z.output<typeof applicationSchema>;

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
export const MAX_EXTRA = 3;
