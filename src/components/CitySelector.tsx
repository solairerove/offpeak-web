interface CitySummary {
  slug: string;
  city: string;
}

interface Props {
  cities: CitySummary[];
  selected: string;
  onSelect: (slug: string) => void;
  loadingSlug?: string | null;
}

export default function CitySelector({ cities, selected, onSelect, loadingSlug }: Props) {
  return (
    <div className="flex gap-0.5">
      {cities.map(c => (
        <button
          key={c.slug}
          onClick={() => onSelect(c.slug)}
          className={`
            px-3 py-1 rounded-md text-sm font-medium transition-all
            ${selected === c.slug
              ? 'bg-slate-800 text-white'
              : 'text-slate-500 hover:text-slate-200'
            }
          `}
        >
          {c.city}
          {loadingSlug === c.slug && (
            <span className="ml-1.5 inline-block w-1 h-1 rounded-full bg-current align-middle animate-pulse" />
          )}
        </button>
      ))}
    </div>
  );
}
