import type { StoredLesion } from "@/lib/skinlog/types";

type FindingListProps = {
  lesions: StoredLesion[];
};

export function FindingList({ lesions }: FindingListProps) {
  return (
    <div className="skinlog-finding-list">
      {lesions.map((lesion, index) => (
        <div key={lesion.id} className="skinlog-finding">
          <div className="skinlog-finding__header">
            <span className="skinlog-finding__number">{index + 1}</span>
            <span className="skinlog-finding__location">
              {lesion.bodyLocation ?? "Location unspecified"}
            </span>
          </div>
          <p className="skinlog-finding__desc">{lesion.description}</p>
        </div>
      ))}
    </div>
  );
}
