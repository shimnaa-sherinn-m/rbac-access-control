import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Spinner } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const DEMO_PASSWORD = 'Password@123';
const DEMO_ACCOUNTS = [
  { email: 'admin@demo.com', label: 'System Administrator', note: 'Manages roles' },
  { email: 'manager@demo.com', label: 'Branch Manager', note: 'Kochi branch only' },
  { email: 'cashier@demo.com', label: 'Cashier', note: 'Kochi branch only' },
  { email: 'accountant@demo.com', label: 'Accountant', note: 'Head Office + Kochi' },
  { email: 'auditor@demo.com', label: 'Auditor', note: 'Read-only, all branches' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-neutral-100">
      <div className="hidden lg:flex lg:w-1/2 xl:w-5/12 bg-brand-950 p-12 flex-col justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-semibold leading-tight text-white">ERP Console</p>
            <p className="text-xs text-neutral-400">Settings</p>
          </div>
        </div>

        <div className="max-w-md space-y-4">
          <h1 className="text-3xl font-bold tracking-tight text-white leading-tight">
            Control who can do what, in every branch.
          </h1>
          <p className="text-sm text-neutral-300 leading-relaxed">
            Role-based permissions, branch scoping, approval thresholds, and complete audit trails for financial institutions.
          </p>
        </div>

        <p className="text-xs text-neutral-400">Enterprise access control &amp; compliance</p>
      </div>

      <div className="flex flex-1 items-center justify-center p-6 sm:p-10 lg:p-12">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-semibold leading-tight text-neutral-900">ERP Console</p>
              <p className="text-xs text-neutral-500">Access control</p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="card p-6 sm:p-8" noValidate>
            <h2 className="text-xl font-semibold text-neutral-900">Sign in</h2>
            <p className="mt-1 text-sm text-neutral-500">Use a demo account below to explore each role.</p>

            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="email" className="label">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="label">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
                  {error}
                </p>
              )}
              <button type="submit" className="btn btn-primary w-full py-2" disabled={busy || !email || !password}>
                {busy && <Spinner className="h-4 w-4 text-white" />}
                Sign in
              </button>
            </div>

            <div className="mt-6 border-t border-neutral-200 pt-5">
              {/* <p className="mb-3 text-xs font-medium text-neutral-500">Demo accounts (password: {DEMO_PASSWORD})</p> */}
              <ul className="space-y-1.5">
                {DEMO_ACCOUNTS.map((account) => (
                  <li key={account.email}>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail(account.email);
                        setPassword(DEMO_PASSWORD);
                        setError('');
                      }}
                      className="flex w-full items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-left text-sm transition hover:border-brand hover:bg-brand-50/50"
                    >
                      <span className="font-medium text-neutral-800">{account.label}</span>
                      <span className="text-xs text-neutral-500">{account.note}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
