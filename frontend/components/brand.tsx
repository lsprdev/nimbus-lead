import { cn } from "@/lib/utils";

export function BrandLogo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground",
        className,
      )}
      aria-hidden="true"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M4.75 5.5L9.15 3.75C9.58 3.58 10.05 3.58 10.48 3.75L13.52 4.97C13.95 5.14 14.42 5.14 14.85 4.97L19.25 3.22C20.07 2.89 21 3.49 21 4.37V17.79C21 18.3 20.69 18.76 20.21 18.95L15.81 20.7C15.38 20.87 14.91 20.87 14.48 20.7L11.44 19.48C11.01 19.31 10.54 19.31 10.11 19.48L5.71 21.23C4.89 21.56 3.96 20.96 3.96 20.08V6.66C3.96 6.15 4.27 5.69 4.75 5.5Z"
          fill="currentColor"
          opacity="0.32"
        />
        <path
          d="M9.75 4V19.05M14.25 5.1V20.15"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M5.25 6.5L9.75 4.7L14.25 6.5L18.75 4.7V17.7L14.25 19.5L9.75 17.7L5.25 19.5V6.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <BrandLogo />
      <span className="font-brand text-lg font-semibold tracking-tight">
        Karta Leads
      </span>
    </div>
  );
}
