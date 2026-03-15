export default function MFTLogo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="13" fill="#111827"/>
      <g transform="translate(8,8)">
        <polygon points="24,3 26.8,9.2 33.5,9.2 28.3,13.2 30.5,19.5 24,15.6 17.5,19.5 19.7,13.2 14.5,9.2 21.2,9.2" fill="#FFD700"/>
        <rect x="6"    y="22" width="5.5" height="15" rx="1.2" fill="#FFD700"/>
        <rect x="6"    y="20" width="5.5" height="3"  fill="#FFA500"/>
        <rect x="6"    y="36" width="5.5" height="3"  fill="#E07800"/>
        <rect x="13.5" y="18" width="5.5" height="22" rx="1.2" fill="#22C55E"/>
        <rect x="13.5" y="16" width="5.5" height="3"  fill="#16A34A"/>
        <rect x="13.5" y="39" width="5.5" height="3"  fill="#14532d"/>
        <rect x="21"   y="25" width="5.5" height="11" rx="1.2" fill="#FFD700"/>
        <rect x="21"   y="23" width="5.5" height="3"  fill="#FFA500"/>
        <rect x="21"   y="35" width="5.5" height="3"  fill="#E07800"/>
        <rect x="28.5" y="20" width="5.5" height="19" rx="1.2" fill="#22C55E"/>
        <rect x="28.5" y="18" width="5.5" height="3"  fill="#16A34A"/>
        <rect x="28.5" y="38" width="5.5" height="3"  fill="#14532d"/>
        <rect x="36"   y="27" width="5.5" height="10" rx="1.2" fill="#FFD700"/>
        <rect x="36"   y="25" width="5.5" height="3"  fill="#FFA500"/>
        <rect x="36"   y="36" width="5.5" height="3"  fill="#E07800"/>
        <path d="M8.5 30 L16.5 25.5 L24 28.5 L32 23 L39 27" stroke="#22C55E" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="39" cy="27" r="2.2" fill="#22C55E"/>
        <rect x="9"  y="43" width="30" height="4.5" rx="2.2" fill="#FFD700" opacity="0.92"/>
        <rect x="19" y="47.5" width="10" height="2" rx="1" fill="#FFD700" opacity="0.55"/>
        <rect x="5"  y="45"  width="16" height="2" rx="1" fill="#FFD700" opacity="0.2"/>
        <rect x="27" y="45"  width="16" height="2" rx="1" fill="#FFD700" opacity="0.2"/>
      </g>
    </svg>
  );
}
