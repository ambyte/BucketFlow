import { getPublicLinkByHash } from "../../../utils/storage";
import { getDestinationById } from "../../../utils/storage";
import { ensurePublicLinkTargetExistsInS3 } from "../../../utils/publicAccess";

/** Public endpoint: resolve link by hash and return bucket/path access info */
export default defineEventHandler(async (event) => {
  const hash = getRouterParam(event, "hash");
  if (!hash) {
    throw createError({
      statusCode: 400,
      statusMessage: "Hash is required",
    });
  }

  const link = await getPublicLinkByHash(hash);
  if (!link) {
    throw createError({
      statusCode: 404,
      statusMessage: "Public link not found",
    });
  }

  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    throw createError({
      statusCode: 410,
      statusMessage: "This public link has expired",
    });
  }

  const destination = await getDestinationById(link.destinationId);
  if (!destination || !destination.allowPublicAccess) {
    throw createError({
      statusCode: 404,
      statusMessage: "Public link not found",
    });
  }

  await ensurePublicLinkTargetExistsInS3(destination, link);

  return {
    bucket: link.bucketName,
    path: link.path || "",
    allowFileUpload: link.allowFileUpload ?? false,
    allowFolderCreation: link.allowFolderCreation ?? false,
  };
});
