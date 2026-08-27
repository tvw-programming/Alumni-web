// Package moderation runs uploaded media past Cloud Vision SafeSearch before
// anyone else can see it.
//
// Asynchronous by design. The upload finishes when the bytes land; moderation
// happens after, and the gallery simply does not return anything still pending.
// Making the client wait for Vision would tie an interactive upload to a
// third-party latency we do not control, and failing the upload because Vision
// was slow would be the worst of both.
//
// The default is deny: a row stays invisible unless something positively
// approves it. A Vision outage therefore delays publication rather than opening
// a hole, which is the correct way for this to break.
package moderation

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	vision "cloud.google.com/go/vision/apiv1"
	"github.com/googleapis/gax-go/v2"
	visionpb "google.golang.org/genproto/googleapis/cloud/vision/v1"
)

// Verdict is what the callback writes back to media_gallery.moderation_status.
type Verdict string

const (
	Approved Verdict = "approved"
	Rejected Verdict = "rejected"
	// Failed means Vision could not answer. Distinct from Rejected on purpose:
	// an admin can retry a Failed item, while Rejected is a decision.
	Failed Verdict = "failed"
)

// Anything at or above these likelihoods is refused. Adult and Violence are
// held to a stricter bar than Racy, which fires on ordinary beach photographs
// often enough that treating it as equivalent would reject real alumni content.
var thresholds = map[string]visionpb.Likelihood{
	"adult":    visionpb.Likelihood_LIKELY,
	"violence": visionpb.Likelihood_LIKELY,
	"racy":     visionpb.Likelihood_VERY_LIKELY,
	"medical":  visionpb.Likelihood_VERY_LIKELY,
	"spoof":    visionpb.Likelihood_VERY_LIKELY,
}

// Matches the generated client exactly, variadic call options included — an
// interface that is one option short of the real signature does not accept the
// real client, and the mismatch only shows up at the wiring.
type Annotator interface {
	DetectSafeSearch(ctx context.Context, img *visionpb.Image, ictx *visionpb.ImageContext,
		opts ...gax.CallOption) (*visionpb.SafeSearchAnnotation, error)
}

type Service struct {
	client Annotator
	bucket string
}

func New(client *vision.ImageAnnotatorClient, bucket string) *Service {
	return &Service{client: client, bucket: bucket}
}

// Result carries the decision and the evidence behind it. The labels are stored
// as JSONB so a rejected item can be explained to the person who uploaded it,
// and so a threshold change can be replayed against past decisions.
type Result struct {
	Verdict Verdict         `json:"verdict"`
	Labels  json.RawMessage `json:"labels"`
}

// Inspect reads the object straight from the bucket by URI — the image bytes
// never transit this service.
func (s *Service) Inspect(ctx context.Context, objectPath string) (Result, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	img := vision.NewImageFromURI(fmt.Sprintf("gs://%s/%s", s.bucket, objectPath))

	annotation, err := s.client.DetectSafeSearch(ctx, img, nil)
	if err != nil {
		// Failed, not Rejected: the media stays hidden and stays retryable.
		return Result{Verdict: Failed, Labels: json.RawMessage(`{}`)}, fmt.Errorf("safesearch: %w", err)
	}

	scores := map[string]string{
		"adult":    annotation.GetAdult().String(),
		"violence": annotation.GetViolence().String(),
		"racy":     annotation.GetRacy().String(),
		"medical":  annotation.GetMedical().String(),
		"spoof":    annotation.GetSpoof().String(),
	}
	labels, err := json.Marshal(scores)
	if err != nil {
		return Result{Verdict: Failed, Labels: json.RawMessage(`{}`)}, err
	}

	verdict := Approved
	for name, limit := range thresholds {
		if likelihoodOf(annotation, name) >= limit {
			verdict = Rejected
			break
		}
	}
	return Result{Verdict: verdict, Labels: labels}, nil
}

func likelihoodOf(a *visionpb.SafeSearchAnnotation, name string) visionpb.Likelihood {
	switch name {
	case "adult":
		return a.GetAdult()
	case "violence":
		return a.GetViolence()
	case "racy":
		return a.GetRacy()
	case "medical":
		return a.GetMedical()
	case "spoof":
		return a.GetSpoof()
	}
	return visionpb.Likelihood_UNKNOWN
}
