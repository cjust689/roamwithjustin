<template>
  <main class="my-atlas-explore">
    <header class="my-atlas-explore-header">
      <a href="/" aria-label="Roam With Justin home"><BrandMark /></a>
      <router-link to="/my-atlas">My Atlas</router-link>
      <ThemeSelector />
    </header>

    <section class="my-atlas-explore-intro" aria-labelledby="explore-title">
      <p>Explore Atlases</p>
      <h1 id="explore-title">See where other travelers have been.</h1>
      <p>
        Browse public My Atlas maps shared by their owners. Recent public Atlas
        updates are given more space while older Atlases remain available as you
        explore.
      </p>
      <button
        class="my-atlas-explore-refresh"
        type="button"
        :disabled="loading"
        @click="refresh"
      >
        {{ refreshing ? "Refreshing Atlases" : "Refresh Atlases" }}
      </button>
      <p class="my-atlas-explore-refresh-status" role="status">
        {{ refreshStatus }}
      </p>
    </section>

    <section class="my-atlas-explore-results" :aria-busy="String(loading)">
      <div v-if="atlases.length" class="my-atlas-explore-grid">
        <router-link
          v-for="atlas in atlases"
          :key="atlas.handle"
          class="my-atlas-explore-card"
          :to="`/my-atlas/${atlas.handle}`"
        >
          <div class="my-atlas-explore-image">
            <img
              v-if="atlas.favoriteImage && !imageErrors[imageVersion(atlas)]"
              :key="imageVersion(atlas)"
              :src="imageUrl(atlas.handle)"
              :alt="`${atlas.displayName}'s favorite travel image`"
              loading="lazy"
              @error="markImageUnavailable(atlas, $event)"
            />
            <span v-else aria-hidden="true">{{ atlasInitials(atlas) }}</span>
            <b v-if="atlas.recent">Active recently</b>
            <span
              v-if="atlas.favoriteImage?.location"
              class="my-atlas-explore-location"
              >{{ atlas.favoriteImage.location }}</span
            >
          </div>
          <div class="my-atlas-explore-card-copy">
            <span>@{{ atlas.handle }}</span>
            <strong>{{ atlas.displayName }}</strong>
            <small>
              {{ atlas.placeCount }}
              {{ atlas.placeCount === 1 ? "place" : "places" }}
            </small>
          </div>
        </router-link>
      </div>

      <div v-if="loading && !atlases.length" class="my-atlas-explore-state">
        Finding public Atlases
      </div>
      <div v-else-if="error && !atlases.length" class="my-atlas-explore-state">
        <strong>Explore Atlases is unavailable right now.</strong>
        <button type="button" @click="refresh">Try again</button>
      </div>
      <div
        v-else-if="!loading && !atlases.length"
        class="my-atlas-explore-state"
      >
        <strong>No public Atlases are listed yet.</strong>
        <router-link to="/my-atlas">Build your Atlas</router-link>
      </div>

      <div
        ref="sentinel"
        class="my-atlas-explore-sentinel"
        aria-hidden="true"
      ></div>
      <button
        v-if="nextCursor"
        type="button"
        class="my-atlas-explore-more"
        :disabled="loading"
        @click="loadMore"
      >
        {{ loading ? "Loading more Atlases" : "Load more Atlases" }}
      </button>
      <p
        v-if="error && atlases.length"
        class="my-atlas-explore-error"
        role="status"
      >
        More Atlases could not be loaded. You can try again.
      </p>
    </section>
  </main>
</template>

<script>
import { fetchPublicAtlasDirectory } from "../api/client.mjs"
import { getMyAtlasApiBaseUrl } from "../config/api.mjs"
import {
  directoryImageVersion,
  mergeDirectoryCards,
  readDirectoryWindow,
} from "../discovery/directory.mjs"

