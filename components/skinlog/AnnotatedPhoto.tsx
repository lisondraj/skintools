import type { StoredLesion } from "@/lib/skinlog/types";

type AnnotatedPhotoProps = {
  photo: string;
  lesions: StoredLesion[];
};

export function AnnotatedPhoto({ photo, lesions }: AnnotatedPhotoProps) {
  return (
    <div className="skinlog-annotated">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo}
        alt="Captured skin photo"
        className="skinlog-annotated__img"
      />
      {lesions.map((lesion, index) => {
        const x = lesion.anchorX ?? 0.5;
        const y = lesion.anchorY ?? 0.5;
        return (
          <div
            key={lesion.id}
            className="skinlog-annotated__pin"
            style={{
              left: `${x * 100}%`,
              top: `${y * 100}%`,
            }}
            aria-label={`Finding ${index + 1}: ${lesion.bodyLocation ?? "location unspecified"}`}
          >
            <span className="skinlog-annotated__pin-number">{index + 1}</span>
          </div>
        );
      })}
    </div>
  );
}
