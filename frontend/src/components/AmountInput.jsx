function formatAmountInput(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits ? Number(digits).toLocaleString('ja-JP') : '';
}

function parseAmountInput(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function AmountInput({ name, value, onChange, required = false }) {
  function handleChange(event) {
    onChange({
      ...event,
      target: {
        ...event.target,
        name,
        value: parseAmountInput(event.target.value),
      },
    });
  }

  return (
    <div className="amount-input-wrap">
      <span>¥</span>
      <input
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

export default AmountInput;
