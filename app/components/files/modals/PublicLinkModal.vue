<template>
  <UModal
    v-model:open="isOpen"
    :title="editLink ? 'Edit Public Link' : 'Create Public Link'"
    :ui="{ content: 'max-w-2xl' }"
  >
    <template #body>
      <div class="space-y-4">
        <UAlert
          color="info"
          variant="soft"
          icon="i-heroicons-information-circle"
          title="Public Access"
          description="This link allows anonymous users to view and download files from this location. Share it carefully."
        />

        <UFormField
          v-if="linkLocation"
          label="Shared path"
        >
          <div class="px-3 py-2 rounded-lg bg-muted/50 font-mono text-sm text-highlighted truncate">
            {{ linkLocation }}
          </div>
        </UFormField>

        <UFormField label="Public URL">
          <UInput
            :model-value="publicUrl"
            readonly
            class="w-full"
            :placeholder="placeholderText"
          />
          <template #help>
            <div class="flex gap-2 mt-2">
              <UButton
                variant="ghost"
                size="xs"
                icon="i-heroicons-clipboard"
                :disabled="!publicUrl"
                @click="copyToClipboard(publicUrl)"
              >
                Copy
              </UButton>
              <UButton
                variant="ghost"
                size="xs"
                icon="i-heroicons-arrow-top-right-on-square"
                :disabled="!publicUrl"
                @click="openInNewTab(publicUrl)"
              >
                Open
              </UButton>
            </div>
          </template>
        </UFormField>

        <UFormField label="Embed Code (iframe)">
          <UTextarea
            :model-value="iframeCode"
            readonly
            :rows="3"
            class="w-full font-mono text-sm"
          />
          <template #help>
            <UButton
              variant="ghost"
              size="xs"
              icon="i-heroicons-clipboard"
              class="mt-2"
              @click="copyToClipboard(iframeCode)"
            >
              Copy Code
            </UButton>
          </template>
        </UFormField>

        <UCheckboxGroup
          v-model="linkPermissionsSelected"
          legend="Permissions"
          :items="permissionItems"
        />

        <UFormField label="Link validity">
          <UInput
            v-model="expiresAtDate"
            type="date"
            class="w-full"
            :min="minExpiryDate"
          />
          <template #help>
            <span class="text-muted text-sm">
              {{ !expiresAtDate ? 'Link will work indefinitely' : `Link expires ${formatExpirationDate(expiresAtDate)}` }}
            </span>
          </template>
        </UFormField>

        <UFormField label="Theme">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <UFormField label="Primary Color">
              <USelect
                v-model="linkTheme.primary"
                :items="themeColorItems"
                value-key="value"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Neutral Color">
              <USelect
                v-model="linkTheme.neutral"
                :items="neutralColorItems"
                value-key="value"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Mode">
              <USelect
                v-model="linkTheme.mode"
                :items="themeModeItems"
                value-key="value"
                class="w-full"
              />
            </UFormField>
          </div>
        </UFormField>
      </div>
    </template>
    <template #footer="{ close }">
      <div class="flex items-center gap-2">
        <UButton
          variant="outline"
          color="neutral"
          label="Close"
          @click="handleClose(close)"
        />
        <UButton
          v-if="canSave && !isSaved"
          color="primary"
          :loading="isSaving || isGenerating"
          :disabled="editLink ? isSaving : (!props.destinationId || !linkHash)"
          @click="saveLink"
        >
          {{ editLink ? 'Save Changes' : 'Save Link' }}
        </UButton>
        <UButton
          v-else-if="isSaved"
          color="primary"
          label="Done"
          @click="handleClose(close)"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  themeColorItems,
  neutralColorItems,
  themeModeItems
} from '../../../utils/theme'

const props = defineProps<{
  open: boolean
  destinationId?: string
  bucketName?: string
  path?: string
  editLink?: import('../../../types').PublicLink
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'saved': []
}>()

const isOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})

const canSave = computed(
  () => !!props.editLink || (!!props.destinationId && !!props.bucketName)
)

const linkLocation = computed(() => {
  const bucket = props.editLink?.bucketName ?? props.bucketName
  const path = props.editLink?.path ?? props.path
  if (!bucket) return ''
  return path ? `${bucket}/${path}` : bucket
})
const isSaving = ref(false)
const isGenerating = ref(false)

