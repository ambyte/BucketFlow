<template>
  <div class="min-h-screen flex flex-col" data-public-page>
    <S3FileManager v-if="linkHash && isReady" :selected-destination-hash="linkHash"
      :selected-bucket-name="selectedBucketName" :initial-path="initialFolderPath" :read-only="true"
      :allow-upload="allowFileUpload" :allow-folder-creation="allowFolderCreation" class="h-screen" />
    <div v-else-if="errorMessage" class="min-h-screen flex items-center justify-center">
      <UAlert color="error" icon="i-heroicons-exclamation-triangle" :title="errorTitle" :description="errorMessage" />
    </div>
    <div v-else class="min-h-screen flex items-center justify-center">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { isValidColor, isValidNeutral } from '../../utils/theme'

definePageMeta({
  layout: false
})

const route = useRoute()
const hashFromQuery = computed(() => (route.query.path as string) || '')

const linkHash = ref('')
const selectedBucketName = ref<string | undefined>(undefined)
const initialFolderPath = ref('')
const allowFileUpload = ref(false)
const allowFolderCreation = ref(false)
const isReady = ref(false)
const errorTitle = ref('Invalid link')
const errorMessage = ref('')

const primaryFromQuery = computed(() => {
  const q = (route.query.primary as string) || 'emerald'
  return isValidColor(q) ? q : 'emerald'
})

const neutralFromQuery = computed(() => {
  const q = (route.query.neutral as string) || 'zinc'
  return isValidNeutral(q) ? q : 'zinc'
})

const themeFromQuery = computed(() => {
  const q = (route.query.theme as string) || 'light'
  return q === 'dark' ? 'dark' : 'light'
})

const appConfig = useAppConfig()
const colorMode = useColorMode()

watch([primaryFromQuery, neutralFromQuery, themeFromQuery], ([primary, neutral, theme]) => {
  if (!appConfig.ui) appConfig.ui = {} as any
  if (!appConfig.ui.colors) appConfig.ui.colors = {} as any
  appConfig.ui.colors.primary = primary
  appConfig.ui.colors.neutral = neutral
  colorMode.preference = theme as 'light' | 'dark'
}, { immediate: true })

const { resolvePublicLink } = useAppContext({ isPublic: true })

onMounted(async () => {
  if (!hashFromQuery.value) {
    errorTitle.value = 'Missing link'
    errorMessage.value = 'Please provide a valid public link. The URL should contain path=... with the link hash.'
    isReady.value = true
    return
  }

  try {
    const resolved = await resolvePublicLink(hashFromQuery.value)
    if (!resolved) {
      errorTitle.value = 'Invalid link'
      errorMessage.value = 'This public link was not found or has been removed.'
      isReady.value = true
      return
    }

    linkHash.value = resolved.hash
    selectedBucketName.value = resolved.bucket
    initialFolderPath.value = resolved.path || ''
    allowFileUpload.value = resolved.allowFileUpload
    allowFolderCreation.value = resolved.allowFolderCreation

    isReady.value = true
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string; data?: { statusMessage?: string } }
    errorTitle.value = 'Error'
    errorMessage.value = err.statusCode === 410
      ? 'This public link has expired'
      : err.statusCode === 403
        ? 'Public access is not allowed for this destination'
        : err.statusCode === 404
          ? 'Destination not found'
          : err.data?.statusMessage || err.message || 'Failed to load'
    isReady.value = true
  }
})
</script>
