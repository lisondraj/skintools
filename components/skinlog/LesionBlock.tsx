import type { StoredLesion } from "@/lib/skinlog/types";

type LesionBlockProps = {
  lesion: StoredLesion;
  compact?: boolean;
};

const ATTR_LABELS: Record<keyof StoredLesion["attributes"], string> = {
  morphology: "Morphology",
  size: "Size",
  color: "Color",
  distribution: "Distribution",
  surface: "Surface",
};

export function LesionBlock({ lesion, compact = false }: LesionBlockProps) {
  return (
    <article className="skinlog-lesion">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={lesion.photo}
        alt={lesion.bodyLocation ?? "Skin finding"}
        className="skinlog-lesion__thumb"
      />
      <div className="skinlog-lesion__body">
        <h3 className="skinlog-lesion__location">
          {lesion.bodyLocation ?? "Location unspecified"}
        </h3>
        {!compact ? (
          <p className="skinlog-lesion__desc">{lesion.description}</p>
        ) : null}
        <ul className="skinlog-lesion__attrs">
          {(
            Object.entries(lesion.attributes) as [
              keyof typeof lesion.attributes,
              string,
            ][]
          )
            .filter(([key]) => !compact || key !== "surface")
            .map(([key, val]) => (
              <li key={key}>
                <span className="skinlog-lesion__attr-label">
                  {ATTR_LABELS[key]}:
                </span>{" "}
                {val}
              </li>
            ))}
        </ul>
      </div>
    </article>
  );
}
