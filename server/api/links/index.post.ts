import {
  createPublicLink,
  generateUniquePublicLinkHash,
  getPublicLinkByHash
} from '../../utils/storage'
import {
  requireAuth,
  requireS3Destination,
  ensureBucketAllowed,
  validateBody,
  canCreatePublicLink
} from '../../utils/helpers'
import { z } from 'zod'

const createSchema = z.object({
  destinationId: z.string().min(1),
  bucketName: z.string().min(1),
  path: z.string().default(''),
  allowFileUpload: z.boolean().optional().default(false),
  allowFolderCreation: z.boolean().optional().default(false),
  hash: z.string().regex(/^[a-f0-9]{16}$/).optional(),
  draft: z.boolean().optional().default(false),
  /** ISO date string when link expires; omit = permanent */
  expiresAt: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const body = await readBody(event)
  const data = validateBody(createSchema, body)

  const destination = await requireS3Destination(event, data.destinationId)
  ensureBucketAllowed(destination, data.bucketName)

  if (!canCreatePublicLink(destination, auth)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Public link creation is not allowed for this destination'
    })
  }

  if (data.draft) {
    const hash = await generateUniquePublicLinkHash()
    return {
      link: {
        hash,
        destinationId: data.destinationId,
        bucketName: data.bucketName,
        path: data.path ?? '',
        allowFileUpload: data.allowFileUpload ?? false,
        allowFolderCreation: data.allowFolderCreation ?? false,
        expiresAt: data.expiresAt
      }
    }
  }

  if (data.hash) {
    const existing = await getPublicLinkByHash(data.hash)
    if (existing) {
      throw createError({
        statusCode: 409,
        statusMessage:
          'Generated public link is no longer available. Please regenerate it.'
      })
    }
  }

  const link = await createPublicLink({
    destinationId: data.destinationId,
    bucketName: data.bucketName,
    path: data.path ?? '',
    allowFileUpload: data.allowFileUpload ?? false,
    allowFolderCreation: data.allowFolderCreation ?? false,
    createdBy: auth.userId,
    hash: data.hash,
    expiresAt: data.expiresAt
  })

  return { link }
})
