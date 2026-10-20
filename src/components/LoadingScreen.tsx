import { GradientPlaceholder } from "./GradientPlaceholder"

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 text-white" role="status" aria-live="polite">
      <GradientPlaceholder />
      <div className="relative h-full flex flex-col items-center justify-center gap-5">
        <div className="loading-ring" aria-hidden />
        <p className="text-xl font-semibold tracking-tight">
          creating your workout
          <span className="loading-dots" aria-hidden>
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </p>
      </div>
    </div>
  )
}
