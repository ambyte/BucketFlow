<template>
  <div class="min-h-screen flex flex-col" data-public-page>
    <S3FileManager v-if="slug" :selected-destination-slug="slug" :selected-bucket-name="selectedBucketName"
      :read-only="true" class="h-screen" />
    <div v-else class="min-h-screen flex items-center justify-center">
      <UAlert color="error" icon="i-heroicons-exclamation-triangle" title="Missing slug"
        description="Please provide the destination slug in the URL: /public?slug=your-destination-slug" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useS3 } from '~/composables/useS3'

definePageMeta({
  layout: false
})

const route = useRoute()
const slug = computed(() => (route.query.slug as string) || '')
const pathFromQuery = computed(() => (route.query.path as string) || '')

// Theme from query params: primary, neutral (Nuxt UI color names), theme (light/dark)
const validColors = ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose']
const validNeutrals = ['slate', 'gray', 'zinc', 'neutral', 'stone']

const primaryFromQuery = computed(() => {
  const q = (route.query.primary as string) || 'emerald'
  return validColors.includes(q) ? q : 'emerald'
})

const neutralFromQuery = computed(() => {
  const q = (route.query.neutral as string) || 'zinc'
  return validNeutrals.includes(q) ? q : 'zinc'
})

const themeFromQuery = computed(() => {
  const q = (route.query.theme as string) || 'light'
  return q === 'dark' ? 'dark' : 'light'
})

// Apply appConfig and colorMode from query params
const appConfig = useAppConfig()
const colorMode = useColorMode()

// Apply theme immediately and on changes
watch([primaryFromQuery, neutralFromQuery, themeFromQuery], ([primary, neutral, theme]) => {
  // Set Nuxt UI colors
  if (!appConfig.ui) appConfig.ui = {} as any
  if (!appConfig.ui.colors) appConfig.ui.colors = {} as any
  appConfig.ui.colors.primary = primary
  appConfig.ui.colors.neutral = neutral
  // Set color mode
  colorMode.preference = theme as 'light' | 'dark'
}, { immediate: true })

const selectedBucketName = ref<string | undefined>(undefined)

const { fetchDestination, fetchBuckets, fetchFiles } = useS3({ isPublic: true })

// Verify destination exists and has public access
onMounted(async () => {
  if (!slug.value) return

  try {
    await fetchDestination(slug.value)

    // Load buckets
    const buckets = await fetchBuckets(slug.value)

    // Auto-select first bucket
    if (buckets.length > 0) {
      selectedBucketName.value = buckets[0]
      await fetchFiles(slug.value, buckets[0], pathFromQuery.value)
    }
  }
  catch (error: any) {
    useToast().add({
      title: 'Error',
      description: error.statusCode === 403
        ? 'Public access is not allowed for this destination'
        : error.statusCode === 404
          ? 'Destination not found'
          : error.message || 'Failed to load destination',
      color: 'error'
    })
  }
})

</script>
