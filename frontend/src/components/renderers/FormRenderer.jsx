import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Save, AlertCircle, X } from 'lucide-react';
import { InlineSpinner } from '../ui/LoadingSpinner';

/**
 * FormRenderer — react-hook-form powered dynamic form.
 * Props:
 *   entity   — { name, fields: [{name, type, required, label, options, hint, ...}] }
 *   initial  — initial data object (for edit mode)
 *   onSubmit — async (data) => void
 *   onCancel — () => void
 *   loading  — boolean
 */
export default function FormRenderer({ entity, initial = {}, onSubmit, onCancel, loading = false }) {
  if (!entity) {
    return (
      <div className="error-state">
        <div className="error-state-icon"><AlertCircle size={22} /></div>
        <p>No entity schema provided to FormRenderer.</p>
      </div>
    );
  }

  const fields = Array.isArray(entity.fields) ? entity.fields : [];

  // Build default values
  const defaultValues = {};
  for (const f of fields) {
    if (!f?.name) continue;
    const v = initial[f.name];
    if (v !== undefined) {
      defaultValues[f.name] = v;
    } else if (f.type === 'boolean') {
      defaultValues[f.name] = false;
    } else {
      defaultValues[f.name] = '';
    }
  }

  const { register, handleSubmit, control, formState: { errors }, setValue, watch } = useForm({ defaultValues });

  async function onFormSubmit(data) {
    // Coerce types
    const coerced = {};
    for (const f of fields) {
      if (!f?.name) continue;
      const v = data[f.name];
      if (v === '' || v === null || v === undefined) {
        coerced[f.name] = null;
      } else if (f.type === 'number') {
        coerced[f.name] = Number(v);
      } else if (f.type === 'boolean') {
        coerced[f.name] = v === true || v === 'true';
      } else {
        coerced[f.name] = v;
      }
    }
    await onSubmit?.(coerced);
  }

  if (fields.length === 0) {
    return (
      <div className="empty-state">
        <p className="text-muted text-sm">This entity has no fields defined.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} noValidate>
      {fields.map((field) => {
        if (!field?.name) return null;
        return (
          <FieldWrapper key={field.name} field={field} errors={errors}>
            <FieldControl
              field={field}
              register={register}
              control={control}
              errors={errors}
              watch={watch}
            />
          </FieldWrapper>
        );
      })}

      <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
        {onCancel && (
          <button type="button" className="btn btn-outline" onClick={onCancel} disabled={loading}>
            <X size={14} />
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth: 120, justifyContent: 'center' }}>
          {loading ? <InlineSpinner /> : <Save size={14} />}
          {loading ? 'Saving…' : 'Save Record'}
        </button>
      </div>
    </form>
  );
}

/* ── Field Wrapper ───────────────────────────────────────── */
function FieldWrapper({ field, errors, children }) {
  const label = field.label || field.name;
  const error = errors[field.name];

  return (
    <div className="form-group">
      {field.type !== 'boolean' && (
        <label className="form-label" htmlFor={`field-${field.name}`}>
          {label}
          {field.required && <span className="required"> *</span>}
        </label>
      )}
      {children}
      {error && (
        <span className="form-error">
          <AlertCircle size={11} /> {error.message}
        </span>
      )}
      {field.hint && !error && (
        <span className="form-hint">{field.hint}</span>
      )}
    </div>
  );
}

/* ── Field Control ───────────────────────────────────────── */
function FieldControl({ field, register, control, errors, watch }) {
  const id = `field-${field.name}`;
  const hasError = !!errors[field.name];
  const cls = `form-input${hasError ? ' error' : ''}`;
  const label = field.label || field.name;

  const type = field.type || 'string';

  // Build react-hook-form validation rules
  const rules = {};
  if (field.required) {
    rules.required = `${label} is required.`;
  }
  if (type === 'email') {
    rules.pattern = {
      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Must be a valid email address.',
    };
  }
  if (type === 'number') {
    rules.validate = (v) => v === '' || !isNaN(Number(v)) || 'Must be a valid number.';
  }
  if (type === 'url') {
    rules.validate = (v) => {
      if (!v) return true;
      try { new URL(v); return true; } catch { return 'Must be a valid URL (include https://).'; }
    };
  }

  try {
    switch (type) {
      case 'boolean':
        return (
          <Controller
            name={field.name}
            control={control}
            render={({ field: f }) => {
              const isOn = f.value === true || f.value === 'true';
              return (
                <label className="toggle-wrapper" htmlFor={id}>
                  <div
                    id={id}
                    className={`toggle ${isOn ? 'on' : ''}`}
                    onClick={() => f.onChange(!isOn)}
                    role="switch"
                    aria-checked={isOn}
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') f.onChange(!isOn); }}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-text-2)', fontWeight: 500 }}>
                    {label}
                    {field.required && <span style={{ color: 'var(--color-error)', marginLeft: 2 }}>*</span>}
                  </span>
                  <span style={{ marginLeft: 4, fontSize: '0.75rem', color: 'var(--color-text-3)' }}>
                    {isOn ? 'Yes' : 'No'}
                  </span>
                </label>
              );
            }}
          />
        );

      case 'text':
        return (
          <textarea
            id={id}
            className={`form-textarea${hasError ? ' error' : ''}`}
            placeholder={field.placeholder || ''}
            {...register(field.name, rules)}
          />
        );

      case 'number':
        return (
          <input
            id={id}
            type="number"
            className={cls}
            placeholder={field.placeholder || '0'}
            step="any"
            {...register(field.name, rules)}
          />
        );

      case 'date':
        return (
          <input
            id={id}
            type="date"
            className={cls}
            {...register(field.name, rules)}
          />
        );

      case 'email':
        return (
          <input
            id={id}
            type="email"
            className={cls}
            placeholder={field.placeholder || 'user@example.com'}
            autoComplete="email"
            {...register(field.name, rules)}
          />
        );

      case 'url':
        return (
          <input
            id={id}
            type="url"
            className={cls}
            placeholder={field.placeholder || 'https://'}
            {...register(field.name, rules)}
          />
        );

      case 'phone':
        return (
          <input
            id={id}
            type="tel"
            className={cls}
            placeholder={field.placeholder || '+1 555 000 0000'}
            {...register(field.name, rules)}
          />
        );

      case 'select':
        if (!Array.isArray(field.options) || field.options.length === 0) {
          // Fall back to text input if no options defined
          return (
            <input id={id} type="text" className={cls} placeholder={field.placeholder || ''} {...register(field.name, rules)} />
          );
        }
        return (
          <select id={id} className={`form-select${hasError ? ' error' : ''}`} {...register(field.name, rules)}>
            <option value="">Select…</option>
            {field.options.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );

      // Unknown type → gray placeholder box
      default:
        if (!['string', 'text', 'email', 'number', 'boolean', 'date', 'url', 'phone', 'select'].includes(type)) {
          return (
            <div style={{
              background: 'var(--color-bg-2)',
              border: '1px dashed var(--color-border-2)',
              borderRadius: 'var(--radius-md)',
              padding: '0.625rem 0.875rem',
              fontSize: '0.8125rem',
              color: 'var(--color-text-3)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <AlertCircle size={14} />
              Unsupported field type: <code>{type}</code>
            </div>
          );
        }
        return (
          <input
            id={id}
            type="text"
            className={cls}
            placeholder={field.placeholder || ''}
            {...register(field.name, rules)}
          />
        );
    }
  } catch {
    // Graceful fallback
    return (
      <input
        id={id}
        type="text"
        className={cls}
        placeholder={field.placeholder || ''}
        {...register(field.name, rules)}
      />
    );
  }
}
