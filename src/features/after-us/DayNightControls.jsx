import { useEffect, useState } from 'react'
import { DAY_CYCLE_SECONDS, dayPhase, formatTimeOfDay, readDayClock } from './dayNight.js'

export function DayNightControls({ clock }) {
  const [hour, setHour] = useState(clock.current.hour)
  const [autoCycle, setAutoCycle] = useState(clock.current.autoCycle)
  useEffect(() => {
    if (!autoCycle) return undefined
    let frame, lastUpdate = 0
    const tick = (now) => {
      // The scene reads the clock every frame; only this control's readout updates at 10 Hz.
      if (now - lastUpdate >= 100) { setHour(readDayClock(clock.current, now)); lastUpdate = now }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [autoCycle, clock])
  const scrub = (value) => {
    clock.current = { hour: value, autoCycle: false, startedAt: performance.now() }
    setHour(value); setAutoCycle(false)
  }
  const toggle = () => {
    const now = performance.now(), current = readDayClock(clock.current, now), next = !clock.current.autoCycle
    clock.current = { hour: current, autoCycle: next, startedAt: now }
    setHour(current); setAutoCycle(next)
  }
  const formatted = formatTimeOfDay(hour), phase = dayPhase(hour)
  return <section className="after-day-cycle" aria-label="Day & Night Cycle">
    <div className="after-day-heading"><h4>Day & Night Cycle</h4><span>{phase}</span></div>
    <label className="after-range after-day-range"><span className="after-range-heading"><span>Time of Day</span><strong>{formatted}</strong></span><input type="range" aria-label="Time of Day" aria-valuetext={`${formatted} — ${phase}`} min={0} max={24} step={1 / 60} value={hour} onChange={(event) => scrub(Number(event.target.value))} /></label>
    <div className="after-day-ticks" aria-hidden="true"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div>
    <button type="button" className={`after-auto-cycle${autoCycle ? ' active' : ''}`} aria-pressed={autoCycle} onClick={toggle}><span aria-hidden="true">{autoCycle ? 'Ⅱ' : '↻'}</span> Auto Cycle <small>{autoCycle ? 'On' : 'Off'}</small></button>
    <p className="after-overlay-note">Lighting only; independent of Elapsed Years. Auto Cycle: 1 day in {DAY_CYCLE_SECONDS / 60} minutes.</p>
  </section>
}
