import { invokeChecked } from "@/composables/useIpc";
import {
  ExportResult,
  ExportResultSchema,
  PackExportPayloadSchema,
  PackInspectPayloadSchema,
  PackInspectResponseSchema,
  PeerReviewDetail,
  PeerReviewDetailSchema,
  PeerReviewGetPayloadSchema,
  PeerReviewImportPayloadSchema,
  PeerReviewImportResponseSchema,
  PeerReviewListPayloadSchema,
  PeerReviewSummary,
  PeerReviewSummarySchema,
} from "@/schemas/ipc";

/**
 * Implements export pack behavior.
 */
export async function exportPack(profileId: string, runId: string): Promise<ExportResult> {
  return invokeChecked("pack_export", PackExportPayloadSchema, ExportResultSchema, {
    profileId,
    runId,
  });
}

/**
 * Implements inspect pack behavior.
 */
export async function inspectPack(profileId: string, path: string) {
  return invokeChecked("pack_inspect", PackInspectPayloadSchema, PackInspectResponseSchema, {
    profileId,
    path,
  });
}

/**
 * Implements import peer review behavior.
 */
export async function importPeerReview(profileId: string, path: string) {
  return invokeChecked(
    "peer_review_import",
    PeerReviewImportPayloadSchema,
    PeerReviewImportResponseSchema,
    {
      profileId,
      path,
    }
  );
}

/**
 * Retrieves get peer reviews from domain/runtime dependencies.
 */
export async function getPeerReviews(
  profileId: string,
  projectId: string,
  limit = 12
): Promise<PeerReviewSummary[]> {
  return invokeChecked(
    "peer_review_list",
    PeerReviewListPayloadSchema,
    PeerReviewSummarySchema.array(),
    { profileId, projectId, limit }
  );
}

/**
 * Retrieves get peer review from domain/runtime dependencies.
 */
export async function getPeerReview(
  profileId: string,
  peerReviewId: string
): Promise<PeerReviewDetail> {
  return invokeChecked("peer_review_get", PeerReviewGetPayloadSchema, PeerReviewDetailSchema, {
    profileId,
    peerReviewId,
  });
}
