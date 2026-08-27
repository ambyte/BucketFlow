import { getSecrets, saveSecrets, getDestinations, saveDestinations } from '../utils/storage'
import { setJwtSecret, setEncryptionKey } from '../utils/runtime-secrets'

function generateSecret(bytes: number = 32): string {
  return crypto
    .getRandomValues(new Uint8Array(bytes))
    .reduce((acc, b) => acc + b.toString(16).padStart(2, '0'), '')
}

export default defineNitroPlugin(async () => {
  try {
    const secrets = (await getSecrets()) || { jwtSecret: '', encryptionKey: '' }
    let dirty = false

    if (!secrets.jwtSecret) {
      secrets.jwtSecret = generateSecret(32)
      dirty = true
    }
    if (!secrets.encryptionKey) {
      secrets.encryptionKey = generateSecret(32)
      dirty = true
    }

    if (dirty) {
      await saveSecrets(secrets)
    }

    setJwtSecret(secrets.jwtSecret)
    setEncryptionKey(secrets.encryptionKey!)

    const destinations = await getDestinations()
    if (destinations.length > 0) {
      await saveDestinations(destinations)
    }
  } catch (error) {
    console.error('[Init] Failed to initialize secrets:', error)
    throw error
  }
})
