<template>
  <section class="my-atlas-registration" aria-labelledby="registration-title">
    <header>
      <div>
        <p>Owner invitation</p>
        <strong id="registration-title">Create your private Atlas</strong>
      </div>
      <span>One use</span>
    </header>

    <p>
      Your account begins private. Staging data may be reset while the beta is
      being verified.
    </p>

    <form @submit.prevent="submit">
      <label>
        <span>Invitation code</span>
        <input
          v-model.trim="inviteCode"
          type="password"
          autocomplete="off"
          required
        />
      </label>
      <label>
        <span>Public handle</span>
        <input
          v-model.trim="handle"
          type="text"
          autocomplete="username"
          minlength="3"
          maxlength="30"
          pattern="[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])"
          placeholder="justin-travels"
          required
        />
      </label>
      <label>
        <span>Display name</span>
        <input
          v-model.trim="displayName"
          type="text"
          autocomplete="name"
          minlength="2"
          maxlength="50"
          required
        />
      </label>

      <label class="check">
        <input v-model="acceptTerms" type="checkbox" required />
        <span>I accept the staging beta terms and reset notice.</span>
      </label>
      <label class="check">
        <input v-model="acceptPrivacy" type="checkbox" required />
        <span>
          I have read and accept the
          <a
            href="/privacy#my-atlas"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="My Atlas privacy and retention notice, opens in a new tab"
          >
            My Atlas privacy and retention notice </a
          >.
        </span>
      </label>

      <div ref="turnstile" class="turnstile" aria-label="Human verification" />
      <p v-if="widgetError" class="error" role="alert">
        {{ widgetError }}
      </p>
      <p v-if="error" class="error" role="alert">{{ error }}</p>

      <button type="submit" :disabled="!canSubmit">
        {{ pending ? "Creating account" : "Create private Atlas" }}
      </button>
    </form>
  </section>
</template>

<script>
import { loadMyAtlasTurnstile } from "../auth/turnstile.mjs"
import { MY_ATLAS_TURNSTILE_ACTION } from "../config/turnstile.mjs"

export default {
  name: "MyAtlasRegistrationForm",
  props: {
    siteKey: { type: String, default: "" },
    initialDisplayName: { type: String, default: "" },
    pending: { type: Boolean, default: false },
    error: { type: String, default: "" },
  },
  emits: ["submit"],
  data() {
    return {
      inviteCode: "",
      handle: "",
      displayName: this.initialDisplayName,
      acceptTerms: false,
      acceptPrivacy: false,
      turnstileToken: "",
      widgetId: null,
      widgetError: "",
      turnstile: null,
    }
  },
  computed: {
    canSubmit() {
      return Boolean(
        !this.pending &&
          this.inviteCode &&
          this.handle &&
          this.displayName &&
          this.acceptTerms &&
          this.acceptPrivacy &&
          this.turnstileToken
      )
    },
  },
  async mounted() {
    if (!this.siteKey) {
      this.widgetError = "Turnstile is not configured for this build."
      return
    }
    try {
      this.turnstile = await loadMyAtlasTurnstile()
      this.widgetId = this.turnstile.render(this.$refs.turnstile, {
        sitekey: this.siteKey,
        action: MY_ATLAS_TURNSTILE_ACTION,
        theme: "dark",
        callback: token => {
          this.turnstileToken = token
          this.widgetError = ""
        },
        "expired-callback": () => {
          this.turnstileToken = ""
        },
        "error-callback": () => {
          this.turnstileToken = ""
          this.widgetError = "Human verification could not be completed."
        },
      })
    } catch (error) {
      this.widgetError = "Human verification could not be loaded."
    }
  },
  // This project uses Vue 2; its lint preset also checks the Vue 3 lifecycle.
  // eslint-disable-next-line vue/no-deprecated-destroyed-lifecycle
  beforeDestroy() {
    if (this.turnstile && this.widgetId !== null) {
      this.turnstile.remove(this.widgetId)
    }
  },
  methods: {
    resetTurnstile() {
      this.turnstileToken = ""
      if (this.turnstile && this.widgetId !== null) {
        this.turnstile.reset(this.widgetId)
      }
    },
    submit() {
      if (!this.canSubmit) return
      this.$emit("submit", {
        inviteCode: this.inviteCode,
        handle: this.handle.toLowerCase(),
        displayName: this.displayName,
        turnstileToken: this.turnstileToken,
        acceptTerms: this.acceptTerms,
        acceptPrivacy: this.acceptPrivacy,
      })
    },
  },
}
</script>

<style scoped>
.my-atlas-registration {
  display: grid;
  gap: 0.8rem;
  margin: 0 0 1.25rem;
  padding: 1rem;
  border: 1px solid rgba(var(--color-success-rgb, 155, 211, 176), 0.35);
  border-radius: 1rem;
  background: rgba(var(--color-success-rgb, 155, 211, 176), 0.07);
}

.my-atlas-registration header,
.my-atlas-registration header > div,
.my-atlas-registration form,
.my-atlas-registration label {
  display: grid;
  gap: 0.35rem;
}

.my-atlas-registration header {
  grid-template-columns: 1fr auto;
  align-items: center;
}

.my-atlas-registration p,
.my-atlas-registration header p {
  margin: 0;
  color: var(--color-text-muted, #9eb0aa);
  font-size: 0.7rem;
  line-height: 1.45;
}

.my-atlas-registration header p,
.my-atlas-registration header span {
  color: var(--color-success, #9bd3b0);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.62rem;
  font-weight: 700;
}

.my-atlas-registration form {
  gap: 0.7rem;
}

.my-atlas-registration label > span {
  font-size: 0.7rem;
  font-weight: 700;
}

.my-atlas-registration input[type="text"],
.my-atlas-registration input[type="password"] {
  box-sizing: border-box;
  width: 100%;
  padding: 0.7rem 0.8rem;
  border: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.18);
  border-radius: 0.7rem;
  color: var(--color-text, #fff);
  background: rgba(var(--color-highlight-rgb, 255, 255, 255), 0.07);
  font: inherit;
}

.my-atlas-registration .check {
  grid-template-columns: auto 1fr;
  align-items: start;
}

.my-atlas-registration .check input {
  margin-top: 0.2rem;
}

.my-atlas-registration .check a {
  color: var(--color-text, #d8efdf);
  text-decoration-thickness: 1px;
  text-underline-offset: 0.16em;
}

.my-atlas-registration button {
  padding: 0.7rem 0.85rem;
  border: 0;
  border-radius: 0.7rem;
  color: var(--color-accent-contrast, #132023);
  background: var(--color-success, #9bd3b0);
  font: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
}

.my-atlas-registration button:disabled {
  cursor: wait;
  opacity: 0.55;
}

.my-atlas-registration .turnstile {
  min-height: 65px;
}

.my-atlas-registration .error {
  color: var(--color-error, #e6a8a1);
}
</style>
