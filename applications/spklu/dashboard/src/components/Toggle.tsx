interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export default function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <div className="toggle-field">
      <span>{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={label}
          className={'switch' + (checked ? ' on' : '')}
          onClick={() => onChange(!checked)}
        >
          <span className="knob" />
        </button>
        <span className={'switch-state' + (checked ? ' on' : '')}>{checked ? 'ON' : 'OFF'}</span>
      </div>
    </div>
  );
}
