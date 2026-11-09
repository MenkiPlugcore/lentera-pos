import { useId } from 'react'

// Ilustrasi SVG lokal: tanpa request gambar eksternal, foto atau identitas orang sungguhan.
export default function CustomerAvatar({ customer, mood = 'neutral', size = 224 }) {
  const uid = useId().replace(/:/g, '')
  const gradientId = 'customer-bg-' + uid
  const happy = mood === 'happy'
  const thinking = mood === 'thinking'
  const shirt = customer?.shirt || '#0891b2'
  const hair = customer?.hair || '#32251f'

  return (
    <svg viewBox="0 0 240 240" width={size} height={size} role="img"
      aria-label={'Ilustrasi ' + (customer?.name || 'pelanggan') + (
        happy ? ' sedang senang' : thinking ? ' sedang berpikir' : ' sedang menunggu'
      )} className="mx-auto max-w-full" focusable="false">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={happy ? '#2a8b8f' : '#1f385b'}/>
          <stop offset="1" stopColor={happy ? '#164e63' : '#12283e'}/>
        </linearGradient>
      </defs>
      <circle cx="120" cy="120" r="114" fill={'url(#' + gradientId + ')'}/>
      <circle cx="192" cy="50" r="18" fill="#ffffff" fillOpacity=".10"/>
      <circle cx="50" cy="170" r="22" fill="#ffffff" fillOpacity=".06"/>
      <path d="M22 220 Q35 163 82 169 L155 169 Q208 163 220 220 Z" fill={shirt}/>
      <path d="M104 159 L104 183 Q120 198 136 183 L136 159" fill="#e5a67b"/>
      <ellipse cx="120" cy="112" rx="61" ry="75" fill="#f4be98"/>
      <path d="M61 110 Q52 58 84 44 Q109 25 144 36 Q186 46 180 107 L170 76 Q149 86 123 73 Q91 93 65 81 Z" fill={hair}/>
      <path d="M68 79 Q91 43 139 56 Q167 61 174 83" fill="none" stroke={hair} strokeWidth="17" strokeLinecap="round"/>
      <ellipse cx="60" cy="119" rx="8" ry="13" fill="#efb28c"/>
      <ellipse cx="180" cy="119" rx="8" ry="13" fill="#efb28c"/>
      <path d="M88 105 Q102 100 108 105 M133 105 Q146 100 153 105" fill="none" stroke="#543b39" strokeWidth="3.5" strokeLinecap="round"/>
      {thinking ? (
        <>
          <ellipse cx="100" cy="117" rx="4.5" ry="6" fill="#2f2b31"/>
          <ellipse cx="143" cy="119" rx="4.5" ry="6" fill="#2f2b31"/>
          <path d="M112 152 Q123 148 135 152" stroke="#a65050" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
        </>
      ) : (
        <>
          <path d="M96 119 Q102 125 109 119 M134 119 Q142 125 149 119" stroke="#2f2b31" strokeWidth="4" strokeLinecap="round" fill="none"/>
          <path d={happy ? 'M100 148 Q121 176 144 146' : 'M107 151 Q120 161 133 151'}
            stroke="#934e48" strokeWidth="4.5" strokeLinecap="round" fill="none"/>
        </>
      )}
      <circle cx="85" cy="137" r="9" fill="#f18984" fillOpacity=".26"/>
      <circle cx="155" cy="137" r="9" fill="#f18984" fillOpacity=".26"/>
      {happy && <g fill="#fde68a">
        <path d="M181 46 l5 13 13 5-13 5-5 13-5-13-13-5 13-5Z"/>
        <path d="M48 78 l3 8 8 3-8 3-3 8-3-8-8-3 8-3Z"/>
      </g>}
    </svg>
  )
}
