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

      <!-- Loading state -->
      <UCard v-if="isCheckingSetup">
        <div class="flex items-center justify-center py-8">
          <UIcon name="i-heroicons-arrow-path" class="animate-spin size-8 text-primary" />
        </div>
      </UCard>

      <!-- Registration Card (first run, no users) -->
      <UCard v-else-if="!hasUsers">
        <UAuthForm :fields="registerFields" :loading="isLoading" title="Initial Setup"
          description="Create the first administrator account" icon="i-heroicons-user-plus"
          :submit="{ label: 'Create Account', color: 'primary', size: 'lg', block: true, icon: 'i-heroicons-user-plus' }"
          @submit="handleRegister">
          <template #validation>
            <UAlert v-if="errorMessage" color="error" variant="soft" icon="i-heroicons-exclamation-triangle"
              :title="errorMessage" :description="errorDescription"
              :close-button="{ icon: 'i-heroicons-x-mark-20-solid', color: 'error', variant: 'link', size: 'xs' }"
              @close="errorMessage = ''" />
          </template>
        </UAuthForm>
      </UCard>

      <!-- Login Card (users exist) -->
      <UCard v-else>
        <UAuthForm :fields="loginFields" :loading="isLoading" title="Authentication"
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

const hasUsers = ref(true)
const isCheckingSetup = ref(true)
const isLoading = ref(false)
const errorMessage = ref('')
const errorDescription = ref('')

const loginFields: AuthFormField[] = [
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

const registerFields: AuthFormField[] = [
  {
    name: 'username',
    type: 'text',
    label: 'Username',
    placeholder: 'Enter username',
    required: true,
    icon: 'i-heroicons-user',
    autocomplete: 'username',
    help: 'At least 3 characters'
  },
  {
    name: 'password',
    type: 'password',
    label: 'Password',
    placeholder: 'Enter password',
    required: true,
    icon: 'i-heroicons-lock-closed',
    autocomplete: 'new-password',
    help: 'At least 6 characters'
  },
  {
    name: 'passwordConfirm',
    type: 'password',
    label: 'Confirm Password',
    placeholder: 'Confirm password',
    required: true,
    icon: 'i-heroicons-lock-closed',
    autocomplete: 'new-password'
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

const handleRegister = async (event: FormSubmitEvent<{ username: string; password: string; passwordConfirm: string }>) => {
  errorMessage.value = ''
  errorDescription.value = ''

  if (event.data.password !== event.data.passwordConfirm) {
    errorMessage.value = 'Validation error'
    errorDescription.value = 'Passwords do not match.'
    return
  }

  if (event.data.password.length < 6) {
    errorMessage.value = 'Validation error'
    errorDescription.value = 'Password must be at least 6 characters.'
    return
  }

  if (event.data.username.length < 3) {
    errorMessage.value = 'Validation error'
    errorDescription.value = 'Username must be at least 3 characters.'
    return
  }

  isLoading.value = true
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: event.data.username,
        password: event.data.password
      })
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.statusMessage || `HTTP ${response.status}`)
    }

    hasUsers.value = true
    errorMessage.value = ''
    errorDescription.value = ''
    useToast().add({
      title: 'Account created',
      description: 'Please sign in with your new credentials.',
      color: 'success'
    })
  }
  catch (error: any) {
    errorMessage.value = 'Registration failed'
    errorDescription.value = error.message || 'An unexpected error occurred. Please try again.'
  }
  finally {
    isLoading.value = false
  }
}

const fetchSetupStatus = async () => {
  try {
    const response = await fetch('/api/auth/setup-status')
    const data = await response.json()
    hasUsers.value = data.hasUsers
  }
  catch {
    hasUsers.value = true
  }
}

onMounted(async () => {
  await initAuth()
  if (isAuthenticated.value) {
    navigateTo('/')
    return
  }

  await fetchSetupStatus()
  isCheckingSetup.value = false
})
</script>
