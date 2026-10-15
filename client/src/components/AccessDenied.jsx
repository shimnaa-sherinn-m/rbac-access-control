import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MODULE_ACCESS_DENIED_MESSAGE } from '../lib/constants.js';

export default function AccessDenied() {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
        <ShieldAlert className="h-6 w-6" />
      </div>
      <h1 className="text-xl font-semibold text-neutral-900">Access denied</h1>
      <p className="max-w-sm text-sm text-neutral-500">
        {MODULE_ACCESS_DENIED_MESSAGE} Only System Administrators can manage roles and permissions.
      </p>
      <Link to="/access-control/access-check" className="btn btn-primary">
        View my access
      </Link>
    </div>
  );
}
