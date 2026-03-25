export const CONGRATS_PHRASES = [
  "You absolutely smashed it!",
  "That's what I'm talking about, legend!",
  "Crushed it like a boss!",
  "No cap, you just went off!",
  "Straight fire, keep that energy!",
  "Bussin' workout, no cap!",
  "You ate that up and left no crumbs!",
  "Big W, you're built different!",
  "Slay, that grind was real!",
  "Lowkey iconic performance right there!",
  "You went full beast mode, respect!",
  "That was an absolute banger of a session!",
  "Sheesh, you did not come to play!",
  "Main character energy, let's go!",
  "That workout just got bodied by you!",
]

export function speakCongrats(): void {
  if (typeof window.speechSynthesis === "undefined") return

  const phrase = CONGRATS_PHRASES[Math.floor(Math.random() * CONGRATS_PHRASES.length)]
  const utterance = new SpeechSynthesisUtterance(phrase)
  window.speechSynthesis.speak(utterance)
}
