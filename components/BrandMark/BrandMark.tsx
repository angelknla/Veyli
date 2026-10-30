type BrandMarkProps = { size?: number; color?: string; accent?: string };
/** The Veyli aperture: a V cut into an open frame. */
const BrandMark = ({ size = 30, color = '#f5f5f5', accent = '#ff3045' }: BrandMarkProps) => {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M5 8h10l9 25 9-25h10L28 43h-8L5 8Z" fill={color} />
      <path d="M33 8h10l-4.1 10H29.4L33 8Z" fill={accent} />
    </svg>
  );
};

export default BrandMark;
