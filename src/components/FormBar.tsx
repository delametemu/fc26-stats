interface Props {
  form: ("W" | "L" | "D" | "-")[];
}

export default function FormBar({ form }: Props) {
  return (
    <div className="form-bar" aria-label="Recent form">
      {form.map((result, i) => (
        <span key={i} className={`form-pill form-${result.toLowerCase()}`} title={result === "-" ? "No data" : result}>
          {result === "-" ? "·" : result}
        </span>
      ))}
    </div>
  );
}
