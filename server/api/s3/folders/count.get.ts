import { listAllKeysUnderPrefix } from "../../../utils/s3";
import { requireAuth, requireS3Destination, ensureBucketAllowed } from "../../../utils/helpers";

export default defineEventHandler(async (event) => {
  requireAuth(event);

  const query = getQuery(event);
  const id = query.id as string;
  const bucketName = query.bucketName as string;
  const prefix = (query.prefix as string) || "";

  if (!id || !bucketName) {
    throw createError({
      statusCode: 400,
      statusMessage: "id and bucketName parameters are required",
    });
  }

  const destination = await requireS3Destination(event, id);
  ensureBucketAllowed(destination, bucketName);
  const keys = await listAllKeysUnderPrefix(destination, bucketName, prefix);
  return { count: keys.length - 1 };
});
