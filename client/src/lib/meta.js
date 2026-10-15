import { useEffect, useState } from 'react';
import { api } from '../api.js';

let cache = null;

export function resetMeta() {
  cache = null;
}

function loadMeta() {
  if (!cache) {
    cache = Promise.all([api.get('/permissions'), api.get('/branches')])
      .then(([permissions, branches]) => ({ catalog: permissions.modules, branches: branches.branches }))
      .catch((error) => {
        cache = null;
        throw error;
      });
  }
  return cache;
}

export function useMeta() {
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    loadMeta().then(
      (value) => active && setMeta(value),
      (err) => active && setError(err),
    );
    return () => {
      active = false;
    };
  }, []);

  return { catalog: meta?.catalog, branches: meta?.branches, loading: !meta && !error, error };
}

export const branchName = (branches, id) => branches?.find((b) => b.id === id)?.name ?? id;
