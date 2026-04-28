export function PortalAvatar({ name, photoUrl, size = 36 }: { name: string; photoUrl?: string | null; size?: number }) {
  const initials = name.split(' ').map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
  if (photoUrl) {
    return <img src={photoUrl} alt={name} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <div
      className="rounded-full bg-[#1F4E78]/10 text-[#1F4E78] flex items-center justify-center font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  );
}
