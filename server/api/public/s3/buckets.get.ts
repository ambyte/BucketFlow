import { ensureBucketExists } from "../../../utils/s3";
import {
  requirePublicLink,
  publicHashQuerySchema,
} from "../../../utils/publicAccess";
import { validateBody } from "../../../utils/helpers";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const { hash } = validateBody(publicHashQuerySchema, query);

  const { link, destination } = await requirePublicLink(hash);

  await ensureBucketExists(destination, link.bucketName);
  return { buckets: [link.bucketName] };
});
