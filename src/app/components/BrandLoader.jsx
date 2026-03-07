import Image from "next/image";

const sizeMap = {
  sm: 48,
  md: 64,
  lg: 88,
};

export default function BrandLoader({
  message = "Carregando...",
  size = "md",
  fullScreen = false,
  className = "",
  showMessage = true,
}) {
  const dimension = sizeMap[size] || sizeMap.md;
  const logoSize = Math.round(dimension * 0.62);

  return (
    <div
      className={`${fullScreen ? "fixed inset-0 z-[10000] bg-white/95 backdrop-blur-sm" : ""} ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex w-full flex-col items-center justify-center gap-3 py-6">
        <div
          className="relative"
          style={{ width: dimension, height: dimension }}
          aria-hidden="true"
        >
          <span className="absolute inset-0 rounded-full border-2 border-emerald-200 animate-ping motion-reduce:animate-none" />
          <span className="absolute inset-0 rounded-full border-2 border-emerald-400/60 animate-spin motion-reduce:animate-none" />
          <div className="absolute inset-[10%] flex items-center justify-center rounded-full bg-white/90 shadow-md">
            <Image
              src="/favicon.ico"
              alt=""
              width={logoSize}
              height={logoSize}
              priority={fullScreen}
              unoptimized
              className="rounded-full animate-pulse motion-reduce:animate-none"
            />
          </div>
        </div>

        {showMessage ? (
          <p className="text-center text-sm font-semibold text-emerald-800">
            {message}
          </p>
        ) : null}

        <span className="sr-only">{message}</span>
      </div>
    </div>
  );
}
