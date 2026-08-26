import { ReviewSummary } from './ReviewSummary';
import sample from './sample.json';

export function ReviewSummaryUsage() {
  return (
    <ReviewSummary
      average={sample.average}
      total={sample.total}
      distribution={sample.distribution}
      verifiedCount={sample.verifiedCount}
      // Filtering by star is the one interaction reviewers actually want.
      onSelectRating={() => {
        // setFilter({ stars })
      }}
    />
  );
}
