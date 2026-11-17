<template>
  <main class="my-atlas-callback">
    <section aria-labelledby="my-atlas-callback-title">
      <p>My Atlas private beta</p>
      <h1 id="my-atlas-callback-title">{{ title }}</h1>
      <p>{{ message }}</p>
      <router-link v-if="failed" to="/my-atlas">Return to My Atlas</router-link>
    </section>
  </main>
</template>

<script>
import { finishMyAtlasAuthRedirect, myAtlasAuthState } from "../auth/auth0"
import { hasAuth0RedirectResponse } from "../auth/session.mjs"

export default {
  name: "MyAtlasAuthCallback",
  data() {
    return {
      failed: false,
    }
  },
  computed: {
    title() {
      return this.failed
        ? "Sign in could not be completed"
        : "Completing sign in"
    },
    message() {
      return this.failed
        ? myAtlasAuthState.error
        : "Returning you to your private map."
    },
  },
  async created() {
    if (!hasAuth0RedirectResponse(window.location.search)) {
      await this.$router.replace("/my-atlas")
      return
    }

    try {
      const returnTo = await finishMyAtlasAuthRedirect()
      await this.$router.replace(returnTo)
    } catch (error) {
      this.failed = true
    }
  },
}
</script>

<style scoped>
.my-atlas-callback {
  display: grid;
  min-height: 100dvh;
  place-items: center;
  padding: 1.5rem;
  color: #edf7f2;
  background: #0d1719;
  font-family: "Poppins", sans-serif;
}

.my-atlas-callback section {
  width: min(30rem, 100%);
  padding: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 1.5rem;
  background: #0a1416;
}

.my-atlas-callback section > p:first-child,
.my-atlas-callback a {
  color: #e6ba68;
}

.my-atlas-callback h1 {
  margin: 0.4rem 0 1rem;
  font-family: "Poppins", system-ui, sans-serif;
}
</style>
