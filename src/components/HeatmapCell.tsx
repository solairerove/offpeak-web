import { getTextColor } from '../lib/colors';

interface Props {
  value: string | number;
  bgColor: string;
  isSelected: boolean;
  onClick: () => void;
}

export default function HeatmapCell({ value, bgColor, isSelected, onClick }: Props) {
  const textColor = getTextColor(bgColor);
  return (
    <div
      onClick={onClick}
      className={`
        flex items-center justify-center h-11 text-xs font-semibold cursor-pointer
        transition-all select-none border-2
        ${isSelected ? 'border-teal-400 scale-105 z-10 relative shadow-lg shadow-teal-900/40' : 'border-transparent'}
      `}
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      {value}
    </div>
  );
}
