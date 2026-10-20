// Static stand-in for the animated shader gradient. Tiny and dependency-free so it
// can show instantly while the three.js chunk downloads and the canvas starts up.
export function GradientPlaceholder() {
  return (
    <div
      className="absolute inset-0"
      style={{ background: "linear-gradient(160deg, #ff8a2b 0%, #ff5005 55%, #e63a12 100%)" }}
    />
  )
}
