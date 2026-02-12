<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-12 ">
    <div class="w-full max-w-md">
      <!-- Logo/Brand Section -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center mb-4">
          <img :src="logoImg" alt="BucketFlow Logo" height="64" width="64">
        </div>
        <h1 class="text-3xl font-bold  mb-2">
          BucketFlow
        </h1>
      </div>

      <!-- Login Card -->
      <UCard>
        <UAuthForm :fields="fields" :loading="isLoading" title="Authentication"
          description="Enter your credentials to access your account" icon="i-heroicons-lock-closed"
          :submit="{ label: 'Sign In', color: 'primary', size: 'lg', block: true, icon: 'i-heroicons-arrow-right-on-rectangle' }"
          @submit="handleLogin">
          <template #validation>
            <UAlert v-if="errorMessage" color="error" variant="soft" icon="i-heroicons-exclamation-triangle"
              :title="errorMessage" :description="errorDescription"
              :close-button="{ icon: 'i-heroicons-x-mark-20-solid', color: 'error', variant: 'link', size: 'xs' }"
              @close="errorMessage = ''" />
          </template>

        </UAuthForm>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AuthFormField, FormSubmitEvent } from '@nuxt/ui'
import logoImg from '~/assets/logo.png'

definePageMeta({
  layout: 'auth',
  ssr: false
})

const { login, isAuthenticated, initAuth } = useAuth()

const isLoading = ref(false)
const errorMessage = ref('')
const errorDescription = ref('')

const fields: AuthFormField[] = [
  {
    name: 'username',
    type: 'text',
    label: 'Username',
    placeholder: 'Enter username',
    required: true,
    icon: 'i-heroicons-user',
    autocomplete: 'username',
    help: 'Enter your username'
  },
  {
    name: 'password',
    type: 'password',
    label: 'Password',
    placeholder: 'Enter password',
    required: true,
    icon: 'i-heroicons-lock-closed',
    autocomplete: 'current-password',
    help: 'Enter your password'
  }
]

const handleLogin = async (event: FormSubmitEvent<{ username: string; password: string }>) => {
  errorMessage.value = ''
  errorDescription.value = ''

  isLoading.value = true
  try {
    const success = await login(event.data.username, event.data.password)
    if (success) {
      await navigateTo('/')
    } else {
      errorMessage.value = 'Login failed'
      errorDescription.value = 'Invalid username or password. Please try again.'
    }
  }
  catch (error: any) {
    errorMessage.value = 'Login error'
    errorDescription.value = error.message || 'An unexpected error occurred. Please try again.'
  }
  finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  await initAuth()
  if (isAuthenticated.value) {
    navigateTo('/')
  }
})
</script>
