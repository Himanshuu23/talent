/* eslint-disable @next/next/no-img-element */
export default function Avatar({
  name,
  src,
  size = 32,
  className = "",
}: {
  name?: string;
  src?: string;
  size?: number;
  className?: string;
}) {
  const initials = (name || "?").trim().slice(0, 2).toUpperCase();
  const style = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.4)) };
  if (src) {
    return (
      <img
        src={src}
        alt={name || "avatar"}
        referrerPolicy="no-referrer"
        className={`shrink-0 rounded-full object-cover ${className}`}
        style={style}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-rose-500 font-semibold text-zinc-950 ${className}`}
      style={style}
    >
      {initials}
    </span>
  );
}
