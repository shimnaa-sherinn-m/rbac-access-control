import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Modal from './Modal.jsx';
import { Spinner } from './ui.jsx';

export default function CloneRoleModal({ role, onClose, onCloned }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (role) {
      setName(`${role.name} (Copy)`.slice(0, 100));
      setDescription(role.description ?? '');
      setError('');
    }
  }, [role]);

  async function submit(event) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Role name is required');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await api.post(`/roles/${role.id}/clone`, { name: name.trim(), description });
      onCloned(res.role);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={Boolean(role)}
      title="Clone role"
      onClose={busy ? () => {} : onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form="clone-role-form" className="btn btn-primary" disabled={busy}>
            {busy && <Spinner className="h-4 w-4 text-white" />}
            Clone role
          </button>
        </>
      }
    >
      <form id="clone-role-form" onSubmit={submit} className="space-y-4" noValidate>
        <p className="text-sm text-neutral-500">
          Creates a new active role with the same permissions, branch scope and approval settings as <strong>{role?.name}</strong>.
        </p>
        <div>
          <label htmlFor="clone-name" className="label">
            New role name <span className="text-rose-500">*</span>
          </label>
          <input
            id="clone-name"
            className={`input ${error ? 'input-error' : ''}`}
            value={name}
            maxLength={100}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            autoFocus
          />
          {error && <p className="field-error">{error}</p>}
        </div>
        <div>
          <label htmlFor="clone-description" className="label">
            Description
          </label>
          <textarea
            id="clone-description"
            className="input min-h-[80px]"
            rows={3}
            maxLength={500}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
}