const linkTheme = ref({ primary: 'emerald', neutral: 'zinc', mode: 'light' })
const linkPermissions = ref({
  allowFileUpload: false,
  allowFolderCreation: false
})

const permissionItems = [
  { label: 'Allow file upload', value: 'allowFileUpload' },
  { label: 'Allow folder creation', value: 'allowFolderCreation' }
]

const expiresAtDate = ref('')

const minExpiryDate = computed(() => {
  const d = new Date()
  return d.toISOString().slice(0, 10)
})

function computeExpiresAt(dateStr: string): string | undefined {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return undefined
  const d = new Date(dateStr + 'T23:59:59')
  if (Number.isNaN(d.getTime())) return undefined
  return d.toISOString()
}

function formatExpirationDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

const linkPermissionsSelected = computed({
  get: () => {
    const p = linkPermissions.value
    return [
      ...(p.allowFileUpload ? ['allowFileUpload'] : []),
      ...(p.allowFolderCreation ? ['allowFolderCreation'] : [])
    ]
  },
  set: (val: string[]) => {
    linkPermissions.value = {
      allowFileUpload: val.includes('allowFileUpload'),
      allowFolderCreation: val.includes('allowFolderCreation')
    }
  }
})
const savedTheme = ref<{
  primary: string
  neutral: string
  mode: 'light' | 'dark'
} | null>(null)
const linkHash = ref('')
const isSaved = ref(false)
const placeholderText = computed(() => {
  if (linkHash.value) return undefined
  if (props.editLink) return undefined
  if (!canSave.value) return 'Link creation is not available for this location'
  if (isGenerating.value) return 'Generating public URL...'
  return 'Failed to generate draft URL. Re-open dialog and try again.'
})

const publicUrl = computed(() => {
  if (typeof window === 'undefined') return ''
  if (!linkHash.value) return ''
  const baseUrl = window.location.origin
  const url = new URL(`${baseUrl}/public`)
  url.searchParams.set('path', linkHash.value)
  if (linkTheme.value.primary)
    url.searchParams.set('primary', linkTheme.value.primary)
  if (linkTheme.value.neutral)
    url.searchParams.set('neutral', linkTheme.value.neutral)
  if (linkTheme.value.mode) url.searchParams.set('theme', linkTheme.value.mode)
  return url.toString()
})

const iframeCode = computed(() => {
  return `<iframe src="${publicUrl.value}" width="100%" height="600" frameborder="0"></iframe>`
})

const { createPublicLink, updatePublicLink } = useAppContext()

const getErrorMessage = (error: unknown): string => {
  if (typeof error === 'object' && error !== null) {
    const maybeError = error as {
      data?: { statusMessage?: string }
      message?: string
    }
    return maybeError.data?.statusMessage || maybeError.message || 'Unknown error'
  }
  return 'Unknown error'
}

const generateDraftLink = async () => {
  if (!canSave.value || !props.destinationId || !props.bucketName) return
  isGenerating.value = true
  try {
    const link = await createPublicLink(
      props.destinationId,
      props.bucketName,
      props.path || '',
      {
        allowFileUpload: linkPermissions.value.allowFileUpload,
        allowFolderCreation: linkPermissions.value.allowFolderCreation
      },
      { draft: true }
    )
    linkHash.value = link?.hash || ''
  } catch (error: unknown) {
    linkHash.value = ''
    useToast().add({
      title: 'Failed to generate link',
      description: getErrorMessage(error),
      color: 'error'
    })
  } finally {
    isGenerating.value = false
  }
}

