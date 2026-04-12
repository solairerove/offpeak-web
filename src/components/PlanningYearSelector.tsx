interface Props {
  years: number[];
  selected: number;
  onSelect: (year: number) => void;
}

export default function PlanningYearSelector({ years, selected, onSelect }: Props) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 uppercase tracking-wider">Visiting in</span>
      <div className="flex gap-1">
        {years.map(y => (
          <button
            key={y}
            onClick={() => onSelect(y)}
            className={`
              px-2.5 py-1 rounded text-xs font-medium transition-all border
              ${selected === y
                ? 'bg-indigo-700 border-indigo-500 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300'
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
