export type OpenCamiLogoProps = {
  className?: string
}

export function OpenCamiLogo({ className }: OpenCamiLogoProps) {
  return (
    <div className={className}>
      {/* Chameleon emoji as simple logo */}
      <span className="text-xl">🦎</span>
    </div>
  )
}

export function OpenCamiText({ className }: { className?: string }) {
  return (
    <span
      className={className}
      style={{
        background: 'linear-gradient(90deg, #10b981, #14b8a6, #06b6d4, #8b5cf6, #ec4899)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        fontWeight: 600,
      }}
    >
      OpenCami
    </span>
  )
}
