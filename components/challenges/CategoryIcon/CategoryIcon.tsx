import { Film, Gamepad2, Image, Layers, Music, Quote, Scan, Sparkles, Tv } from 'lucide-react';

const icons: Record<string, typeof Film> = {
  film: Film,
  tv: Tv,
  gamepad: Gamepad2,
  music: Music,
  sparkles: Sparkles,
  layers: Layers,
  scan: Scan,
  image: Image,
  quote: Quote,
};

const CategoryIcon = ({ name, size = 20 }: { name: string; size?: number }) => {
  const Icon = icons[name] || Sparkles;
  return <Icon size={size} strokeWidth={2} />;
};

export default CategoryIcon;