export default {
  name: "MyAtlasExploreView",
  data() {
    return {
      apiBaseUrl: getMyAtlasApiBaseUrl(process.env, window.location.origin),
      atlases: [],
      nextCursor: "",
      loading: false,
      error: "",
      imageErrors: {},
      observer: null,
      loadedFirstPage: false,
      refreshing: false,
      refreshStatus: "",
      lastRefreshAt: 0,
      refreshQueued: false,
      disposed: false,
    }
  },
  mounted() {
    this.loadMore()
    window.addEventListener("focus", this.refreshOnReturn)
    document.addEventListener("visibilitychange", this.refreshOnReturn)
    if ("IntersectionObserver" in window) {
      this.observer = new IntersectionObserver(
        entries => {
          if (entries.some(entry => entry.isIntersecting)) this.loadMore()
        },
        { rootMargin: "400px 0px" }
      )
      this.observer.observe(this.$refs.sentinel)
    }
  },
  // Vue 2 cleanup hook.
  // eslint-disable-next-line vue/no-deprecated-destroyed-lifecycle
  beforeDestroy() {
    this.disposed = true
    this.observer?.disconnect()
    window.removeEventListener("focus", this.refreshOnReturn)
    document.removeEventListener("visibilitychange", this.refreshOnReturn)
  },
  methods: {
    imageVersion: directoryImageVersion,
    refreshOnReturn() {
      if (
        document.visibilityState !== "visible" ||
        !this.loadedFirstPage ||
        this.refreshing ||
        Date.now() - this.lastRefreshAt < 1000
      )
        return
      if (this.loading) {
        this.refreshQueued = true
        return
      }
      this.refresh()
    },
    async refresh() {
      if (this.loading || this.disposed) return
      this.refreshQueued = false
      this.loading = true
      this.refreshing = true
      this.refreshStatus = "Refreshing public Atlases."
      this.error = ""
      try {
        const result = await readDirectoryWindow(
          cursor =>
            fetchPublicAtlasDirectory({ apiBaseUrl: this.apiBaseUrl, cursor }),
          this.atlases.length
        )
        if (this.disposed) return
        this.atlases = result.atlases
        this.nextCursor = result.nextCursor
        this.imageErrors = {}
        this.loadedFirstPage = true
        this.refreshStatus = "Public Atlases refreshed."
      } catch {
        if (this.disposed) return
        this.error = "unavailable"
        this.refreshStatus =
          "The latest Atlases could not be loaded. Try Refresh Atlases again."
      } finally {
        if (!this.disposed) {
          this.lastRefreshAt = Date.now()
          this.refreshing = false
          this.loading = false
        }
      }
    },
    async loadMore() {
      if (this.loading || (this.loadedFirstPage && !this.nextCursor)) return
      this.loading = true
      this.error = ""
      try {
        const result = await fetchPublicAtlasDirectory({
          apiBaseUrl: this.apiBaseUrl,
          cursor: this.nextCursor,
        })
        if (this.disposed) return
        this.atlases = mergeDirectoryCards(this.atlases, result.atlases)
        this.nextCursor = result.nextCursor || ""
        if (!this.loadedFirstPage) this.lastRefreshAt = Date.now()
        this.loadedFirstPage = true
      } catch {
        if (this.disposed) return
        this.error = "unavailable"
      } finally {
        this.loading = false
        if (
          !this.disposed &&
          this.refreshQueued &&
          document.visibilityState === "visible"
        ) {
          this.refreshQueued = false
          this.refresh()
        }
      }
    },
    imageUrl(handle) {
      return `${this.apiBaseUrl}/v1/public/atlases/${encodeURIComponent(handle)}/image`
    },
    markImageUnavailable(atlas, event) {
      if (event?.target && !event.target.isConnected) return
      this.$set(this.imageErrors, directoryImageVersion(atlas), true)
    },
    atlasInitials(atlas) {
      const initials = atlas.displayName
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(word => word.charAt(0))
        .join("")
      return initials.toUpperCase() || "MA"
    },
  },
}
</script>

