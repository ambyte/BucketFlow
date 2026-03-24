import { getPresignedUploadUrl } from "../../../utils/s3";
import {
  requirePublicLink,
  ensurePublicBucketAllowed,
  ensurePublicKeyAllowed,
} from "../../../utils/publicAccess";
import { ensureBucketExists } from "../../../utils/s3";
import { z } from "zod";

const bodySchema = z.object({
  key: z.string().min(1),
  contentType: z.string().min(1),
});

const querySchema = z.object({
  hash: z.string().min(1),
  bucketName: z.string().min(1),
});

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const body = await readBody(event);

  const queryData = querySchema.parse(query);
  const { key, contentType } = bodySchema.parse(body);

  const { link, destination } = await requirePublicLink(queryData.hash);

  ensurePublicBucketAllowed(link, queryData.bucketName);
  ensurePublicKeyAllowed(link, key);

  await ensureBucketExists(destination, queryData.bucketName);

  const isFolder = contentType === "application/x-directory";
  if (isFolder) {
    if (!link.allowFolderCreation) {
      throw createError({
        statusCode: 403,
        statusMessage: "Folder creation is not allowed for this link",
      });
    }
  } else {
    if (!link.allowFileUpload) {
      throw createError({
        statusCode: 403,
        statusMessage: "File upload is not allowed for this link",
      });
    }
  }

  const url = await getPresignedUploadUrl(
    destination,
    queryData.bucketName,
    key,
    contentType
  );
  return { url };
});
