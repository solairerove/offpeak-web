import type { CityData } from '../types';

interface Props {
  cities: CityData[];
  selected: string;
  onSelect: (slug: string) => void;
}

export default function CitySelector({ cities, selected, onSelect }: Props) {
  return (
    <div className="flex gap-1 bg-gray-800 p-1 rounded-lg">
      {cities.map(c => (
        <button
          key={c.slug}
          onClick={() => onSelect(c.slug)}
          className={`
            px-4 py-1.5 rounded-md text-sm font-medium transition-all
            ${selected === c.slug
              ? 'bg-white text-gray-900'
              : 'text-gray-400 hover:text-white'
            }
          `}
        >
          {c.city}
        </button>
      ))}
    </div>
  );
}
