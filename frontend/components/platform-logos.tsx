// SVG Logo components for platform icons
export function ZoomLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <rect width="48" height="48" rx="8" fill="#2D8CFF" />
      <path
        d="M12 17.5C12 16.1193 13.1193 15 14.5 15H27.5C28.8807 15 30 16.1193 30 17.5V26.5L36 31V15L30 19V17.5C30 14.4624 27.5376 12 24.5 12H14.5C11.4624 12 9 14.4624 9 17.5V30.5C9 33.5376 11.4624 36 14.5 36H24.5C27.5376 36 30 33.5376 30 30.5V29L36 33V17L30 21.5V30.5C30 31.8807 28.8807 33 27.5 33H14.5C13.1193 33 12 31.8807 12 30.5V17.5Z"
        fill="white"
      />
    </svg>
  )
}

export function TeamsLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <rect width="48" height="48" rx="8" fill="#5059C9" />
      <circle cx="32" cy="16" r="5" fill="#7B83EB" />
      <path
        d="M38 24H26C25.4477 24 25 24.4477 25 25V35C25 35.5523 25.4477 36 26 36H38C38.5523 36 39 35.5523 39 35V25C39 24.4477 38.5523 24 38 24Z"
        fill="#7B83EB"
      />
      <circle cx="20" cy="14" r="6" fill="white" />
      <path
        d="M28 22H12C10.8954 22 10 22.8954 10 24V36C10 37.1046 10.8954 38 12 38H28C29.1046 38 30 37.1046 30 36V24C30 22.8954 29.1046 22 28 22Z"
        fill="white"
      />
      <path d="M24 28H16V30H24V28Z" fill="#5059C9" />
      <path d="M24 32H16V34H24V32Z" fill="#5059C9" />
    </svg>
  )
}

export function MeetLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <rect width="48" height="48" rx="8" fill="#00897B" />
      <path d="M32 18L38 14V34L32 30V18Z" fill="#FFC107" />
      <rect x="10" y="14" width="24" height="20" rx="3" fill="#00897B" />
      <rect x="12" y="16" width="20" height="16" rx="2" fill="white" />
      <path d="M18 22L22 25L26 22V28L22 25L18 28V22Z" fill="#00897B" />
    </svg>
  )
}

export function WebexLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <rect width="48" height="48" rx="8" fill="#000000" />
      <path d="M14 16H20L24 24L28 16H34L27 28L34 40H28L24 32L20 40H14L21 28L14 16Z" fill="#00BCF2" />
      <circle cx="36" cy="14" r="4" fill="#ED1C24" />
    </svg>
  )
}
