import { listObjects } from "../../../utils/s3";
import {
  requirePublicLink,
  ensurePublicBucketAllowed,
  ensurePublicPrefixAllowed,
  ensurePublicListS3Exists,
  publicListQuerySchema,
} from "../../../utils/publicAccess";
import { validateBody } from "../../../utils/helpers";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const data = validateBody(publicListQuerySchema, query);

  const { link, destination } = await requirePublicLink(data.hash);

  const prefix = data.prefix ?? "";

  ensurePublicBucketAllowed(link, data.bucketName);
  ensurePublicPrefixAllowed(link, prefix);

  await ensurePublicListS3Exists(destination, link, data.bucketName, prefix);

  const result = await listObjects(destination, data.bucketName, prefix);
  return result;
});
