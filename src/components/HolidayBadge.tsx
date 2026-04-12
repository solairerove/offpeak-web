import type { Holiday } from '../types';

interface Props {
  holidays: Holiday[];
}

const IMPACT_ORDER = ['extreme', 'very_high', 'high', 'moderate', 'low', 'none'];

const IMPACT_STYLES: Record<string, string> = {
  extreme:   'bg-red-600 text-white',
  very_high: 'bg-orange-500 text-white',
  high:      'bg-amber-500 text-white',
  moderate:  'bg-yellow-400 text-gray-900',
  low:       'bg-green-600 text-white',
};

const IMPACT_LABEL: Record<string, string> = {
  extreme:   'Extreme',
  very_high: 'V.High',
  high:      'High',
  moderate:  'Mod',
  low:       'Low',
};

export default function HolidayBadge({ holidays }: Props) {
  if (holidays.length === 0) {
    return <div className="h-5" />;
  }

  const worst = [...holidays].sort(
    (a, b) => IMPACT_ORDER.indexOf(a.crowd_impact) - IMPACT_ORDER.indexOf(b.crowd_impact)
  )[0];

  return (
    <div className="h-5 flex items-center">
      <div
        title={holidays.map(h => h.name).join(', ')}
        className={`text-[9px] font-bold px-1 rounded truncate leading-4 ${IMPACT_STYLES[worst.crowd_impact] ?? 'bg-gray-500 text-white'}`}
      >
        {holidays.length > 1 ? `×${holidays.length}` : IMPACT_LABEL[worst.crowd_impact]}
      </div>
    </div>
  );
}
