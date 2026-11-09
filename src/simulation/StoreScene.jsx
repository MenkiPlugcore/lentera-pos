import { useId } from 'react'

// Ilustrasi toko SVG lokal. Tidak memerlukan WebGL, canvas game, atau unduhan aset eksternal.
const BOX_COLORS=['#e9794d','#f6bd50','#69a2c1','#6eb183','#a78aca','#e78c9a','#e6b665','#6fa0a6']
function Goods({x,y,rows=3,cols=5,scale=1}) {
  const items=[]
  for(let row=0;row<rows;row++){
    for(let col=0;col<cols;col++){
      const k=row*cols+col
      const tone=BOX_COLORS[(k+row*3)%BOX_COLORS.length]
      const px=x+col*32
      const py=y+row*77
      items.push(<g key={k} transform={'translate('+px+' '+py+')'}>
        <rect x="0" y="0" width="23" height="47" rx="4" fill={tone} stroke="#5b534c" strokeOpacity=".24" strokeWidth="1.5"/>
        <path d="M4 5h15" stroke="#fff" strokeOpacity=".6" strokeWidth="3" strokeLinecap="round"/>
        <rect x="4" y="22" width="15" height="13" rx="2" fill="#fff" fillOpacity=".6"/>
        <path d="M8 25h8M8 29h5" stroke={tone} strokeWidth="2" strokeLinecap="round"/>
      </g>)
    }
  }
  return items
}
function Shelves({x,scale=1,mirror=false}) {
  return <g transform={'translate('+x+' 215) scale('+scale+' 1)'} opacity=".98">
    <path d="M0 0L180 12V319L0 335Z" fill="#f1e4d0" stroke="#a28b72" strokeWidth="5"/>
    <path d="M180 12l26-17v322l-26 17Z" fill="#b59b7f"/>
    {Array.from({length:4},(_,i)=><g key={i}>
      <path d={'M0 '+(i*77+67)+'L180 '+(i*77+65)+'l25 5L0 '+(i*77+78)+'Z'} fill="#c8ab8e" stroke="#9b7d61" strokeWidth="3"/>
    </g>)}
    <Goods x={14} y={20} rows={4} cols={5}/>
    <path d="M0 0l180 12 25-17L22-19Z" fill="#fff2db"/>
  </g>
}
function CustomerFigure({customer,mood}){
  const happy=mood==='happy'
  const thinking=mood==='thinking'
  const shirt=customer?.shirt||'#15865b'
  const hair=customer?.hair||'#43302a'
  return <g transform="translate(424 177)">
    <ellipse cx="123" cy="356" rx="138" ry="21" fill="#4d362d" fillOpacity=".22"/>
    <path d="M52 227Q1 245-2 310l42 11 41-83Z" fill={shirt} stroke="#307655" strokeOpacity=".28" strokeWidth="4"/>
    <path d="M191 226q72 21 62 96l-41 7-35-86Z" fill={shirt} stroke="#307655" strokeOpacity=".28" strokeWidth="4"/>
    <path d="M44 350L55 244Q66 202 121 195q68 8 82 50l22 110Z" fill={shirt} stroke="#28644d" strokeOpacity=".28" strokeWidth="4"/>
    <path d="M88 218l35 49 35-49" fill="none" stroke="#e7f9e9" strokeOpacity=".56" strokeWidth="7"/>
    <rect x="108" y="184" width="33" height="42" rx="11" fill="#de9d73"/>
    <ellipse cx="120" cy="113" rx="79" ry="101" fill="#edb58c" stroke="#d39573" strokeWidth="3"/>
    <ellipse cx="43" cy="128" rx="12" ry="18" fill="#e5a87e"/>
    <ellipse cx="199" cy="128" rx="12" ry="18" fill="#e5a87e"/>
    <path d="M43 126Q15 78 39 36Q72-5 131-5q75 0 82 56Q216 90 199 119l-12-64Q158 80 132 63Q101 91 57 74Z" fill={hair}/>
    <path d="M47 64Q67 8 131 9q47 2 68 41" fill="none" stroke={hair} strokeWidth="24" strokeLinecap="round"/>
    <path d="M71 107q17-8 35 0M144 107q18-8 30 0" fill="none" stroke="#54443d" strokeWidth="6" strokeLinecap="round"/>
    <ellipse cx="92" cy="126" rx="5" ry="7" fill="#3b2f29"/>
    <ellipse cx="161" cy="126" rx="5" ry="7" fill="#3b2f29"/>
    <path d="M125 133l-6 24 14 1" fill="none" stroke="#c48768" strokeWidth="4" strokeLinecap="round"/>
    <ellipse cx="67" cy="156" rx="13" ry="7" fill="#e28f83" opacity=".3"/>
    <ellipse cx="181" cy="156" rx="13" ry="7" fill="#e28f83" opacity=".3"/>
    {happy?<g>
      <path d="M103 181q21 29 48 0" fill="#fff" stroke="#965f50" strokeWidth="5" strokeLinecap="round"/>
      <path d="M106 182q22 18 42 0" fill="#a85254"/>
      <path d="M92 125q8 9 16 0M147 125q8 9 16 0" fill="none" stroke="#392e2a" strokeWidth="4"/>
    </g>:<path d={thinking?'M113 183q14-4 26 0':'M109 179q17 13 34 0'} fill="none" stroke="#9d5a53" strokeWidth="5" strokeLinecap="round"/>}
    <path d="M24 296q25-3 40 9l27 26-19 23q-44-9-59-27Z" fill="#e9aa80"/>
    <g transform="translate(61 295) rotate(-16)">
      <rect width="66" height="37" rx="4" fill="#e5b4b6" stroke="#ac676d" strokeWidth="2"/>
      <rect x="6" y="5" width="54" height="27" rx="2" fill="#f5dcdb" stroke="#ac8789"/>
      <circle cx="33" cy="18" r="10" fill="#d4a2a4"/>
      <path d="M12 10h10M44 26h11" stroke="#8b6a78" strokeWidth="3"/>
    </g>
    <path d="M58 321q14-2 25 5" stroke="#d39470" strokeWidth="7" strokeLinecap="round"/>
  </g>
}
export default function StoreScene({customer,mood='neutral'}) {
  const rawId=useId().replace(/:/g,'')
  const wall='wall-'+rawId, floor='floor-'+rawId,windowId='window-'+rawId,desk='desk-'+rawId
  return <svg className="game-store-art" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" role="img"
    aria-label={'Ilustrasi toko dengan rak barang, meja kasir, dan pelanggan '+(customer?.name||'virtual')}>
    <defs>
      <linearGradient id={wall} x1="0" y1="0" x2="1" y2=".9"><stop stopColor="#f5dcc4"/><stop offset=".6" stopColor="#d9b7a4"/><stop offset="1" stopColor="#cfa890"/></linearGradient>
      <linearGradient id={floor} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#ebceaa"/><stop offset="1" stopColor="#bd9777"/></linearGradient>
      <linearGradient id={windowId} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#8de2f3"/><stop offset=".7" stopColor="#c7f4f7"/><stop offset="1" stopColor="#b4d8b6"/></linearGradient>
      <linearGradient id={desk} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#bf8f68"/><stop offset="1" stopColor="#80573d"/></linearGradient>
      <filter id={'shadow-'+rawId} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="8"/>
      </filter>
    </defs>
    <rect width="1200" height="700" fill={'url(#'+wall+')'}/>
    <polygon points="0,0 1200,0 1100,101 110,101" fill="#bd8f79"/>
    <polygon points="0,105 110,101 1100,101 1200,107 1200,133 0,133" fill="#08666f"/>
    <polygon points="0,132 1200,132 1200,510 0,510" fill={'url(#'+wall+')'}/>
    <rect x="245" y="160" width="719" height="283" rx="5" fill="#654c45"/>
    <rect x="259" y="174" width="691" height="254" fill={'url(#'+windowId+')'}/>
    <path d="M259 368q140-86 291 9 142-101 400-29v80H259Z" fill="#b0d09e"/>
    <path d="M259 392q130-35 263-6 187-36 428 5v37H259Z" fill="#8ab98a"/>
    <path d="M603 174V428M259 308H950" stroke="#594542" strokeWidth="11"/>
    <path d="M0 480L1200 480V700H0Z" fill={'url(#'+floor+')'}/>
    <path d="M520 480L235 700M690 480l315 220M0 605h1200" fill="none" stroke="#aa886e" strokeWidth="3" strokeOpacity=".43"/>
    <g opacity=".77"><rect x="32" y="218" width="122" height="162" rx="3" fill="#e9d1a6" stroke="#a18d79" strokeWidth="6"/>
      <path d="M50 254h82M50 310h82" stroke="#bb8e64" strokeWidth="3"/>
      <rect x="60" y="264" width="50" height="32" rx="4" fill="#98ba9a"/>
    </g>
    <Shelves x={140} scale={1}/>
    <Shelves x={862} scale={1.05}/>
    <g opacity=".8">
      <rect x="1039" y="160" width="126" height="168" rx="5" fill="#99c3bd" stroke="#688f8c" strokeWidth="6"/>
      <rect x="1054" y="177" width="95" height="123" fill="#d3e9d8"/>
      <path d="M1069 205h67M1069 239h67M1069 274h67" stroke="#97b9a9" strokeWidth="7"/>
    </g>
    <CustomerFigure customer={customer} mood={mood}/>
    <ellipse cx="580" cy="652" rx="370" ry="34" fill="#352c26" fillOpacity=".23" filter={'url(#shadow-'+rawId+')'}/>
    <polygon points="116,535 1120,535 1200,660 0,660" fill={'url(#'+desk+')'} stroke="#7e593c" strokeWidth="7"/>
    <polygon points="116,535 1120,535 1190,573 12,573" fill="#d8ad82" stroke="#b08161" strokeWidth="4"/>
    <rect x="180" y="632" width="875" height="88" fill="#78533e"/>
    <rect x="388" y="549" width="285" height="122" rx="15" fill="#29343a" stroke="#161f26" strokeWidth="7"/>
    <rect x="402" y="563" width="257" height="91" rx="6" fill="#c7e9e0"/>
    <rect x="413" y="574" width="235" height="16" rx="4" fill="#348c80"/>
    <g fill="#edf9ef"><rect x="424" y="601" width="86" height="8" rx="3"/><rect x="424" y="615" width="65" height="7" rx="3"/></g>
    <rect x="560" y="604" width="80" height="35" rx="5" fill="#82c7be"/>
    <rect x="580" y="655" width="90" height="12" rx="4" fill="#1e2d32"/>
    <path d="M535 671v14h66v-14" fill="#35464a"/>
    <g transform="translate(758 559)">
      <ellipse cx="40" cy="103" rx="54" ry="16" fill="#364241"/>
      <path d="M30 103V43Q5 35 16 15 25-6 54 3q25 12 21 34L56 49v54" fill="#33474b" stroke="#233539" strokeWidth="5"/>
      <rect x="17" y="3" width="62" height="55" rx="19" fill="#333b40" stroke="#1c262e" strokeWidth="6"/>
      <rect x="29" y="15" width="38" height="28" rx="9" fill="#b54638"/>
      <rect x="35" y="22" width="25" height="12" rx="4" fill="#482b2e"/>
    </g>
    <g opacity=".9">
      <path d="M25 675q25-35 56-25 29 7 39 50H0Z" fill="#e1a37c"/>
      <path d="M1100 700q7-45 48-47 35 0 60 47Z" fill="#e1a37c"/>
    </g>
    <rect x="905" y="655" width="250" height="52" rx="7" fill="#3f3d3b" stroke="#262a2b" strokeWidth="6"/>
    <rect x="935" y="663" width="60" height="33" rx="4" fill="#23282b"/>
    <rect x="1004" y="663" width="60" height="33" rx="4" fill="#23282b"/>
    <rect x="1073" y="663" width="60" height="33" rx="4" fill="#23282b"/>
  </svg>
}
