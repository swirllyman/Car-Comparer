/** Small line icons for the tab bar and toolbar, drawn on a 24×24 grid in currentColor. */

const Svg = ({ children }: { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
)

export const TopIcon = () => (
  <Svg>
    <rect x="7" y="2.5" width="10" height="19" rx="4" />
    <path d="M8.5 9h7M8.5 16h7" />
  </Svg>
)

export const SideIcon = () => (
  <Svg>
    <path d="M2.5 15.5v-3l2-1 3-4h8l3.5 4 2.5.8v3.2z" />
    <circle cx="7" cy="16.5" r="2" />
    <circle cx="17" cy="16.5" r="2" />
  </Svg>
)

export const FrontIcon = () => (
  <Svg>
    <path d="M5 11l2-5h10l2 5M4 11h16v6H4z" />
    <path d="M5 17v2M19 17v2M2.5 10h1.5M20 10h1.5" />
  </Svg>
)

export const CubeIcon = () => (
  <Svg>
    <path d="M12 2.5l8.5 4.8v9.4L12 21.5l-8.5-4.8V7.3z" />
    <path d="M3.5 7.3L12 12l8.5-4.7M12 12v9.5" />
  </Svg>
)

export const GarageIcon = () => (
  <Svg>
    <path d="M3 21V9l9-5.5L21 9v12" />
    <path d="M7 21v-8h10v8M7 16h10" />
  </Svg>
)

export const SwapIcon = () => (
  <Svg>
    <path d="M7 4L3.5 7.5 7 11M3.5 7.5h13M17 13l3.5 3.5L17 20M20.5 16.5h-13" />
  </Svg>
)

export const InfoIcon = () => (
  <Svg>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5M12 7.5v.01" />
  </Svg>
)

export const EditIcon = () => (
  <Svg>
    <path d="M4 20h4L19 9l-4-4L4 16z" />
  </Svg>
)

export const ResetIcon = () => (
  <Svg>
    <path d="M4 12a8 8 0 1 0 2.5-5.8M4 4v4.5h4.5" />
  </Svg>
)

export const CentreIcon = () => (
  <Svg>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
)

export const EyeIcon = ({ off }: { off?: boolean }) => (
  <Svg>
    <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
    {off && <path d="M4 20L20 4" />}
  </Svg>
)
