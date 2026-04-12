interface Props {
  years: number[];
  selected: number;
  onSelect: (year: number) => void;
}

export default function PlanningYearSelector({ years, selected, onSelect }: Props) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-slate-600 uppercase tracking-widest font-medium hidden sm:block">Visiting</span>
      <div className="flex gap-1">
        {years.map(y => (
          <button
            key={y}
            onClick={() => onSelect(y)}
            className={`
              px-2.5 py-1 rounded text-xs font-medium transition-all border
              ${selected === y
                ? 'bg-violet-800/60 border-violet-700/60 text-violet-300'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-500 hover:text-slate-300'
              }
            `}
          >
            {y}
          </button>
        ))}
      </div>
    </div>
  );
}
