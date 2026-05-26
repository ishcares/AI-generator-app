import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Zap, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { InlineSpinner } from '../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

const STRENGTH_COLORS = ['#EF4444', '#F59E0B', '#0F6E56', '#534AB7'];
const STRENGTH_LABELS = ['Weak', 'Fair', 'Good', 'Strong'];

function passwordStrength(pwd) {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 8)            score++;
  if (/[A-Z]/.test(pwd))         score++;
  if (/[0-9]/.test(pwd))         score++;
  if (/[^a-zA-Z0-9]/.test(pwd)) score++;
  return score;
}

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate     = useNavigate();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [errors,   setErrors]   = useState({});

  const strength = passwordStrength(password);

  function validate() {
    const errs = {};
    if (!email)    errs.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email.';
    if (!password || password.length < 8) errs.password = 'Password must be at least 8 characters.';
    if (password !== confirm) errs.confirm = 'Passwords do not match.';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      await register(email, password);
      toast.success('Account created! Welcome aboard 🎉');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error || 'Registration failed. Please try again.';
      toast.error(msg);
      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <Zap size={20} />
          </div>
          <span className="auth-logo-text">AppGen</span>
        </div>

        <h2 style={{ textAlign: 'center', marginBottom: '0.25rem', fontSize: '1.25rem' }}>
          Create your account
        </h2>
        <p style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--color-text-3)', fontSize: '0.875rem' }}>
          Build apps from JSON in minutes
        </p>

        {errors.general && (
          <div style={{
            background: 'var(--color-error-bg)',
            border: '1px solid #F5C3C3',
            borderRadius: 'var(--radius-md)',
            padding: '0.625rem 0.875rem',
            color: 'var(--color-error-text)',
            fontSize: '0.875rem',
            marginBottom: '1.25rem',
          }}>
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              type="email"
              className={`form-input ${errors.email ? 'error' : ''}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
            />
            {errors.email && <span className="form-error">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="reg-password"
                type={showPwd ? 'text' : 'password'}
                className={`form-input ${errors.password ? 'error' : ''}`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                style={{
                  position: 'absolute', right: '0.625rem', top: '50%',
                  transform: 'translateY(-50%)', background: 'none',
                  border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', padding: '0.25rem',
                }}
                tabIndex={-1}
              >
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Strength bar */}
            {password && (
              <div>
                <div style={{ display: 'flex', gap: 3, marginTop: 6 }}>
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} style={{
                      flex: 1, height: 3, borderRadius: 2,
                      background: n <= strength ? STRENGTH_COLORS[strength - 1] : 'var(--color-border)',
                      transition: 'background 0.25s',
                    }} />
                  ))}
                </div>
                {strength > 0 && (
                  <span style={{ fontSize: '0.7rem', color: STRENGTH_COLORS[strength - 1], marginTop: 3, display: 'block' }}>
                    {STRENGTH_LABELS[strength - 1]} password
                  </span>
                )}
              </div>
            )}
            {errors.password && <span className="form-error">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-confirm">Confirm Password</label>
            <input
              id="reg-confirm"
              type={showPwd ? 'text' : 'password'}
              className={`form-input ${errors.confirm ? 'error' : ''}`}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your password"
              autoComplete="new-password"
            />
            {confirm && password === confirm && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-success)', fontSize: '0.75rem' }}>
                <CheckCircle size={12} /> Passwords match
              </span>
            )}
            {errors.confirm && <span className="form-error">{errors.confirm}</span>}
          </div>

          <button
            type="submit"
            id="register-btn"
            className="btn btn-primary w-full"
            disabled={loading}
            style={{ marginTop: '0.5rem', justifyContent: 'center', minHeight: 44 }}
          >
            {loading ? <InlineSpinner /> : null}
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <div className="divider" />
        <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--color-text-3)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ fontWeight: 600, color: 'var(--color-primary)' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
