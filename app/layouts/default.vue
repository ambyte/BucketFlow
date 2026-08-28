<template>
  <div class="min-h-screen flex flex-col">
    <header class="border-b ">
      <div class="mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center gap-4">
            <img
              :src="logoImg"
              alt="BucketFlow Logo"
              height="36"
              width="36"
            >
            <h1 class="text-xl font-semibold">
              BucketFlow
            </h1>
            <UBadge
              color="primary"
              variant="soft"
            >
              {{ user?.role }}
            </UBadge>
          </div>

          <div class="flex items-center justify-end gap-4">
            <UButton
              to="/"
              variant="ghost"
              icon="i-heroicons-folder"
            >
              Files
            </UButton>

            <UButton
              v-if="isAdmin"
              to="/admin"
              variant="ghost"
              icon="i-heroicons-cog-6-tooth"
            >
              Admin
            </UButton>

            <UButton
              color="error"
              variant="ghost"
              icon="i-heroicons-arrow-right-on-rectangle"
              @click="logout"
            >
              Logout
            </UButton>

            <UColorModeButton class="ml-6" />

            <UButton
              :to="repositoryUrl"
              target="_blank"
              variant="subtle"
              color="neutral"
              size="sm"
            >
              v{{ version }}
            </UButton>
          </div>
        </div>
      </div>
    </header>

    <main class="flex-1 overflow-hidden">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import logoImg from '~/assets/logo.png'

const route = useRoute()
const { user, isAdmin, logout } = useAuth()
const config = useRuntimeConfig()
const version = computed(() => String(config.public.appVersion || '0.0.0'))
const repositoryUrl = computed(() =>
  String(config.public.githubRepoUrl || 'https://github.com/ambyte/BucketFlow')
)
const items = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Files',
    to: '/',
    active: route.path.startsWith('/')
  },
  {
    label: 'Admin',
    to: '/admin',
    active: route.path.startsWith('/admin')
  }
])
</script>
