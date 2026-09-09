"use client";

import { useEffect, useState } from "react";

/**
 * Next.js re-mounts `template.tsx` (unlike `layout.tsx`) on every navigation, which is exactly
 * the hook needed for a per-page-transition effect without a full animation library: a plain
 * fade, same 500ms duration as the "Zapisano ✓" fade (organizations/detail-screen.tsx's
 * FadingSaved), so every animated feedback in the app moves at the same speed.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className={`transition-opacity duration-500 ease-out ${visible ? "opacity-100" : "opacity-0"}`}>
      {children}
    </div>
  );
}
