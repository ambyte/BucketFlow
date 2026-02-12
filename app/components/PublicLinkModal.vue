<template>
  <UModal v-model:open="isOpen" title="Public Access Link" :ui="{ content: 'max-w-2xl' }">
    <template #body>
      <div class="space-y-4">
        <UAlert color="info" variant="soft" icon="i-heroicons-information-circle" title="Public Access"
          description="This link allows anonymous users to view and download files from this destination. Share it carefully." />

        <UFormField label="Public URL">
          <UInput :model-value="publicUrl" readonly class="w-full" />
          <template #help>
            <div class="flex gap-2 mt-2">
              <UButton variant="ghost" size="xs" icon="i-heroicons-clipboard" @click="copyToClipboard(publicUrl)">
                Copy URL
              </UButton>
              <UButton variant="ghost" size="xs" icon="i-heroicons-arrow-top-right-on-square"
                @click="openInNewTab(publicUrl)">
                Open
              </UButton>
            </div>
          </template>
        </UFormField>

        <UFormField label="Embed Code (iframe)">
          <UTextarea :model-value="iframeCode" readonly :rows="3" class="w-full font-mono text-sm" />
          <template #help>
            <UButton variant="ghost" size="xs" icon="i-heroicons-clipboard" @click="copyToClipboard(iframeCode)"
              class="mt-2">
              Copy Code
            </UButton>
          </template>
        </UFormField>

        <UFormField label="Customize Theme">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <UFormField label="Primary Color">
              <USelect v-model="linkTheme.primary" :items="colorItems" value-key="value" class="w-full" />
            </UFormField>
            <UFormField label="Neutral Color">
              <USelect v-model="linkTheme.neutral" :items="neutralItems" value-key="value" class="w-full" />
            </UFormField>
            <UFormField label="Theme">
              <USelect v-model="linkTheme.mode" :items="themeItems" value-key="value" class="w-full" />
            </UFormField>
          </div>
        </UFormField>
      </div>
    </template>
    <template #footer="{ close }">
      <UButton variant="outline" color="neutral" label="Close" @click="close" />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  destinationSlug: string
  bucketName?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

const colors = ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose']
const neutrals = ['slate', 'gray', 'zinc', 'neutral', 'stone']

const colorItems = computed(() => colors.map(c => ({ label: c.charAt(0).toUpperCase() + c.slice(1), value: c })))
const neutralItems = computed(() => neutrals.map(c => ({ label: c.charAt(0).toUpperCase() + c.slice(1), value: c })))
const themeItems = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' }
]

const linkTheme = ref({ primary: 'emerald', neutral: 'zinc', mode: 'light' })
const savedTheme = ref<{ primary: string; neutral: string; mode: 'light' | 'dark' } | null>(null)

const publicUrl = computed(() => {
  if (!props.destinationSlug) return ''
  if (typeof window === 'undefined') return ''
  const baseUrl = window.location.origin
  const url = new URL(`${baseUrl}/public`)
  url.searchParams.set('slug', props.destinationSlug)
  if (linkTheme.value.primary) url.searchParams.set('primary', linkTheme.value.primary)
  if (linkTheme.value.neutral) url.searchParams.set('neutral', linkTheme.value.neutral)
  if (linkTheme.value.mode) url.searchParams.set('theme', linkTheme.value.mode)
  return url.toString()
})

const iframeCode = computed(() => {
  return `<iframe src="${publicUrl.value}" width="100%" height="600" frameborder="0"></iframe>`
})

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    useToast().add({
      title: 'Copied',
      description: 'Link copied to clipboard',
      color: 'success'
    })
  }
  catch (error) {
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

const appConfig = useAppConfig()
const colorMode = useColorMode()

function applyLinkThemeToApp() {
  if (!appConfig.ui) (appConfig as any).ui = {}
  if (!appConfig.ui.colors) (appConfig.ui as any).colors = {}
  appConfig.ui.colors.primary = linkTheme.value.primary
  appConfig.ui.colors.neutral = linkTheme.value.neutral
  colorMode.preference = linkTheme.value.mode as 'light' | 'dark'
}

function restoreSavedTheme() {
  if (!savedTheme.value) return
  if (!appConfig.ui) (appConfig as any).ui = {}
  if (!appConfig.ui.colors) (appConfig.ui as any).colors = {}
  appConfig.ui.colors.primary = savedTheme.value.primary
  appConfig.ui.colors.neutral = savedTheme.value.neutral
  colorMode.preference = savedTheme.value.mode
  savedTheme.value = null
}

watch(isOpen, (open) => {
  if (open) {
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
  }
  else {
    restoreSavedTheme()
  }
})

watch(linkTheme, () => {
  if (isOpen.value) applyLinkThemeToApp()
}, { deep: true })
</script>
