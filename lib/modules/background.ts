import type { CSSProperties } from "react";

export function isSlideBackgroundImage(background: string): boolean {
  const value = background.trim();
  return (
    value.startsWith("data:image/") ||
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("blob:")
  );
}

export function slideBackgroundStyle(background: string): CSSProperties {
  if (isSlideBackgroundImage(background)) {
    return {
      backgroundImage: `url(${background})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    };
  }
  return { background };
}
