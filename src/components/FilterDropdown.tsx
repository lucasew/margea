interface FilterDropdownProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  allLabel?: string;
}

export function FilterDropdown({
  label,
  value,
  onChange,
  options,
  allLabel = 'All',
}: FilterDropdownProps) {
  return (
    <div className="form-control">
      <label className="label py-0.5 min-h-0">
        <span className="label-text text-xs font-medium text-base-content/70">
          {label}
        </span>
      </label>
      <select
        className="select select-bordered select-sm w-full"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
