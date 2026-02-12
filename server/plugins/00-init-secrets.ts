import { getSecrets, saveSecrets } from "../utils/storage";
import { setJwtSecret } from "../utils/runtime-secrets";

function generateSecret(bytes: number = 32): string {
  return crypto
    .getRandomValues(new Uint8Array(bytes))
    .reduce((acc, b) => acc + b.toString(16).padStart(2, "0"), "");
}

export default defineNitroPlugin(async () => {
  try {
    let secrets = await getSecrets();

    if (!secrets || !secrets.jwtSecret) {
      const jwtSecret = generateSecret(32);
      await saveSecrets({ jwtSecret });
      setJwtSecret(jwtSecret);
      console.log("[Init] JWT Secret (generated):", jwtSecret);
    } else {
      setJwtSecret(secrets.jwtSecret);
    }
  } catch (error) {
    console.error("[Init] Failed to initialize secrets:", error);
    throw error;
  }
});
