"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // almacenamiento no disponible: la preferencia dura solo la sesión
    }
  }

  // Placeholder estable hasta montar (evita mismatch de hidratación).
  if (dark === null) {
    return <span className="inline-block h-8 w-20" />;
  }

  return (
    <button
      onClick={toggle}
      className="rounded border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-800"
      title={dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
    >
      {dark ? "Claro" : "Oscuro"}
    </button>
  );
}
