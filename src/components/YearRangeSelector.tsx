interface Props {
  years: number[];
  selected: number[];
  onSelect: (years: number[]) => void;
}

export default function YearRangeSelector({ years, selected, onSelect }: Props) {
  function toggle(year: number) {
    if (selected.includes(year)) {
      if (selected.length > 1) onSelect(selected.filter(y => y !== year));
    } else {
      onSelect([...selected, year].sort());
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-slate-600 uppercase tracking-widest font-medium hidden sm:block">Years</span>
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
                  ? 'bg-teal-800/60 border-teal-700/60 text-teal-300'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-500 hover:text-slate-300'
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
