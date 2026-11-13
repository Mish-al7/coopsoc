// Society details that don't change with language.
// Names and address in both languages are in i18n.ts ("society.*" keys).
export const SOCIETY = {
  regNo: "C.IND (R) 193",
  phones: ["8281921997", "0487 2423894"],
  email: "info@thwics.com",
  website: "https://thwics.com",
  appNoPrefix: "THC",
};

// Stored as codes, shown via t("rel.<code>").
export const GUARDIAN_RELATIONS = ["father", "mother", "husband", "wife"] as const;

export const STATUSES = ["submitted", "needs_changes", "approved", "rejected"] as const;
export type Status = (typeof STATUSES)[number];
