export function WorldPreview({ large = false }) {
  return (
    <div className={`world-preview${large ? ' world-preview-large' : ''}`} aria-label="Concept preview of the customizable world in development">
      <div className="world-preview-heading">
        <span>WORLD MODEL / PREVIEW</span>
        <span className="preview-status"><i /> IN DEVELOPMENT</span>
      </div>
      <div className="world-preview-scene" aria-hidden="true">
        <svg viewBox="0 0 720 490" role="presentation" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="world-sky" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#edf3e9"/><stop offset="1" stopColor="#e1eae0"/></linearGradient>
            <linearGradient id="world-land" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#afc9ab"/><stop offset=".55" stopColor="#789e8c"/><stop offset="1" stopColor="#416f6b"/></linearGradient>
            <linearGradient id="world-side" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#7b9f8d"/><stop offset="1" stopColor="#55776d"/></linearGradient>
            <filter id="world-shadow"><feGaussianBlur stdDeviation="17"/></filter>
          </defs>
          <rect width="720" height="490" fill="url(#world-sky)" />
          <g opacity=".25" stroke="#8ca79a" strokeWidth="1">
            <path d="M0 366 360 194 720 366M0 406 360 234 720 406M0 446 360 274 720 446M0 486 360 314 720 486" fill="none"/>
            <path d="M0 366 360 490M80 328 440 490M160 290 520 490M240 252 600 490M320 214 680 490M400 214 720 366M480 252 720 326" fill="none"/>
          </g>
          <ellipse cx="363" cy="372" rx="236" ry="66" fill="#4c6b5f" opacity=".19" filter="url(#world-shadow)"/>
          <path d="M116 314 307 224 580 303 401 395 116 331Z" fill="url(#world-side)"/>
          <path d="M116 314 307 224 580 303 401 378Z" fill="url(#world-land)" stroke="#6a9281" strokeWidth="2"/>
          <path d="M146 315 311 240 546 302 399 361Z" fill="#bad0aa" opacity=".7"/>
          <path d="M190 309 313 252 496 302 393 347Z" fill="#d1d8b3" opacity=".8"/>
          <path d="M243 304 314 267 450 303 388 333Z" fill="#e7dec0" opacity=".9"/>
          <path d="M176 313c79 13 133 22 176 27 64 6 110-7 170-35M208 297c67 11 119 17 164 16 48-2 79-6 114-19M255 283c52 6 93 8 128 3" fill="none" stroke="#527b6c" strokeWidth="2" opacity=".42"/>
          <path d="M288 250c-11 28-15 46-8 58 9 18 45 14 70 27 17 9 25 21 32 34" fill="none" stroke="#d8ecdf" strokeWidth="12" strokeLinecap="round" opacity=".85"/>
          <path d="M288 250c-11 28-15 46-8 58 9 18 45 14 70 27 17 9 25 21 32 34" fill="none" stroke="#6eaaad" strokeWidth="5" strokeLinecap="round" opacity=".85"/>
          <g fill="#557b62" opacity=".9">
            <circle cx="227" cy="315" r="7"/><circle cx="214" cy="321" r="5"/><circle cx="240" cy="321" r="5"/>
            <circle cx="452" cy="311" r="8"/><circle cx="442" cy="320" r="5"/><circle cx="467" cy="316" r="6"/>
            <circle cx="402" cy="278" r="7"/><circle cx="416" cy="284" r="5"/><circle cx="390" cy="286" r="5"/>
          </g>
          <g fill="none" stroke="#537a70" strokeWidth="1.5" opacity=".75">
            <circle cx="311" cy="252" r="98" strokeDasharray="4 8"/>
            <path d="M311 141v30m0 162v30M199 252h30m163 0h30"/>
          </g>
          <circle cx="311" cy="252" r="5" fill="#fff9eb" stroke="#5a8b78" strokeWidth="2"/>
        </svg>
      </div>
      <div className="world-preview-footer"><span>Terrain · Ecology · Paths · Time</span><span>01 / WORLD</span></div>
      <div className="preview-watermark">Interactive modeling preview coming soon</div>
    </div>
  )
}
