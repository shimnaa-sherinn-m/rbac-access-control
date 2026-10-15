export const BRANCHES = [
  { id: 'HO', name: 'Head Office' },
  { id: 'KCH', name: 'Kochi Branch' },
  { id: 'CLT', name: 'Calicut Branch' },
  { id: 'MPM', name: 'Malappuram Branch' },
  { id: 'TCR', name: 'Thrissur Branch' },
];

export const BRANCH_IDS = new Set(BRANCHES.map((b) => b.id));
