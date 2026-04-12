import type { CityData } from '../types';

interface Props {
  cities: CityData[];
  selected: string;
  onSelect: (slug: string) => void;
}

export default function CitySelector({ cities, selected, onSelect }: Props) {
  return (
    <div className="flex gap-0.5">
      {cities.map(c => (
        <button
          key={c.slug}
          onClick={() => onSelect(c.slug)}
          className={`
            px-3 py-1 rounded-md text-sm font-medium transition-all
            ${selected === c.slug
              ? 'bg-gray-800 text-white'
              : 'text-gray-500 hover:text-gray-200'
            }
          `}
        >
          {c.city}
        </button>
      ))}
    </div>
  );
}
