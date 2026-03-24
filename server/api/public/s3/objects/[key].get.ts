import { getPresignedDownloadUrl } from "../../../../utils/s3";
import {
  requirePublicLink,
  ensurePublicBucketAllowed,
  ensurePublicKeyAllowed,
  publicObjectQuerySchema,
} from "../../../../utils/publicAccess";
import { ensureBucketExists } from "../../../../utils/s3";
import { validateBody } from "../../../../utils/helpers";

export default defineEventHandler(async (event) => {
  const key = decodeURIComponent(getRouterParam(event, "key") || "");
  if (!key) {
    throw createError({
      statusCode: 400,
      statusMessage: "Key required",
    });
  }

  const query = getQuery(event);
  const data = validateBody(publicObjectQuerySchema, query);

  const { link, destination } = await requirePublicLink(data.hash);

  ensurePublicBucketAllowed(link, data.bucketName);
  ensurePublicKeyAllowed(link, key);

  await ensureBucketExists(destination, data.bucketName);

  const url = await getPresignedDownloadUrl(
    destination,
    data.bucketName,
    key,
    3600,
    data.filename,
  );
  return { url };
});
