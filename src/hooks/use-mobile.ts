import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile(breakpoint: number = MOBILE_BREAKPOINT) {
  // Computed directly at render time, not via an effect: the effect below only needs to subscribe to future changes.
  const [isMobile, setIsMobile] = React.useState(() => window.innerWidth < breakpoint)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const onChange = () => setIsMobile(window.innerWidth < breakpoint)
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [breakpoint])

  return isMobile
}
