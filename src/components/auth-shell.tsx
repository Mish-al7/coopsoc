import { Emblem } from "./emblem";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      {/* orange band (like the society site's banner); the card overlaps its bottom edge */}
      <div className="bg-flame px-4 pb-20 pt-8 text-center text-white sm:pb-24 sm:pt-12">
        <span className="inline-block rounded-full bg-white p-1 shadow-md">
          <Emblem className="h-16 w-16" />
        </span>
        <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">{title}</h1>
        <p className="mx-auto mt-1 max-w-md text-white/90">{subtitle}</p>
      </div>
      <div className="container-x -mt-14 flex justify-center pb-8 sm:-mt-16">
        <div className="card w-full max-w-md p-5 sm:p-7">{children}</div>
      </div>
    </div>
  );
}
