import { Color } from 'three'

export const DEFAULT_TIME_OF_DAY = 14
export const DAY_CYCLE_SECONDS = 180
const clamp = (value) => Math.max(0, Math.min(1, value))
const smooth = (a, b, value) => { const t = clamp((value - a) / (b - a)); return t * t * (3 - 2 * t) }

// Colors are art directed; interpolation, light direction, and intensity remain continuous.
const keys = [
  [0, '#65738f', '#b2c1e3', '#abc4ea', '#65778d', '#ffd3a3', '#527687', 0.38, 0.7],
  [5, '#8e8ba8', '#c1bdd9', '#b9c6e3', '#7d8092', '#ffc6a0', '#6c8b9a', 0.4, 0.76],
  [6, '#e2b7aa', '#e7c9cb', '#f3d2bb', '#8b8c7e', '#ffbd85', '#a5aaa2', 0.49, 0.84],
  [8, '#ebd7c9', '#dfd9df', '#eee3d3', '#7e8976', '#ffe2c4', '#83aaa6', 0.64, 1],
  [12, '#e5dcce', '#e1dfe6', '#e9e7df', '#81917e', '#fff0d9', '#83aaa6', 0.65, 1],
  [15, '#ead7cb', '#dfd9df', '#eee3d3', '#7e8976', '#ffe3c6', '#83aaa6', 0.65, 1],
  [17.5, '#e5b59b', '#ead5cc', '#ffe0bc', '#958f7c', '#ffb46e', '#af9f8d', 0.6, 1],
  [18.5, '#b494ab', '#c5bad8', '#c2b4d6', '#7a7d90', '#ffb388', '#7e8d9d', 0.46, 0.83],
  [20, '#697a98', '#b4c2e4', '#abc4ea', '#65778d', '#ffd3a3', '#527687', 0.38, 0.7],
  [24, '#65738f', '#b2c1e3', '#abc4ea', '#65778d', '#ffd3a3', '#527687', 0.38, 0.7],
].map(([hour, sky, ambient, upper, ground, sun, water, ambientIntensity, hemisphereIntensity]) => ({ hour, sky: new Color(sky), ambient: new Color(ambient), upper: new Color(upper), ground: new Color(ground), sun: new Color(sun), water: new Color(water), ambientIntensity, hemisphereIntensity }))

export function createDayClock(hour = DEFAULT_TIME_OF_DAY, now = 0) { return { hour, autoCycle: false, startedAt: now } }
export function readDayClock(clock, now) {
  if (!clock.autoCycle) return clock.hour
  return ((clock.hour + Math.max(0, now - clock.startedAt) / 1000 * 24 / DAY_CYCLE_SECONDS) % 24 + 24) % 24
}
export function formatTimeOfDay(hour) {
  const minutes = Math.max(0, Math.min(1440, Math.round(hour * 60)))
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}
export function dayPhase(hour) {
  const h = hour % 24
  return h < 5 || h >= 20 ? 'Night' : h < 6 ? 'Dawn' : h < 8 ? 'Sunrise' : h < 16 ? 'Daytime' : h < 18 ? 'Golden hour' : 'Dusk'
}
export function createLightingState() {
  return { sky: new Color(), ambient: new Color(), upper: new Color(), ground: new Color(), sun: new Color(), water: new Color(), sunPosition: [0, 0, 0], moonPosition: [0, 0, 0], sunIntensity: 0, moonIntensity: 0, ambientIntensity: 0, hemisphereIntensity: 0 }
}
export function sampleDayNight(hour, sunlight = 0.7, state = createLightingState()) {
  const h = ((hour % 24) + 24) % 24
  const i = keys.findIndex((key) => key.hour > h)
  const from = keys[i - 1], to = keys[i], t = smooth(from.hour, to.hour, h)
  for (const name of ['sky', 'ambient', 'upper', 'ground', 'sun', 'water']) state[name].copy(from[name]).lerp(to[name], t)
  for (const name of ['ambientIntensity', 'hemisphereIntensity']) state[name] = from[name] + (to[name] - from[name]) * t
  const angle = (h - 6) / 24 * Math.PI * 2, elevation = Math.sin(angle)
  state.sunPosition[0] = Math.cos(angle) * 36; state.sunPosition[1] = elevation * 26; state.sunPosition[2] = elevation * 16
  for (let axis = 0; axis < 3; axis += 1) state.moonPosition[axis] = -state.sunPosition[axis]
  state.sunIntensity = smooth(-0.04, 0.22, elevation) * (0.95 + sunlight * 1.8) * (0.62 + Math.max(0, elevation) * 0.38)
  state.moonIntensity = (1 - smooth(-0.28, 0.1, elevation)) * 0.8
  return state
}
