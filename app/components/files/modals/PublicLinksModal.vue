<template>
  <UModal
    v-model:open="isOpen"
    title="Manage Public Links"
    :ui="{ content: 'max-w-2xl' }"
  >
    <template #body>
      <div class="space-y-4">
        <p
          v-if="!props.destinationId"
          class="text-muted"
        >
          Select a destination first.
        </p>

        <div v-else>
          <div
            v-if="isLoading"
            class="flex items-center gap-2 py-4"
          >
            <UIcon
              name="i-heroicons-arrow-path"
              class="w-5 h-5 animate-spin text-primary"
            />
            <span class="text-muted">Loading links...</span>
          </div>

          <div
            v-else-if="links.length === 0"
            class="text-center py-8"
          >
            <UIcon
              name="i-heroicons-link"
              class="w-12 h-12 mx-auto mb-4 text-muted"
            />
            <p class="text-muted">
              No public links for this destination yet.
            </p>
            <p class="text-sm text-muted mt-1">
              Create links from the file manager (Public Link button next to
              Upload).
            </p>
          </div>

          <div
            v-else
            class="space-y-2 max-h-[400px] overflow-y-auto"
          >
            <div
              v-for="link in links"
              :key="link.id"
              class="flex items-center justify-between gap-4 p-3 border border-default rounded-lg"
            >
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-highlighted truncate">
                  {{ link.bucketName }}{{ link.path ? `/${link.path}` : "" }}
                </p>
                <p class="text-xs text-muted truncate mt-0.5">
                  Created {{ formatDateTime(link.createdAt) }}
                </p>
                <p
                  v-if="link.expiresAt"
                  class="text-xs truncate mt-0.5"
                  :class="isExpired(link) ? 'text-error' : 'text-muted'"
                >
                  {{ isExpired(link) ? 'Expired' : `Expires ${formatDateTime(link.expiresAt)}` }}
                </p>
                <p
                  v-else
                  class="text-xs text-muted truncate mt-0.5"
                >
                  Permanent
                </p>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <UButton
                  variant="ghost"
                  size="xs"
                  icon="i-heroicons-pencil-square"
                  :disabled="isExpired(link)"
                  @click="openEdit(link)"
                />
                <UButton
                  variant="ghost"
                  size="xs"
                  icon="i-heroicons-clipboard"
                  @click="copyLinkUrl(link)"
                />
                <UButton
                  variant="ghost"
                  size="xs"
                  icon="i-heroicons-arrow-top-right-on-square"
                  @click="openLink(link)"
                />
                <UButton
                  variant="ghost"
                  size="xs"
                  icon="i-heroicons-trash"
                  color="error"
                  :loading="deletingId === link.id"
                  @click="confirmDelete(link)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
    <template #footer="{ close }">
      <UButton
        variant="outline"
        color="neutral"
        label="Close"
        @click="close"
      />
    </template>
  </UModal>

  <!-- Delete confirmation modal -->
  <UModal
    v-model:open="showDeleteConfirm"
    title="Delete public link"
    :ui="{ content: 'max-w-md' }"
  >
    <template #body>
      <p class="text-default">
        Delete public link to
        <span class="font-semibold">{{ linkToDelete?.bucketName
        }}{{
          linkToDelete?.path
            ? ` /
          ${linkToDelete.path}`
            : ""
        }}</span>? Anyone with this link will no longer be able to access it.
      </p>
    </template>
    <template #footer="{ close: closeDelete }">
      <UButton
        variant="outline"
        color="neutral"
        @click="closeDelete"
      >
        Cancel
      </UButton>
      <UButton
        color="error"
        :loading="isDeleting"
        @click="doDelete(closeDelete)"
      >
        Delete
      </UButton>
    </template>
  </UModal>

  <PublicLinkModal
    v-model:open="showEditModal"
    :destination-id="linkToEdit?.destinationId ?? props.destinationId"
    :bucket-name="linkToEdit?.bucketName"
    :path="linkToEdit?.path"
    :edit-link="linkToEdit ?? undefined"
    @saved="onEditSaved"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { PublicLink } from '../../../types'
