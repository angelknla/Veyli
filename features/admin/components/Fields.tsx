import { useEffect, useState } from 'react';
import type { AdminRecord } from '../contracts';

type Option = { value: string; label: string };
export function Field({
  name,
  label,
  value,
  onChange,
  type = 'text',
  options,
  help,
}: {
  name: string;
  label: string;
  value: unknown;
  onChange: (name: string, value: unknown) => void;
  type?: string;
  options?: Option[];
  help?: string;
}) {
  const id = `field-${name}`;
  return (
    <div className={`editor-field ${type === 'textarea' ? 'wide-field' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {options ? (
        <select
          id={id}
          value={String(value ?? '')}
          onChange={(event) => onChange(name, event.target.value)}
        >
          {options.map((option) => (
            <option value={option.value} key={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : type === 'boolean' ? (
        <label className="editor-checkbox">
          <input
            id={id}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => onChange(name, event.target.checked)}
          />
          Enabled
        </label>
      ) : type === 'textarea' ? (
        <textarea
          id={id}
          value={String(value ?? '')}
          onChange={(event) => onChange(name, event.target.value)}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={String(value ?? '')}
          onChange={(event) =>
            onChange(name, type === 'number' ? Number(event.target.value) : event.target.value)
          }
        />
      )}{' '}
      {help && <p>{help}</p>}
    </div>
  );
}
export function options(records: AdminRecord[], label = 'name') {
  return records.map((record) => ({
    value: String(record.id),
    label: String(record[label] ?? record.slug),
  }));
}
export function ListField({
  name,
  label,
  values,
  onChange,
  numeric = false,
  help,
}: {
  name: string;
  label: string;
  values: unknown;
  onChange: (name: string, value: unknown) => void;
  numeric?: boolean;
  help?: string;
}) {
  const text = Array.isArray(values) ? values.join(numeric ? ', ' : '\n') : '';
  const [draft, setDraft] = useState(text);
  useEffect(() => setDraft(text), [text]);
  const id = `list-${name}`;
  const commit = () =>
    onChange(
      name,
      draft
        .split(numeric ? ',' : '\n')
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => (numeric ? Number(part) : part))
    );
  return (
    <div className={`editor-field ${numeric ? '' : 'wide-field'}`}>
      <label htmlFor={id}>{label}</label>
      {numeric ? (
        <input
          id={id}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
        />
      ) : (
        <textarea
          id={id}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
        />
      )}{' '}
      {help && <p>{help}</p>}
    </div>
  );
}
