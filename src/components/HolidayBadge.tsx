import type { Holiday } from '../types';

interface Props {
  holidays: Holiday[];
}

const IMPACT_STYLES: Record<string, string> = {
  extreme:  'bg-red-600 text-white',
  very_high: 'bg-orange-500 text-white',
  high:     'bg-amber-500 text-white',
  moderate: 'bg-yellow-400 text-gray-900',
  low:      'bg-green-600 text-white',
};

const IMPACT_LABEL: Record<string, string> = {
  extreme:  'Extreme',
  very_high: 'V.High',
  high:     'High',
  moderate: 'Mod',
  low:      'Low',
};

export default function HolidayBadge({ holidays }: Props) {
  if (holidays.length === 0) {
    return <div className="h-6" />;
  }

  return (
    <div className="flex flex-col gap-0.5 min-h-6">
      {holidays.map(h => (
        <div
          key={h.id}
          title={`${h.name} — ${h.notes}`}
          className={`text-[9px] font-bold px-1 rounded truncate leading-4 ${IMPACT_STYLES[h.crowd_impact] ?? 'bg-gray-500 text-white'}`}
        >
          {IMPACT_LABEL[h.crowd_impact]}
        </div>
      ))}
    </div>
  );
}