const saveLink = async () => {
  if (props.editLink) {
    isSaving.value = true
    try {
      const link = await updatePublicLink(props.editLink.id, {
        allowFileUpload: linkPermissions.value.allowFileUpload,
        allowFolderCreation: linkPermissions.value.allowFolderCreation,
        expiresAt: expiresAtDate.value ? computeExpiresAt(expiresAtDate.value) : null
      })
      if (link) {
        isSaved.value = true
        useToast().add({
          title: 'Link updated',
          description: 'Public link has been updated.',
          color: 'success'
        })
        emit('saved')
      }
    } catch (error: unknown) {
      useToast().add({
        title: 'Failed to update link',
        description: getErrorMessage(error),
        color: 'error'
      })
    } finally {
      isSaving.value = false
    }
    return
  }
  if (
    !canSave.value
    || !props.destinationId
    || !props.bucketName
    || !linkHash.value
  ) return
  isSaving.value = true
  try {
    const link = await createPublicLink(
      props.destinationId,
      props.bucketName,
      props.path || '',
      {
        allowFileUpload: linkPermissions.value.allowFileUpload,
        allowFolderCreation: linkPermissions.value.allowFolderCreation,
        expiresAt: computeExpiresAt(expiresAtDate.value)
      },
      { hash: linkHash.value }
    )
    if (link?.hash) {
      linkHash.value = link.hash
      isSaved.value = true
      useToast().add({
        title: 'Link saved',
        description: 'Public link has been saved. Copy the URL below.',
        color: 'success'
      })
    } else {
      emit('saved')
      isOpen.value = false
    }
  } catch (error: unknown) {
    useToast().add({
      title: 'Failed to save link',
      description: getErrorMessage(error),
      color: 'error'
    })
  } finally {
    isSaving.value = false
  }
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    useToast().add({
      title: 'Copied',
      description: 'Link copied to clipboard',
      color: 'success'
    })
  } catch {
    useToast().add({
      title: 'Error',
      description: 'Failed to copy to clipboard',
      color: 'error'
    })
  }
}

const openInNewTab = (url: string) => {
  window.open(url, '_blank')
}

const handleClose = (close: () => void) => {
  if (isSaved.value) {
    emit('saved')
  }
  linkHash.value = ''
  isSaved.value = false
  close()
}

const appConfig = useAppConfig()
const colorMode = useColorMode()

function applyLinkThemeToApp() {
  appConfig.ui = appConfig.ui || {}
  appConfig.ui.colors = appConfig.ui.colors || {}
  appConfig.ui.colors.primary = linkTheme.value.primary
  appConfig.ui.colors.neutral = linkTheme.value.neutral
  colorMode.preference = linkTheme.value.mode as 'light' | 'dark'
}

function restoreSavedTheme() {
  if (!savedTheme.value) return
  appConfig.ui = appConfig.ui || {}
  appConfig.ui.colors = appConfig.ui.colors || {}
  appConfig.ui.colors.primary = savedTheme.value.primary
  appConfig.ui.colors.neutral = savedTheme.value.neutral
  colorMode.preference = savedTheme.value.mode
  savedTheme.value = null
}

watch(isOpen, (open) => {
  if (open) {
    isSaved.value = false
    if (props.editLink) {
      linkHash.value = props.editLink.hash
      linkPermissions.value = {
        allowFileUpload: props.editLink.allowFileUpload ?? false,
        allowFolderCreation: props.editLink.allowFolderCreation ?? false
      }
      expiresAtDate.value = props.editLink.expiresAt
        ? props.editLink.expiresAt.slice(0, 10)
        : ''
    } else {
      linkHash.value = ''
      expiresAtDate.value = ''
      linkPermissions.value = {
        allowFileUpload: false,
        allowFolderCreation: false
      }
    }
    savedTheme.value = {
      primary: appConfig.ui?.colors?.primary ?? 'emerald',
      neutral: appConfig.ui?.colors?.neutral ?? 'zinc',
      mode: colorMode.value === 'dark' ? 'dark' : 'light'
    }
    linkTheme.value = {
      primary: savedTheme.value?.primary ?? 'emerald',
      neutral: savedTheme.value?.neutral ?? 'zinc',
      mode: savedTheme.value?.mode ?? 'light'
    }
    applyLinkThemeToApp()
    if (!props.editLink) void generateDraftLink()
  } else {
    restoreSavedTheme()
  }
})

watch(() => props.editLink, (link) => {
  if (link && isOpen.value) {
    linkHash.value = link.hash
    linkPermissions.value = {
      allowFileUpload: link.allowFileUpload ?? false,
      allowFolderCreation: link.allowFolderCreation ?? false
    }
    expiresAtDate.value = link.expiresAt ? link.expiresAt.slice(0, 10) : ''
  }
}, { immediate: true })

watch(
  linkTheme,
  () => {
    if (isOpen.value) applyLinkThemeToApp()
  },
  { deep: true }
)
</script>
