interface Props {
  years: number[];
  selected: number[];
  onSelect: (years: number[]) => void;
}

export default function YearRangeSelector({ years, selected, onSelect }: Props) {
  function toggle(year: number) {
    if (selected.includes(year)) {
      // Keep at least one year selected
      if (selected.length > 1) {
        onSelect(selected.filter(y => y !== year));
      }
    } else {
      onSelect([...selected, year].sort());
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 uppercase tracking-wider">Years</span>
      <div className="flex gap-1">
        {years.map(y => {
          const active = selected.includes(y);
          return (
            <button
              key={y}
              onClick={() => toggle(y)}
              className={`
                px-2.5 py-1 rounded text-xs font-medium transition-all border
                ${active
                  ? 'bg-sky-700 border-sky-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300'
                }
              `}
            >
              {y}
            </button>
          );
        })}
      </div>
    </div>
  );
}
