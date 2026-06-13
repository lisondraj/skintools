import type { StoredLesion } from "@/lib/skinlog/types";

type LesionBlockProps = {
  lesion: StoredLesion;
  compact?: boolean;
};

export function LesionBlock({ lesion, compact = false }: LesionBlockProps) {
  return (
    <article className="skinlog-lesion">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={lesion.photo}
        alt={lesion.bodyLocation ?? "Skin lesion"}
        className="skinlog-lesion__thumb"
      />
      <div className="skinlog-lesion__body">
        <h3 className="skinlog-lesion__location">
          {lesion.bodyLocation ?? "Unknown location"}
        </h3>
        {!compact ? (
          <p className="skinlog-lesion__desc">{lesion.description}</p>
        ) : null}
        <ul className="skinlog-lesion__attrs">
          <li>Size: {lesion.attributes.size}</li>
          <li>Color: {lesion.attributes.color}</li>
          <li>Shape: {lesion.attributes.shape}</li>
          <li>Border: {lesion.attributes.border}</li>
          {!compact ? <li>Notes: {lesion.attributes.notes}</li> : null}
        </ul>
      </div>
    </article>
  );
}
