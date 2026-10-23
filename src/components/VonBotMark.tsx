/** Custom, vector VonBot robot/chip mark. SVG scales from app header to favicon sizes. */
export default function VonBotMark({size=34}: {size?:number}) {
  return <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="VonBot robot-chip icon" xmlns="http://www.w3.org/2000/svg">
    <rect x="15" y="17" width="34" height="33" rx="10" fill="#fff" stroke="#b5e5ff" strokeWidth="3"/>
    <path d="M32 17V10M27 10h10M9 25h6M9 36h6M49 25h6M49 36h6M23 50v5M41 50v5" stroke="#fff" strokeWidth="4" strokeLinecap="round"/>
    <rect x="21" y="26" width="22" height="13" rx="6.5" fill="#1769bc"/>
    <circle cx="27.5" cy="32.5" r="2.1" fill="#66f3c3"/><circle cx="36.5" cy="32.5" r="2.1" fill="#66f3c3"/>
    <path d="M28 44h8" stroke="#1769bc" strokeWidth="2.4" strokeLinecap="round"/>
    <circle cx="32" cy="9" r="3.2" fill="#66f3c3"/>
  </svg>;
}
