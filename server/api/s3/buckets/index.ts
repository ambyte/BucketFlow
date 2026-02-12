import { listBuckets } from "../../../utils/s3";
import { requireAuth, requireS3Destination } from "../../../utils/helpers";

export default defineEventHandler(async (event) => {
  requireAuth(event);

  const query = getQuery(event);
  const id = query.id as string;

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "id parameter is required",
    });
  }

  const destination = await requireS3Destination(event, id);
  const bucketFilter = destination.bucketNames?.length
    ? destination.bucketNames
    : undefined;
  const buckets = await listBuckets(destination, bucketFilter);

  return { buckets };
});