<style scoped>
.my-atlas-explore {
  min-height: 100vh;
  padding: clamp(1rem, 3vw, 2rem);
  background:
    radial-gradient(
      circle at 85% 5%,
      rgba(var(--color-accent-rgb, 238, 184, 87), 0.15),
      transparent 28rem
    ),
    var(--color-page, #081315);
  color: var(--color-text, #f7f2e7);
  font-family: "Poppins", system-ui, sans-serif;
}

.my-atlas-explore-refresh {
  margin-top: 1rem;
  padding: 0.65rem 0.9rem;
  border: 1px solid var(--color-accent, #e6ba68);
  border-radius: 999px;
  background: transparent;
  color: var(--color-accent-soft, #f4d38f);
  cursor: pointer;
  font: inherit;
  font-size: 0.8rem;
}
.my-atlas-explore-refresh:disabled {
  opacity: 0.6;
  cursor: progress;
}
.my-atlas-explore-refresh:focus-visible {
  outline: 2px solid var(--color-focus, #f4d38f);
  outline-offset: 3px;
}
.my-atlas-explore-refresh-status {
  font-size: 0.78rem;
}
.my-atlas-explore-refresh-status:empty {
  display: none;
}
.my-atlas-explore-image > .my-atlas-explore-location {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 0.7rem;
  background: rgba(var(--color-page-rgb, 7, 16, 18), 0.9);
  color: var(--color-text, #fffaf0);
  font-family: inherit;
  font-size: 0.78rem;
  line-height: 1.4;
  overflow-wrap: anywhere;
}
.my-atlas-explore-image:has(.my-atlas-explore-location) b {
  top: 0.75rem;
  bottom: auto;
}

.my-atlas-explore-header,
.my-atlas-explore-intro,
.my-atlas-explore-results {
  width: min(1180px, 100%);
  margin-inline: auto;
}

.my-atlas-explore-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.my-atlas-explore-header a {
  color: var(--color-accent-soft, #f4c66f);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-decoration: none;
  text-transform: uppercase;
}

.my-atlas-explore-intro {
  padding-block: clamp(4rem, 10vw, 8rem) clamp(2.5rem, 6vw, 5rem);
}

.my-atlas-explore-intro > p:first-child {
  margin: 0 0 1rem;
  color: var(--color-accent-soft, #f4c66f);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.my-atlas-explore-intro h1 {
  max-width: 850px;
  margin: 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(3rem, 8vw, 7rem);
  font-weight: 500;
  letter-spacing: -0.055em;
  line-height: 0.92;
}

.my-atlas-explore-intro > p:last-child {
  max-width: 680px;
  margin: 1.75rem 0 0;
  color: var(--color-text-muted, rgba(247, 242, 231, 0.68));
  line-height: 1.7;
}

.my-atlas-explore-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(1rem, 2.5vw, 1.75rem);
}

.my-atlas-explore-card {
  overflow: hidden;
  border: 1px solid rgba(var(--color-accent-rgb, 244, 198, 111), 0.25);
  border-radius: 1.35rem;
  background: var(--color-surface, #101c1e);
  color: inherit;
  text-decoration: none;
  transition:
    border-color 180ms ease,
    transform 180ms ease;
}

.my-atlas-explore-card:hover,
.my-atlas-explore-card:focus-visible {
  border-color: var(--color-accent, #f4c66f);
  outline: none;
  transform: translateY(-4px);
}

.my-atlas-explore-image {
  position: relative;
  display: grid;
  aspect-ratio: 1;
  place-items: center;
  overflow: hidden;
  background:
    linear-gradient(
      145deg,
      rgba(var(--color-accent-rgb, 244, 198, 111), 0.2),
      transparent 55%
    ),
    var(--color-surface-raised, #1b292a);
}

.my-atlas-explore-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.my-atlas-explore-image > span {
  color: var(--color-text-muted, rgba(247, 242, 231, 0.62));
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(3rem, 8vw, 5rem);
}

.my-atlas-explore-image b {
  position: absolute;
  right: 0.75rem;
  bottom: 0.75rem;
  padding: 0.45rem 0.65rem;
  border-radius: 999px;
  background: rgba(var(--color-page-rgb, 8, 19, 21), 0.88);
  color: var(--color-accent-soft, #f4c66f);
  font-size: 0.62rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.my-atlas-explore-card-copy {
  display: grid;
  gap: 0.25rem;
  padding: 1.2rem;
}

.my-atlas-explore-card-copy span,
.my-atlas-explore-card-copy small {
  color: var(--color-text-muted, rgba(247, 242, 231, 0.6));
  font-size: 0.72rem;
}

.my-atlas-explore-card-copy strong {
  font-size: 1.05rem;
}

.my-atlas-explore-state,
.my-atlas-explore-error {
  display: grid;
  justify-items: start;
  gap: 1rem;
  padding: 2rem;
  border: 1px solid rgba(var(--color-accent-rgb, 244, 198, 111), 0.2);
  border-radius: 1rem;
  color: var(--color-text-muted, rgba(247, 242, 231, 0.72));
}

.my-atlas-explore-state button,
.my-atlas-explore-state a,
.my-atlas-explore-more {
  padding: 0.7rem 1rem;
  border: 1px solid var(--color-accent, #f4c66f);
  border-radius: 999px;
  background: transparent;
  color: var(--color-accent-soft, #f4c66f);
  font: inherit;
  font-size: 0.75rem;
  font-weight: 800;
  text-decoration: none;
}

.my-atlas-explore-sentinel {
  height: 1px;
}

.my-atlas-explore-more {
  display: block;
  margin: 2rem auto;
}

@media (max-width: 800px) {
  .my-atlas-explore-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .my-atlas-explore {
    padding-inline: 0.8rem;
  }

  .my-atlas-explore-grid {
    grid-template-columns: 1fr;
  }
}
</style>
