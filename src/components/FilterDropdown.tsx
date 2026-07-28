export type FilterDropdownOption = string | { value: string; label: string };

interface FilterDropdownProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterDropdownOption[];
  /** When set, prepends an empty-value option with this label. */
  allLabel?: string;
}

function optionValue(option: FilterDropdownOption): string {
  return typeof option === 'string' ? option : option.value;
}

function optionLabel(option: FilterDropdownOption): string {
  return typeof option === 'string' ? option : option.label;
}

export function FilterDropdown({
  label,
  value,
  onChange,
  options,
  allLabel,
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
        {allLabel !== undefined ? (
          <option value="">{allLabel}</option>
        ) : null}
        {options.map((option) => {
          const valueKey = optionValue(option);
          return (
            <option key={valueKey} value={valueKey}>
              {optionLabel(option)}
            </option>
          );
        })}
      </select>
    </div>
  );
}
