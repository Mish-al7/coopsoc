import type { Status } from "@/lib/society";

const STYLE: Record<Status, string> = {
  submitted: "bg-gold-soft text-[#7a5310]",
  needs_changes: "bg-brand-soft text-brand-dark",
  approved: "bg-leaf-soft text-leaf",
  rejected: "bg-danger-soft text-danger",
};

/** `label` = t(`status.${status}`), passed in so this works in server and client components. */
export function StatusBadge({ status, label, className = "" }: { status: Status; label: string; className?: string }) {
  return (
    <span className={`chip max-w-full whitespace-normal ${STYLE[status]} ${className}`}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      {label}
    </span>
  );
}
