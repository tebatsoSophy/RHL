import { ACTIVITY_STAGES, activityStageIndex } from "../statusHelpers";

// Renders the activity's progress through its actual lifecycle stages.
// If the activity was rejected, the sequence stops and shows a rejected mark.
export default function StatusTracker({ status }) {
  const currentIndex = activityStageIndex(status);
  const rejected = status === "REJECTED";

  return (
    <div>
      <div className="stage-tracker">
        {ACTIVITY_STAGES.map((stage, i) => {
          const done = !rejected && i < currentIndex;
          const current = !rejected && i === currentIndex;
          return (
            <div
              key={stage}
              className={`stage ${done ? "done" : ""} ${current ? "current" : ""}`}
            >
              <span className="dot" />
              {i < ACTIVITY_STAGES.length - 1 && (
                <span className={`line ${done ? "done" : ""}`} />
              )}
            </div>
          );
        })}
        {rejected && (
          <div className="stage rejected">
            <span className="dot" />
          </div>
        )}
      </div>
      <div className="stage-labels">
        {rejected ? (
          <span>Rejected</span>
        ) : (
          <>
            <span>Pending</span>
            <span>In progress</span>
            <span>Under review</span>
            <span>Approved</span>
          </>
        )}
      </div>
    </div>
  );
}
