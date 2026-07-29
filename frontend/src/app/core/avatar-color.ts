/**
 * Deterministic per-user avatar color: hashes the user id into a hue and
 * returns a muted HSL background. Same user → same color everywhere, forever.
 */
export function avatarColor(id: string | null | undefined): string {
  if (!id) return 'var(--accent)';
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  const hue = ((hash % 360) + 360) % 360;
  return `hsl(${hue}, 42%, 52%)`;
}
