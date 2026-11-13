"use client";

import { useT } from "./lang";

export function PrintButton() {
  const { t } = useT();
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-primary btn-sm">
      {t("view.print")}
    </button>
  );
}
