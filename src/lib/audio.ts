import type { SoundOption } from "../shared/schema"

type OscillatorType = "sine" | "square" | "sawtooth" | "triangle"

interface AudioPlayer {
  playTick: () => void
  playPhaseEnd: () => void
  playStart: () => void
  playRest: () => void
  playFinish: () => Promise<void>
}

function getWaveform(theme: SoundOption): { primary: OscillatorType; secondary: OscillatorType } {
  switch (theme) {
    case "electronic":
      return { primary: "sawtooth", secondary: "sawtooth" }
    case "vibrant":
      return { primary: "sine", secondary: "sine" }
    case "classic":
    default:
      return { primary: "square", secondary: "sine" }
  }
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  duration: number,
  type: OscillatorType,
  gain = 0.3,
  startTime = ctx.currentTime
): void {
  const osc = ctx.createOscillator()
  const gainNode = ctx.createGain()
  osc.connect(gainNode)
  gainNode.connect(ctx.destination)

  osc.type = type
  osc.frequency.setValueAtTime(frequency, startTime)
  gainNode.gain.setValueAtTime(gain, startTime)
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration)

  osc.start(startTime)
  osc.stop(startTime + duration)
}

export function createAudioPlayer(ctx: AudioContext, theme: SoundOption): AudioPlayer {
  const { primary, secondary } = getWaveform(theme)

  async function ensureResumed() {
    if (ctx.state === "suspended") {
      await ctx.resume()
    }
  }

  return {
    async playTick() {
      await ensureResumed()
      playTone(ctx, 880, 0.1, secondary, 0.2)
    },

    async playPhaseEnd() {
      await ensureResumed()
      playTone(ctx, 660, 0.2, primary, 0.35)
    },

    async playStart() {
      await ensureResumed()
      playTone(ctx, 440, 0.15, primary, 0.4)
      playTone(ctx, 660, 0.15, primary, 0.4, ctx.currentTime + 0.15)
    },

    async playRest() {
      await ensureResumed()
      playTone(ctx, 330, 0.3, secondary, 0.3)
    },

    async playFinish() {
      await ensureResumed()
      // C5 → E5 → G5 → C6 ascending sequence
      const notes = [523.25, 659.25, 783.99, 1046.5]
      const noteDuration = 0.3
      const gap = 0.05
      const now = ctx.currentTime
      notes.forEach((freq, i) => {
        playTone(ctx, freq, noteDuration, secondary, 0.4, now + i * (noteDuration + gap))
      })
      // Return after the sequence finishes so callers can chain voice congrats
      const totalDuration = notes.length * (noteDuration + gap)
      return new Promise<void>((resolve) => setTimeout(resolve, totalDuration * 1000))
    },
  }
}