import { formatDateTime } from '../../../utils/formatters'

const props = defineProps<{
  open: boolean
  destinationId?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const isOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})

const {
  fetchPublicLinks: fetchPublicLinksApi,
  deletePublicLink: deletePublicLinkApi
} = useAppContext()

const links = ref<PublicLink[]>([])
const isLoading = ref(false)
const deletingId = ref<string | null>(null)
const showDeleteConfirm = ref(false)
const linkToDelete = ref<PublicLink | null>(null)
const isDeleting = ref(false)
const showEditModal = ref(false)
const linkToEdit = ref<PublicLink | null>(null)

const appConfig = useAppConfig()
const colorMode = useColorMode()

const isExpired = (link: PublicLink): boolean =>
  !!link.expiresAt && new Date(link.expiresAt) < new Date()

const buildLinkUrl = (link: PublicLink) => {
  if (typeof window === 'undefined' || !link.hash) return ''
  const url = new URL(`${window.location.origin}/public`)
  url.searchParams.set('path', link.hash)
  const primary = appConfig.ui?.colors?.primary || 'emerald'
  const neutral = appConfig.ui?.colors?.neutral || 'zinc'
  const theme = colorMode.preference || 'light'
  url.searchParams.set('primary', primary)
  url.searchParams.set('neutral', neutral)
  url.searchParams.set('theme', theme)
  return url.toString()
}

const fetchLinks = async () => {
  if (!props.destinationId) return
  isLoading.value = true
  try {
    links.value = await fetchPublicLinksApi(props.destinationId)
  } catch (error: unknown) {
    const err = error as { data?: { statusMessage?: string }, message?: string }
    useToast().add({
      title: 'Failed to load links',
      description: err?.data?.statusMessage || err?.message,
      color: 'error'
    })
    links.value = []
  } finally {
    isLoading.value = false
  }
}

const copyLinkUrl = async (link: PublicLink) => {
  const url = buildLinkUrl(link)
  if (!url) return
  try {
    await navigator.clipboard.writeText(url)
    useToast().add({
      title: 'Copied',
      description: 'Link copied to clipboard',
      color: 'success'
    })
  } catch {
    useToast().add({
      title: 'Failed to copy',
      color: 'error'
    })
  }
}

const openLink = (link: PublicLink) => {
  const url = buildLinkUrl(link)
  if (url) window.open(url, '_blank')
}

const openEdit = (link: PublicLink) => {
  linkToEdit.value = link
  showEditModal.value = true
}

const onEditSaved = () => {
  void fetchLinks()
  linkToEdit.value = null
}

const confirmDelete = (link: PublicLink) => {
  linkToDelete.value = link
  showDeleteConfirm.value = true
}

const doDelete = async (closeDelete: () => void) => {
  if (!linkToDelete.value) return
  isDeleting.value = true
  deletingId.value = linkToDelete.value.id
  try {
    await deletePublicLinkApi(linkToDelete.value.id)
    links.value = links.value.filter(
      (l: PublicLink) => l.id !== linkToDelete.value!.id
    )
    useToast().add({
      title: 'Link deleted',
      color: 'success'
    })
    closeDelete()
    linkToDelete.value = null
  } catch (error: unknown) {
    const err = error as { data?: { statusMessage?: string }, message?: string }
    useToast().add({
      title: 'Failed to delete',
      description: err?.data?.statusMessage || err?.message,
      color: 'error'
    })
  } finally {
    isDeleting.value = false
    deletingId.value = null
  }
}

watch(
  [isOpen, () => props.destinationId],
  ([open, destId]) => {
    if (open && destId) {
      fetchLinks()
    }
  },
  { immediate: true }
)

watch(showEditModal, (open) => {
  if (!open) linkToEdit.value = null
})
</script>
