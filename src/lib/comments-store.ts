// In-memory comments store for real user comments
export const portfolioComments = new Map<string, any[]>();

// Server-side-only lookup of each in-memory comment's immutable author
// canonical profile id (see resolveCanonicalProfileId), keyed by comment id.
// Deliberately NOT a field on the comment objects above, since those objects
// are returned directly in API responses (GET/POST) — keeping this identity
// in a separate map avoids exposing it to the client.
export const commentAuthorProfileIds = new Map<string, string>();
