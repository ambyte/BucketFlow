import { getPublicLinkById, updatePublicLink } from '../../utils/storage'
import { requireAuth, requireS3Destination, validateBody } from '../../utils/helpers'
import { z } from 'zod'

const updateSchema = z.object({
  allowFileUpload: z.boolean().optional(),
  allowFolderCreation: z.boolean().optional(),
  expiresAt: z.string().optional().nullable()
})

export default defineEventHandler(async (event) => {
  requireAuth(event, 'editor')

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Link ID required'
    })
  }

  const link = await getPublicLinkById(id)
  if (!link) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Public link not found'
    })
  }

  await requireS3Destination(event, link.destinationId)

  const body = await readBody(event)
  const data = validateBody(updateSchema, body)

  const updated = await updatePublicLink(id, {
    ...(data.allowFileUpload !== undefined && { allowFileUpload: data.allowFileUpload }),
    ...(data.allowFolderCreation !== undefined && { allowFolderCreation: data.allowFolderCreation }),
    ...(data.expiresAt !== undefined && { expiresAt: data.expiresAt ?? undefined })
  })

  return { link: updated }
})
