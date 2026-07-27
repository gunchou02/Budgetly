import type { AmountInputEvent } from '@/types/forms';

function formatAmountInput(value: number | string) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits ? Number(digits).toLocaleString('ja-JP') : '';
}

function parseAmountInput(value: string) {
  return value.replace(/\D/g, '');
}

interface AmountInputProps {
  name: string;
  value: number | string;
  onChange: (event: AmountInputEvent) => void;
  required?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
}

export default function AmountInput({
  name,
  value,
  onChange,
  required = false,
  inputRef,
}: AmountInputProps) {
  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    onChange({
      target: {
        checked: false,
        name,
        type: 'text',
        value: parseAmountInput(event.target.value),
      },
    });
  }

  return (
    <div className="amount-input-wrap">
      <span>¥</span>
      <input
        ref={inputRef}
        name={name}
        type="text"
        inputMode="numeric"
        value={formatAmountInput(value)}
        onChange={handleChange}
        required={required}
      />
    </div>
  );
}
