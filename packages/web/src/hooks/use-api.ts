const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
export async function fetchAPI<T>(endpoint: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(API + endpoint, { headers: { 'Content-Type': 'application/json' }, credentials: 'include', ...opts });
  if (!res.ok) throw new Error('API Error: ' + res.status);
  return res.json();
}
