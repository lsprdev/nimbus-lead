import * as React from 'react'

export function RadixBookmarkIcon({
  filled = false,
  ...props
}: React.SVGProps<SVGSVGElement> & { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        d={
          filled
            ? "M3.5 2A1.5 1.5 0 0 1 5 .5h5A1.5 1.5 0 0 1 11.5 2v12a.5.5 0 0 1-.82.38L7.5 11.68l-3.18 2.7A.5.5 0 0 1 3.5 14V2Z"
            : "M3.5 2A1.5 1.5 0 0 1 5 .5h5A1.5 1.5 0 0 1 11.5 2v12a.5.5 0 0 1-.82.38L7.5 11.68l-3.18 2.7A.5.5 0 0 1 3.5 14V2Zm1 0v10.92l2.68-2.28a.5.5 0 0 1 .64 0l2.68 2.28V2a.5.5 0 0 0-.5-.5H5a.5.5 0 0 0-.5.5Z"
        }
        fill="currentColor"
      />
    </svg>
  )
}
