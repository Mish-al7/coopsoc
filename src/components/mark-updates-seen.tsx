"use client";

import { useEffect } from "react";
import { markUpdatesSeen } from "@/app/actions/updates";

/** Rendered on /updates: records the visit so the "new" badge clears next time. */
export function MarkUpdatesSeen() {
  useEffect(() => {
    markUpdatesSeen().catch(() => {});
  }, []);
  return null;
}
