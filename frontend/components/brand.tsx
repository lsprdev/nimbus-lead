import { cn } from '@/lib/utils'

export function BrandLogo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground',
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
          d="M5 16.5C3.34 16.5 2 15.16 2 13.5C2 12.02 3.06 10.79 4.46 10.55C4.42 10.37 4.4 10.19 4.4 10C4.4 8.07 5.97 6.5 7.9 6.5C8.5 6.5 9.06 6.65 9.55 6.92C10.2 5.51 11.63 4.5 13.3 4.5C15.6 4.5 17.5 6.4 17.5 8.7C17.5 8.85 17.49 9 17.47 9.15C19.15 9.5 20.4 11 20.4 12.78C20.4 14.84 18.74 16.5 16.68 16.5H5Z"
          fill="currentColor"
        />
      </svg>
    </div>
  )
}

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <BrandLogo />
      <span className="text-lg font-semibold tracking-tight">Nimbus</span>
    </div>
  )
}
