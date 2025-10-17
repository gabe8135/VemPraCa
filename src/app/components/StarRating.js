"use client";

import { useState } from "react";
import { MdOutlineStar, MdOutlineStarBorder } from "react-icons/md";

// Componente controlado
export default function StarRating({
  value,
  onChange,
  disabled = false,
  size = 36,
  className = "",
}) {
  const [hover, setHover] = useState(0);

  return (
    <div
      className={`inline-flex items-center gap-1 text-yellow-400 ${className}`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => !disabled && onChange?.(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-110 disabled:opacity-50"
          disabled={disabled}
          aria-label={`${n} estrelas`}
        >
          {(hover || value) >= n ? (
            <MdOutlineStar style={{ width: size, height: size }} />
          ) : (
            <MdOutlineStarBorder style={{ width: size, height: size }} />
          )}
        </button>
      ))}
    </div>
  );
}
