function Cube({ x, y, size = 42 }) {
  const h = size / 2
  return <g transform={`translate(${x} ${y})`}>
    <path d={`M0 0 ${h} -${h / 2} ${size} 0 ${h} ${h / 2}Z`} fill="currentColor" opacity=".34"/>
    <path d={`M0 0 ${h} ${h / 2} ${h} ${size * .8} 0 ${size * .56}Z`} fill="currentColor" opacity=".64"/>
    <path d={`M${h} ${h / 2} ${size} 0 ${size} ${size * .56} ${h} ${size * .8}Z`} fill="currentColor" opacity=".85"/>
  </g>
}

function ArtworkShape({ slug }) {
  switch (slug) {
    case 'noise':
      return <g fill="none" stroke="currentColor" strokeWidth="4">
        {[0, 1, 2, 3, 4].map((n) => <path key={n} d={`M${16 + n * 21} 160 C${54 + n * 14} 61, ${111 + n * 12} 190, ${164 + n * 11} 95 S${286 + n * 9} 33, ${393 + n * 9} 86`} opacity={.28 + n * .1}/>)}
      </g>
    case 'terrain':
      return <g>
        <path d="M16 177 89 125 135 143 218 49 277 98 324 67 406 156V210H16Z" fill="currentColor" opacity=".23"/>
        <path d="M12 187 96 145 165 165 232 91 283 123 336 103 410 176" fill="none" stroke="currentColor" strokeWidth="5" opacity=".72"/>
        <path d="M34 199 100 170 174 184 238 122 288 151 340 135 390 184M90 203 180 200 243 155 293 180 352 164" fill="none" stroke="currentColor" strokeWidth="3" opacity=".45"/>
      </g>
    case 'scatter':
      return <g fill="currentColor">
        {[[66,112,22],[125,79,30],[185,127,20],[243,65,27],[303,107,33],[357,74,20],[112,159,14],[271,162,17]].map(([x,y,r], i) => <g key={i}><path d={`M${x} ${y}v${r * 1.8}`} stroke="currentColor" strokeWidth="3" opacity=".48"/><circle cx={x} cy={y} r={r} opacity={.26 + (i % 3) * .13}/></g>)}
      </g>
    case 'paths':
      return <g fill="none" strokeLinecap="round"><path d="M-15 149 C65 103 105 204 185 142 S284 31 415 75" stroke="currentColor" strokeWidth="47" opacity=".16"/><path d="M-15 149 C65 103 105 204 185 142 S284 31 415 75" stroke="currentColor" strokeWidth="9" opacity=".7"/><path d="M-15 149 C65 103 105 204 185 142 S284 31 415 75" stroke="#f9f6ef" strokeWidth="2" strokeDasharray="9 13" opacity=".8"/></g>
    case 'flow':
      return <g fill="none" stroke="currentColor" strokeLinecap="round">
        {[0, 1, 2, 3, 4].map((n) => <path key={n} d={`M-20 ${65 + n * 27} C90 ${12 + n * 31}, 142 ${170 + n * 7}, 245 ${91 + n * 16} S338 ${40 + n * 10}, 430 ${85 + n * 22}`} strokeWidth={n === 2 ? 7 : 3} opacity={.3 + n * .09}/>)}
        {[[91,97],[186,153],[285,94],[355,133]].map(([x,y],i) => <circle key={i} cx={x} cy={y} r="7" fill="currentColor" stroke="none" opacity=".72"/>)}
      </g>
    case 'voxel':
      return <g><Cube x={86} y={87} size={73}/><Cube x={160} y={51} size={73}/><Cube x={234} y={88} size={73}/><Cube x={161} y={128} size={73}/></g>
    case 'shaders':
      return <g><path d="M8 151C93 94 140 134 206 94s116-47 198-2v119H8Z" fill="currentColor" opacity=".24"/><path d="M8 151C93 94 140 134 206 94s116-47 198-2M8 169c85-57 132-17 198-57s116-47 198-2M8 187c85-57 132-17 198-57s116-47 198-2" fill="none" stroke="currentColor" strokeWidth="5" opacity=".68"/></g>
    case 'branching':
      return <g fill="none" stroke="currentColor" strokeLinecap="round"><path d="M207 215V119m0 33-75-61m75 39 70-70m-145 31-38-48m38 48 8-61m137 30 8-51m-8 51 48-32" strokeWidth="9" opacity=".72"/><path d="M95 43 69 27m25 16 10-24m36 11-19-20m19 20 25-18m120-3-14-25m14 25 29-13m11 12 24-22" strokeWidth="4" opacity=".5"/><circle cx="94" cy="43" r="22" fill="currentColor" opacity=".18"/><circle cx="139" cy="30" r="25" fill="currentColor" opacity=".18"/><circle cx="285" cy="9" r="26" fill="currentColor" opacity=".18"/><circle cx="325" cy="28" r="21" fill="currentColor" opacity=".18"/></g>
    case 'worldlines':
      return <g fill="none" stroke="currentColor" strokeWidth="4"><path d="M33 106h80l55-53h79l55-37h85M113 106l55 55h79l55 38h86M168 53l78 53h78M168 161l78-55" opacity=".55"/>{[[33,106],[113,106],[168,53],[168,161],[246,106],[302,16],[302,199],[324,106]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r={i === 4 ? 10 : 7} fill="currentColor" stroke="none" opacity=".8"/>)}</g>
    default:
      return null
  }
}

export function ExperimentArtwork({ slug }) {
  return <svg className="experiment-card-art" viewBox="0 0 400 210" aria-hidden="true" focusable="false"><ArtworkShape slug={slug}/></svg>
}
