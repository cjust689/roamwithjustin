<template>
  <main class="my-atlas-proof" @keydown.esc="cancelLocationPlacement">
    <MyAtlasActionFeedback
      :feedback="actionFeedback"
      @dismiss="dismissActionFeedback"
    />
    <MyAtlasMap
      ref="atlasMap"
      :places="
        !canUseAtlas || plannerMapActive || tripMapActive ? [] : displayedPlaces
      "
      :selected-place-id="canUseAtlas ? selectedPlaceId : ''"
      :show-connections="showConnections"
      :show-memories="showMemories"
      :playback-active="canUseAtlas && timelinePlaying"
      :placement-active="
        canUseAtlas &&
        (customPlaceOpen ||
          plannerPlacement.active ||
          editPlacement.active ||
          tripPlacement.active)
      "
      :placement-coordinates="
        canUseAtlas
          ? tripPlacement.active
            ? tripPlacement.coordinates
            : editPlacement.active
              ? editPlacement.coordinates
              : plannerPlacement.active
                ? plannerPlacement.coordinates
                : customPlaceCoordinates
          : null
      "
      :planner-active="canUseAtlas && (plannerMapActive || tripMapActive)"
      :planner-route="
        canUseAtlas
          ? tripMapActive
            ? tripView.route
            : plannerMapActive
              ? plannerRoute
              : []
          : []
      "
      :planner-read-only="tripMapActive"
      @select="selectPin"
      @place-custom="handleLocationPlacement"
    />
    <MyAtlasTutorial
      v-if="canUseAtlas && tutorialOpen"
      :variant="tutorialVariant"
      @close="closeTutorial"
      @complete="completeTutorial"
    />

    <section
      class="my-atlas-panel"
      :class="{ 'is-planning': plannerMapActive }"
      aria-labelledby="my-atlas-title"
    >
      <header>
        <span class="my-atlas-brand-lockup">
          <a href="/" aria-label="Roam With Justin home"><BrandMark /></a>
          <span>My Atlas</span>
        </span>
        <ThemeSelector class="my-atlas-theme-selector" />
        <button
          v-if="auth.authenticated"
          ref="profileTrigger"
          type="button"
          class="my-atlas-profile-trigger"
          :aria-expanded="String(accountMenuOpen)"
          aria-controls="my-atlas-account-menu"
          aria-label="Open My Atlas profile menu"
          @click="toggleProfileMenu"
        >
          {{ authInitials }}
        </button>
        <button
          v-else-if="auth.configured && !auth.loading"
          ref="signInButton"
          type="button"
          class="my-atlas-header-sign-in"
          @click="signIn"
        >
          Sign in
        </button>
      </header>
      <nav
        v-if="
          accountMenuOpen ||
          auth.loading ||
          !auth.configured ||
          auth.error ||
          accountError
        "
        id="my-atlas-account-menu"
        ref="authSection"
        class="my-atlas-account"
        :class="{ 'is-menu': accountMenuOpen }"
        :style="
          accountMenuOpen && profileMenuMaxHeight
            ? { maxHeight: profileMenuMaxHeight + 'px' }
            : null
        "
        aria-label="My Atlas account"
        tabindex="-1"
        @keydown.esc.stop="closeProfileMenu"
      >
        <span v-if="auth.loading" class="my-atlas-account-status">
          Checking your session
        </span>
        <span v-else-if="!auth.configured" class="my-atlas-account-status">
          Authentication is not configured for this build.
        </span>
        <button
          v-else-if="!auth.authenticated"
          type="button"
          class="my-atlas-sign-in"
          @click="signIn"
        >
          Sign in with Google
        </button>
        <template v-else>
          <div class="my-atlas-account-card">
            <span>
              <strong>{{ authDisplayName }}</strong>
              <small v-if="accountProfile">@{{ accountProfile.handle }}</small>
              <small v-else>Finish account setup</small>
            </span>
            <button
              v-if="accountLoadFailed"
              class="my-atlas-account-retry"
              type="button"
              :disabled="accountPending"
              @click="loadAccount"
            >
              {{ accountPending ? "Loading Atlas" : "Retry saved Atlas" }}
            </button>
            <button class="my-atlas-sign-out" type="button" @click="signOut">
              Sign out
            </button>
          </div>
          <div
            v-if="accountProfile && accountMenuOpen"
            class="my-atlas-profile-settings"
          >
            <div class="my-atlas-profile-menu-heading">
              <h2>Profile settings</h2>
              <button type="button" @click="closeProfileMenu">Close</button>
            </div>
            <button
              type="button"
              class="my-atlas-profile-customize"
              @click="openCustomization"
            >
              Customize My Atlas
            </button>
            <details class="my-atlas-profile-links">
              <summary>Profile links</summary>
              <form @submit.prevent="saveInstagramHandle">
                <label for="my-atlas-instagram">Instagram handle</label>
                <input
                  id="my-atlas-instagram"
                  v-model="instagramDraft"
                  type="text"
                  maxlength="31"
                  autocomplete="off"
                  autocapitalize="off"
                  :spellcheck="false"
                  :disabled="accountPending"
                  aria-describedby="my-atlas-instagram-help"
                  placeholder="@yourhandle"
                />
                <p id="my-atlas-instagram-help">
                  Optional. Visible to other visitors when your Atlas is public.
                  Enter a handle, not a URL. Leave blank and save to remove it.
                </p>
                <a
                  v-if="savedInstagramUrl"
                  :href="savedInstagramUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerpolicy="no-referrer"
                  >Visit @{{ accountProfile.instagramHandle }} on Instagram</a
                >
                <button type="submit" :disabled="accountPending">
                  {{ accountPending ? "Saving" : "Save Instagram link" }}
                </button>
                <p v-if="instagramError" role="alert">{{ instagramError }}</p>
              </form>
            </details>
            <div class="my-atlas-account-data-actions">
              <button
                type="button"
                :disabled="accountPending"
                @click="exportAccountData"
              >
                Export account data
              </button>
              <details class="my-atlas-delete-account">
                <summary>Delete My Atlas account</summary>
                <p>
                  Permanently remove your visited places, memories, private
                  saved places, trips, favorite travel image, handle, and My
                  Atlas account. Your Google account is kept. This cannot be
                  undone.
                </p>
                <label>
                  <span>Type DELETE MY ATLAS to confirm</span>
                  <input
                    v-model="deleteConfirmation"
                    autocomplete="off"
                    type="text"
                    :disabled="accountPending"
                  />
                </label>
                <button
                  type="button"
                  :disabled="
                    accountPending ||
                    atlasImagePending ||
                    deleteConfirmation !== 'DELETE MY ATLAS'
                  "
                  @click="deleteAccount"
                >
                  Permanently delete account
                </button>
              </details>
            </div>

            <p v-if="accountProfile.public" class="my-atlas-share-link">
              <span>Public link</span>
              <strong>{{ shareUrl }}</strong>
            </p>

            <router-link class="my-atlas-explore-link" to="/my-atlas/explore"
              >Explore Atlases</router-link
            >
            <p class="my-atlas-profile-help">
              Discover other users' publicly shared Atlases.
            </p>
            <p v-if="toolsStatus" class="my-atlas-tools-status" role="status">
              {{ toolsStatus }}
            </p>
          </div>
        </template>
        <p v-if="auth.error" class="my-atlas-auth-error" role="alert">
          {{ auth.error }}
        </p>
        <p v-if="accountError" class="my-atlas-auth-error" role="alert">
          {{ accountError }}
        </p>
      </nav>

      <div class="my-atlas-intro">
        <h1 id="my-atlas-title">Mark the places that shaped your travels.</h1>
        <p class="my-atlas-intro-copy">
          Search countries, cities, national parks, and iconic spots, then place
          them on your map.
          <template v-if="accountProfile">
            Your changes are saved to your private beta account.
          </template>
          <template v-else>
            Sign in to build your Atlas and save your travels.
          </template>
        </p>
        <div v-if="canUseAtlas" class="my-atlas-intro-actions">
          <button type="button" @click="openTutorial('account')">
            Quick start guide
          </button>
          <router-link class="my-atlas-explore-link" to="/my-atlas/explore">
            Explore Atlases
          </router-link>
        </div>
        <div
          v-else-if="!auth.loading && !auth.authenticated"
          class="my-atlas-intro-actions"
        >
          <button type="button" :disabled="!auth.configured" @click="signIn">
            Sign in with Google
          </button>
          <router-link class="my-atlas-explore-link" to="/my-atlas/explore">
            Explore Atlases
          </router-link>
        </div>
      </div>

      <nav
        v-if="canUseAtlas"
        class="my-atlas-tabs"
        role="tablist"
        aria-label="My Atlas sections"
      >
        <button
          v-for="tab in atlasTabs"
          :id="'atlas-tab-' + tab.id"
          :key="tab.id"
          type="button"
          role="tab"
          :aria-selected="String(activeAtlasTab === tab.id)"
          :tabindex="activeAtlasTab === tab.id ? 0 : -1"
          aria-controls="my-atlas-tab-panel"
          @click="selectAtlasTab(tab.id)"
          @keydown="handleAtlasTabKey($event, tab.id)"
        >
          {{ tab.label }}
        </button>
      </nav>
      <div
        id="my-atlas-tab-panel"
        :role="canUseAtlas ? 'tabpanel' : undefined"
        :aria-labelledby="
          canUseAtlas ? 'atlas-tab-' + activeAtlasTab : undefined
        "
      >
        <section
          v-if="canUseAtlas"
          v-show="activeAtlasTab === 'overview'"
          class="my-atlas-overview"
        >
          <div class="my-atlas-stats" aria-label="Atlas statistics">
            <div>
              <strong>{{ visibleStats.places }}</strong>
              <span>Places</span>
            </div>
            <div>
              <strong>{{ visibleStats.countries }}</strong>
              <span>Countries</span>
            </div>
            <div>
              <strong>{{ visibleStats.continents }}</strong>
              <span>Continents</span>
            </div>
            <div>
              <strong>{{ visibleStats.spots || visibleStats.capitals }}</strong>
              <span>{{ visibleStats.spots ? "Spots" : "Capitals" }}</span>
            </div>
          </div>

          <button
            type="button"
            class="my-atlas-mobile-controls-toggle"
            :aria-expanded="String(mobileControlsOpen)"
            aria-controls="my-atlas-map-controls"
            @click="mobileControlsOpen = !mobileControlsOpen"
          >
            <span>Map controls</span>
            <strong>{{ mobileControlsOpen ? "Hide" : "Show" }}</strong>
          </button>
          <div
            id="my-atlas-map-controls"
            class="my-atlas-controls-drawer"
            :class="{ 'is-open': mobileControlsOpen }"
          >
            <div class="my-atlas-view-controls">
              <label>
                <span>Show</span>
                <select v-model="yearFilter" @change="resetTimeline">
                  <option value="all">Every destination</option>
                  <option
                    v-for="year in years"
                    :key="year"
                    :value="String(year)"
                  >
                    {{ year }}
                  </option>
                  <option v-if="atlasStats.undated" value="undated">
                    Date open
                  </option>
                </select>
              </label>
              <button
                type="button"
                :disabled="!years.length"
                @click="toggleTimeline"
              >
                {{ timelineButtonLabel }}
              </button>
              <button type="button" @click="showConnections = !showConnections">
                {{ showConnections ? "Hide paths" : "Show paths" }}
              </button>
              <button
                type="button"
                :aria-pressed="String(showMemories)"
                :disabled="!visibleMemoryCount"
                @click="showMemories = !showMemories"
              >
                {{ showMemories ? "Hide memories" : "Show all memories" }}
              </button>
            </div>
            <p v-if="timelineEntry" class="my-atlas-timeline-year">
              <strong>{{ timelineEntry.place.name }}</strong>
              <span>
                {{ timelineEntry.year }} · {{ timelineIndex + 1 }} of
                {{ timelineSequence.length }}
              </span>
            </p>
            <p class="my-atlas-connections-note">
              Playback follows visit years. Hops within a year are a visual
              sequence, not a recorded travel route.
            </p>
          </div>

          <div v-if="selectedPlace" class="my-atlas-selected">
            <button
              type="button"
              aria-label="Previous destination"
              @click="cyclePin(-1)"
            >
              Previous
            </button>
            <div>
              <strong>{{ selectedPlace.name }}</strong>
              <span>{{ placeLabel(selectedPlace) }}</span>
              <small>{{ formatVisitedDates(selectedPlace) }}</small>
            </div>
            <button
              type="button"
              aria-label="Next destination"
              @click="cyclePin(1)"
            >
              Next
            </button>
            <blockquote v-if="selectedPlace.memory">
              {{ selectedPlace.memory }}
            </blockquote>
            <p v-else class="my-atlas-selected-memory-empty">
              No favorite memory added yet.
            </p>
            <button
              v-if="accountProfile"
              type="button"
              class="my-atlas-selected-memory-action"
              :disabled="accountPending"
              @click="
                organizedTrips && !selectedPlace.ungrouped
                  ? openTripWorkspace()
                  : openExistingPin(selectedPlace, { memoryOnly: true })
              "
            >
              {{
                organizedTrips && !selectedPlace.ungrouped
                  ? "View trips"
                  : selectedPlace.memory
                    ? "Edit memory"
                    : "Add memory"
              }}
            </button>
          </div>

          <div class="my-atlas-overview-actions">
            <button type="button" @click="openAtlasPanel('add')">
              Add visited destination
            </button>
          </div>
          <div class="my-atlas-overview-journeys">
            <h2>Journeys</h2>
            <p>Review past trips or plan your next journey.</p>
            <div class="my-atlas-tools-actions">
              <button type="button" @click="selectAtlasTab('past')">
                Past journeys
              </button>
              <button type="button" @click="selectAtlasTab('planning')">
                Plan a journey
              </button>
            </div>
          </div>
        </section>

        <MyAtlasRegistrationForm
          v-if="auth.authenticated && accountMissing"
          ref="registration"
          :site-key="turnstileSiteKey"
          :local-development="localRegistration"
          :initial-invite-code="localRegistration ? localInviteCode : ''"
          :initial-display-name="authDisplayName"
          :pending="registrationPending"
          :error="registrationError"
          @submit="registerAccount"
        />

        <section
          v-if="canUseAtlas"
          v-show="activeAtlasTab === 'past' && addPlaceOpen"
          class="my-atlas-workflow-section my-atlas-add-place my-atlas-overview-panel"
        >
          <div
            id="my-atlas-add-place-content"
            class="my-atlas-section-content"
            aria-label="Add a destination"
          >
            <label class="my-atlas-search">
              <span>Find a country, city, or spot</span>
              <input
                ref="searchInput"
                v-model="query"
                type="search"
                autocomplete="off"
                placeholder="Try Uvita, Yellowstone, or Eiffel Tower"
                aria-describedby="my-atlas-search-help"
              />
              <small id="my-atlas-search-help">
                {{ searchHelp }}
              </small>
            </label>

            <section
              v-if="accountProfile"
              class="my-atlas-custom-place"
              :class="{ 'is-open': customPlaceOpen }"
              aria-labelledby="my-atlas-custom-place-title"
            >
              <button
                v-if="!customPlaceOpen"
                type="button"
                class="my-atlas-custom-place-trigger"
                :disabled="accountPending"
                @click="beginCustomPlace"
              >
                {{
                  query.trim()
                    ? `Create custom place “${query.trim()}”`
                    : "Drop a custom pin"
                }}
              </button>
              <template v-else>
                <div class="my-atlas-custom-place-heading">
                  <div>
                    <p id="my-atlas-custom-place-title">Custom map pin</p>
                    <span
                      >Name the place, then choose its position on the
                      map.</span
                    >
                  </div>
                  <button type="button" @click="cancelCustomPlace">
                    Cancel
                  </button>
                </div>
                <MyAtlasLocationPicker
                  ref="locationPicker"
                  :name="customPlaceName"
                  :latitude="customLatitudeDraft"
                  :longitude="customLongitudeDraft"
                  :pending="accountPending"
                  :resolve-link="resolveMapLink"
                  @update:name="customPlaceName = $event"
                  @update:latitude="customLatitudeDraft = $event"
                  @update:longitude="customLongitudeDraft = $event"
                  @coordinates-change="applyCustomCoordinateFields"
                  @choose-map="focusMapForPlacement"
                  @search="$refs.searchInput.focus()"
                />
                <p v-if="customPlaceError" class="my-atlas-custom-place-error">
                  {{ customPlaceError }}
                </p>
                <p class="my-atlas-custom-place-disclosure">
                  This name and map position are your own entry. They become
                  visible if you share your Atlas publicly.
                </p>
                <button
                  type="button"
                  class="my-atlas-custom-place-continue"
                  :disabled="!customPlaceReady || accountPending"
                  @click="continueCustomPlace"
                >
                  Continue to visit details
                </button>
              </template>
            </section>

            <MyAtlasPinEditor
              v-if="pinEditorPlace"
              ref="pinEditor"
              :key="pinEditorKey"
              :place="pinEditorPlace"
              :place-label="placeLabel(pinEditorPlace)"
              :pin="pinEditorPin"
              :memory-only="pinEditorMemoryOnly"
              :pending="accountPending"
              :error="pinEditorError"
              :experience-pending="experiencePending"
              :experience-error="experienceError"
              :experience-saved-sequence="experienceSavedSequence"
              :resolve-link="resolveMapLink"
              @location-placement-change="handleEditPlacement"
              @experience-change="saveVisitExperience"
              @cancel="closePinEditor"
              @save="savePinDetails"
            />

            <div
              v-if="searchPending"
              class="my-atlas-search-state"
              role="status"
            >
              Searching places
            </div>
            <div
              v-else-if="searchError"
              class="my-atlas-search-state is-error"
              role="alert"
            >
              <span>{{ searchError }}</span>
              <button type="button" @click="retryPlaceSearch">
                Retry search
              </button>
            </div>
            <div
              v-else-if="query.trim().length >= 4 && !searchResults.length"
              class="my-atlas-search-state"
              role="status"
            >
              No matching country, city, or spot in this catalog.
            </div>
            <ul v-if="searchResults.length" class="my-atlas-results">
              <li v-for="place in searchResults" :key="place.placeId">
                <button
                  type="button"
                  :disabled="accountPending"
                  @click="openNewPin(place)"
                >
                  <span>{{ place.name }}</span>
                  <small>{{ placeLabel(place) }}</small>
                  <b>{{ placeTypeLabel(place) }}</b>
                </button>
              </li>
            </ul>
          </div>
        </section>

        <section
          v-if="canUseAtlas"
          v-show="activeAtlasTab === 'past' && visitedOpen"
          class="my-atlas-pins my-atlas-workflow-section my-atlas-overview-panel"
        >
          <div
            id="my-atlas-pins-content"
            class="my-atlas-section-content"
            aria-label="Visited destinations"
          >
            <p v-if="recapInvitation" class="my-atlas-recap-invitation">
              Your places are marked visited. Add what you did at any stop, now
              or later.
              <button type="button" @click="recapInvitation = false">
                Not now
              </button>
            </p>
            <p class="my-atlas-panel-label">{{ filterLabel }}</p>
            <button
              type="button"
              class="my-atlas-past-add"
              @click="openAtlasPanel('add')"
            >
              {{
                addPlaceOpen ? "Close destination search" : "Add destination"
              }}
            </button>
            <div
              v-if="pinnedPlaces.some(place => place.ungrouped !== false)"
              class="visited-group-controls"
            >
              <button
                v-if="!groupingDestinations"
                type="button"
                @click="groupingDestinations = true"
              >
                Group destinations
              </button>
              <template v-else>
                <p role="status">
                  {{ selectedVisitedPlaceIds.length }} selected
                </p>
                <p>
                  Select destinations in trip order. Memories stay attached.
                </p>
                <button
                  type="button"
                  :disabled="
                    accountPending || selectedVisitedPlaceIds.length < 1
                  "
                  @click="groupVisitedDestinations"
                >
                  Group into trip
                </button>
                <button type="button" @click="cancelDestinationGrouping">
                  Cancel grouping
                </button>
              </template>
            </div>
            <p v-if="!pinnedPlaces.length" class="my-atlas-empty">
              Your first destination will appear here and on the map.
            </p>
            <p v-else-if="!displayedPlaces.length" class="my-atlas-empty">
              No destinations match this view.
            </p>
            <ul v-else>
              <li v-for="place in displayedPlaces" :key="place.placeId">
                <label
                  v-if="groupingDestinations && place.ungrouped !== false"
                  class="visited-group-choice"
                >
                  <input
                    v-model="selectedVisitedPlaceIds"
                    type="checkbox"
                    :value="place.placeId"
                    :disabled="accountPending"
                  />
                  <b>Include {{ place.name }}</b>
                </label>
                <button
                  class="visited-place-main"
                  type="button"
                  @click="selectPin(place.placeId)"
                >
                  <span>{{ place.name }}</span>
                  <small>{{ placeLabel(place) }}</small>
                  <em>{{ formatVisitedDates(place) }}</em>
                  <q v-if="place.memory">{{ place.memory }}</q>
                </button>
                <div
                  v-if="!organizedTrips || place.ungrouped"
                  class="my-atlas-pin-actions"
                >
                  <button
                    class="edit"
                    type="button"
                    :disabled="accountPending"
                    :aria-label="'Edit memory for ' + place.name"
                    @click="openExistingPin(place, { memoryOnly: true })"
                  >
                    {{ place.memory ? "Edit memory" : "Add memory" }}
                  </button>
                  <button
                    class="visit-edit"
                    type="button"
                    :disabled="accountPending"
                    :aria-label="'Edit visit dates for ' + place.name"
                    @click="openExistingPin(place)"
                  >
                    Visit dates
                  </button>
                  <button
                    class="experience-edit"
                    type="button"
                    :disabled="accountPending"
                    :aria-label="`${experienceCount(place) ? 'Edit experiences' : 'Add experience'} at ${place.name}`"
                    @click="openVisitExperiences(place)"
                  >
                    {{
                      experienceCount(place) ? "Experiences" : "Add experience"
                    }}
                    <b v-if="experienceCount(place)" aria-hidden="true">{{
                      experienceCount(place)
                    }}</b>
                  </button>
                  <button
                    class="remove"
                    type="button"
                    :disabled="accountPending"
                    :aria-label="'Remove ' + place.name"
                    @click="removePlace(place)"
                  >
                    Remove
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </section>

        <MyAtlasTrips
          v-if="canUseAtlas"
          v-show="activeAtlasTab !== 'overview'"
          ref="trips"
          :scope="activeAtlasTab === 'planning' ? 'planned' : 'past'"
          :profile-public="accountProfile.public"
          :api-base-url="apiBaseUrl"
          :revision="accountProfile.revision"
          :resolve-link="resolveMapLink"
          @changed="handleTripChange"
          @open-change="tripWorkspaceOpen = $event"
          @action-feedback="showActionFeedback"
          @route-change="tripView = $event"
          @location-placement-change="handleTripPlacement"
        />
        <MyAtlasPlanner
          v-if="canUseAtlas && !organizedTrips"
          v-show="activeAtlasTab === 'planning' && !tripWorkspaceOpen"
          ref="planner"
          :api-base-url="apiBaseUrl"
          :pins="pins"
          :profile-public="accountProfile.public"
          :revision="accountProfile.revision"
          @revision-change="updatePlanningRevision"
          @planner-state-change="handlePlannerStateChange"
          @action-feedback="showActionFeedback"
          @location-placement-change="handlePlannerPlacement"
          @pins-created="handlePlannerPinsCreated"
        />

        <section
          v-if="canUseAtlas"
          v-show="activeAtlasTab === 'overview'"
          class="my-atlas-tools my-atlas-workflow-section"
        >
          <button
            type="button"
            class="my-atlas-section-toggle"
            :aria-expanded="String(toolsOpen)"
            aria-controls="my-atlas-tools-content"
            @click="openTools"
          >
            <span>
              <strong>Share Your Atlas</strong>
              <small>
                {{
                  accountProfile.public
                    ? "Your Atlas has a public link"
                    : !pins.length
                      ? "Add a visited place to share or export"
                      : "Your Atlas is private"
                }}
              </small>
            </span>
            <b>{{ toolsOpen ? "Hide" : "Open" }}</b>
          </button>
          <div
            v-if="toolsOpen"
            id="my-atlas-tools-content"
            class="my-atlas-section-content my-atlas-tools-content"
          >
            <p>
              Create a public link for the places marked Visited, or export
              those places as a Story image. Planned trips are shared
              separately.
            </p>
            <div v-if="!pins.length" class="my-atlas-tools-empty" role="status">
              <strong>Your Atlas is empty</strong>
              <p>
                {{
                  atlasImage
                    ? "Your favorite image is saved. Add at least one visited place before sharing your Atlas or exporting a Story image."
                    : "Add at least one visited place before sharing your Atlas or exporting a Story image."
                }}
                Saved places stay private. Share a saved trip from the Planning
                tab.
              </p>
              <button type="button" @click="openAtlasPanel('add')">
                Add a visited place
              </button>
            </div>
            <div class="my-atlas-tools-actions">
              <button
                type="button"
                :disabled="
                  accountPending || (!pins.length && !accountProfile.public)
                "
                @click="toggleSharing"
              >
                {{
                  accountProfile.public
                    ? "Make Atlas private"
                    : "Make Atlas public"
                }}
              </button>
              <button
                v-if="accountProfile.public"
                type="button"
                :disabled="accountPending"
                @click="copyShareLink"
              >
                Copy Atlas link
              </button>

              <button
                type="button"
                :disabled="
                  !pinnedPlaces.length ||
                  atlasImagePending ||
                  storyExportPending
                "
                :aria-busy="String(storyExportPending)"
                @click="exportStory"
              >
                {{
                  storyExportPending
                    ? "Creating Story image"
                    : "Create story image"
                }}
              </button>
            </div>
            <p
              v-if="toolsStatus && !accountMenuOpen"
              class="my-atlas-tools-status"
              role="status"
            >
              {{ toolsStatus }}
            </p>
          </div>
        </section>
        <section
          v-if="canUseAtlas"
          v-show="activeAtlasTab === 'overview'"
          ref="customization"
          class="my-atlas-customization my-atlas-workflow-section"
        >
          <button
            type="button"
            class="my-atlas-section-toggle"
            :aria-expanded="String(customizationOpen)"
            aria-controls="my-atlas-customization-content"
            @click="customizationOpen = !customizationOpen"
          >
            <span>
              <strong>Customize My Atlas</strong>
              <small>Favorite image and profile presentation</small>
            </span>
            <b>{{ customizationOpen ? "Hide" : "Open" }}</b>
          </button>
          <div
            v-show="customizationOpen"
            id="my-atlas-customization-content"
            class="my-atlas-section-content"
          >
            <p>
              Choose your favorite travel image, add its location, and customize
              your public profile presentation.
            </p>
            <div class="my-atlas-favorite-image">
              <div class="my-atlas-favorite-image-preview">
                <img
                  v-if="atlasImageUrl"
                  ref="favoriteImagePreview"
                  :src="atlasImageUrl"
                  alt="Your favorite travel image"
                />
                <span v-else aria-hidden="true">Atlas Story</span>
              </div>
              <div class="my-atlas-favorite-image-copy">
                <strong>Your favorite travel image</strong>
                <p>
                  Choose one image that feels like your travels. It is cropped
                  to a square and used on Atlas Story images. You choose whether
                  it also becomes the favorite image on your public Visited
                  Atlas.
                </p>
                <small>
                  JPEG, PNG, or WebP. Up to 10 MiB before processing and 1 MiB
                  after processing.
                </small>
                <input
                  ref="atlasImageInput"
                  class="my-atlas-visually-hidden"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  @change="handleAtlasImageSelection"
                />
                <label class="my-atlas-image-location">
                  <span>Photo location (required)</span>
                  <input
                    v-model="atlasImageLocationDraft"
                    type="text"
                    maxlength="120"
                    required
                    :disabled="atlasImagePending || accountPending"
                    placeholder="For example, Banff, Canada"
                    aria-describedby="atlas-image-location-help"
                  />
                </label>
                <small id="atlas-image-location-help"
                  >Name the place where the photo was taken. The location
                  appears with shared images and Story exports.</small
                >
                <p v-if="atlasImage && !atlasImage.location">
                  Add a location to this saved photo.
                </p>
                <div class="my-atlas-favorite-image-actions">
                  <button
                    type="button"
                    :disabled="
                      atlasImagePending ||
                      accountPending ||
                      !validAtlasImageLocation
                    "
                    :aria-busy="String(atlasImagePending)"
                    @click="$refs.atlasImageInput.click()"
                  >
                    {{
                      atlasImagePending
                        ? "Processing image"
                        : atlasImage
                          ? "Replace image"
                          : "Choose image"
                    }}
                  </button>
                  <button
                    v-if="atlasImage"
                    type="button"
                    :disabled="
                      atlasImagePending ||
                      accountPending ||
                      !validAtlasImageLocation ||
                      validAtlasImageLocation === atlasImage.location
                    "
                    @click="saveAtlasImageLocation"
                  >
                    Save photo location
                  </button>
                  <button
                    v-if="atlasImage"
                    type="button"
                    :disabled="
                      atlasImagePending ||
                      accountPending ||
                      (!atlasImage.publicProfile && !atlasImage.location)
                    "
                    @click="toggleFavoriteImageVisibility"
                  >
                    {{
                      atlasImage.publicProfile
                        ? "Keep image private"
                        : "Show on public profile"
                    }}
                  </button>
                  <button
                    v-if="atlasImage"
                    type="button"
                    :disabled="atlasImagePending || accountPending"
                    @click="removeFavoriteImage"
                  >
                    Remove image
                  </button>
                </div>
                <p v-if="atlasImage" class="my-atlas-favorite-image-visibility">
                  {{
                    atlasImage.publicProfile
                      ? "Shown on your public Visited Atlas"
                      : "Only visible to you and in Story images you export"
                  }}
                </p>
                <p
                  v-if="atlasImageError"
                  class="my-atlas-favorite-image-error"
                  role="alert"
                >
                  {{ atlasImageError }}
                </p>
              </div>
            </div>

            <h3>Profile presentation</h3>
            <div class="my-atlas-tools-actions">
              <button
                v-if="accountProfile.public"
                type="button"
                :disabled="accountPending"
                @click="toggleDiscovery"
              >
                {{
                  accountProfile.discoverable
                    ? "Remove from Explore Atlases"
                    : "List in Explore Atlases"
                }}
              </button>
            </div>
            <p v-if="accountProfile.public" class="my-atlas-tools-status">
              {{
                accountProfile.discoverable
                  ? "Your handle and public favorite image can appear in Explore Atlases."
                  : "Your Atlas stays out of Explore Atlases until you choose to list it."
              }}
            </p>

            <p v-if="!accountProfile.public">
              Make your Atlas public in Share Your Atlas to list it in Explore
              Atlases.
            </p>
          </div>
        </section>
      </div>
      <p class="my-atlas-beta-note">
        Private beta data may be reset. Story images are generated locally in
        your browser.
      </p>
      <p class="my-atlas-attribution">
        Place data
        <a href="https://www.geonames.org/" target="_blank" rel="noopener">
          GeoNames
        </a>
        under CC BY 4.0. National park records also come from
        <a href="https://www.nps.gov/" target="_blank" rel="noopener">NPS</a>,
        <a href="https://parks.canada.ca/" target="_blank" rel="noopener">
          Parks Canada </a
        >, and
        <a href="https://www.gob.mx/conanp" target="_blank" rel="noopener">
          CONANP </a
        >. Custom pins are supplied by each Atlas owner. Map rendering uses
        MapTiler SDK JS with session-based map usage.
      </p>
      <p class="my-atlas-brand">My Atlas by RoamWithJustin.com</p>
      <p
        class="my-atlas-announcement"
        :aria-live="actionFeedback ? 'off' : 'polite'"
      >
        {{ announcement }}
      </p>
    </section>
  </main>
</template>

<script>
import MyAtlasLocationPicker from "../components/MyAtlasLocationPicker.vue"
import MyAtlasMap from "../components/MyAtlasMap.vue"
import MyAtlasPinEditor from "../components/MyAtlasPinEditor.vue"
import MyAtlasPlanner from "../components/MyAtlasPlanner.vue"
import MyAtlasTrips from "../components/MyAtlasTrips.vue"
import MyAtlasRegistrationForm from "../components/MyAtlasRegistrationForm.vue"
import MyAtlasTutorial from "../components/MyAtlasTutorial.vue"
import placeCatalog from "../data/place-catalog.proof.json"
import {
  atlasTimelineSequence,
  atlasStats,
  atlasYears,
  formatVisitedDates,
  placesForYear,
  placesThroughTimelineStep,
} from "../catalog/atlasInsights.mjs"
import { formatPlaceLabel, resolveCatalogPlace } from "../catalog/search.mjs"
import { formatPlaceTypeLabel } from "../catalog/placeTypes.mjs"
import {
  MY_ATLAS_CUSTOM_PLACE_MAX_CHARACTERS,
  normalizeMyAtlasCustomCoordinates,
  normalizeMyAtlasCustomPlace,
  normalizeMyAtlasCustomPlaceName,
} from "../catalog/customPlace.mjs"
import {
  formatMyAtlasPlaceSearchError,
  searchMyAtlasPlaces,
} from "../catalog/placeSearchClient.mjs"
import {
  MY_ATLAS_IMAGE_MAX_INPUT_BYTES,
  createMyAtlasPin,
  deleteMyAtlasAccountWithRevisionRecovery,
  deleteMyAtlasPin,
  fetchMyAtlasImage,
  fetchMyAtlasAccountExport,
  fetchMyAtlasState,
  removeMyAtlasImage,
  registerMyAtlasAccount,
  resolveMyAtlasMapLink,
  replaceMyAtlasImage,
  updateMyAtlasImageVisibility,
  updateMyAtlasPin,
  updateMyAtlasDiscovery,
  updateMyAtlasSharing,
  updateMyAtlasInstagram,
} from "../api/client.mjs"
import { getMyAtlasApiBaseUrl } from "../config/api.mjs"
import { getMyAtlasPlaceSearchEndpoint } from "../config/placeSearch.mjs"
import { getMyAtlasTurnstileSiteKey } from "../config/turnstile.mjs"
import { downloadMyAtlasStory } from "../export/storyExport.mjs"
import {
  getMyAtlasApiAccessToken,
  initializeMyAtlasAuth,
  loginToMyAtlas,
  logoutFromMyAtlas,
  myAtlasAuthState,
} from "../auth/auth0"

import MyAtlasActionFeedback from "../components/MyAtlasActionFeedback.vue"
import { normalizeImageLocation } from "../../../../shared/my-atlas-image-location.mjs"
import {
  accountDeletionStorageKey,
  discardLegacyDeletion,
} from "../auth/accountDeletion.mjs"
import {
  normalizeInstagramHandle,
  instagramProfileUrl,
} from "../../../../shared/my-atlas-instagram.mjs"

const ACCOUNT_TUTORIAL_STORAGE_PREFIX = "rwj:my-atlas:account-tutorial:v1:"

export default {
  name: "MyAtlasGeographicProof",
  components: {
    MyAtlasTrips,
    MyAtlasLocationPicker,
    MyAtlasActionFeedback,
    MyAtlasMap,
    MyAtlasPinEditor,
    MyAtlasPlanner,
    MyAtlasRegistrationForm,
    MyAtlasTutorial,
  },
  data() {
    return {
      query: "",
      localInviteCode: process.env.VUE_APP_MY_ATLAS_LOCAL_INVITE_CODE || "",
      plannerPlacement: { active: false, coordinates: null },
      customLatitudeDraft: "",
      customLongitudeDraft: "",
      experiencePending: false,
      experienceError: "",
      experienceSavedSequence: 0,
      experienceAttempt: null,
      actionFeedback: null,
      actionFeedbackSequence: 0,
      instagramDraft: "",
      instagramError: "",
      searchResults: [],
      searchPending: false,
      searchTimer: null,
      searchRequest: 0,
      searchAbortController: null,
      searchError: "",
      placeSearchEndpoint: getMyAtlasPlaceSearchEndpoint(
        process.env,
        window.location.origin
      ),
      apiBaseUrl: getMyAtlasApiBaseUrl(process.env, window.location.origin),
      loadedPlaces: {},
      pins: [],
      selectedPlaceId: "",
      pinEditorPlace: null,
      pinEditorPin: null,
      pinEditorMemoryOnly: false,
      pinEditorError: "",
      customPlaceOpen: false,
      editPlacement: { active: false, coordinates: null },
      locationAttempt: null,
      recapInvitation: false,
      customPlaceName: "",
      customPlaceCoordinates: null,
      customPlaceError: "",
      pendingCustomPlace: null,
      yearFilter: "all",
      timelineIndex: -1,
      timelinePlaying: false,
      timelineTimer: null,
      showConnections: true,
      showMemories: false,
      mobileControlsOpen: false,
      addPlaceOpen: false,
      visitedOpen: false,
      toolsOpen: false,
      customizationOpen: false,
      atlasImage: null,
      atlasImageLocationDraft: "",
      atlasImageUrl: "",
      atlasImagePending: false,
      atlasImageError: "",
      storyExportPending: false,
      toolsStatus: "",
      workflowSectionsInitialized: false,
      announcement: "",
      auth: myAtlasAuthState,
      accountProfile: null,
      accountMissing: false,
      accountPending: false,
      deleteConfirmation: "",
      accountError: "",
      accountLoadFailed: false,
      registrationPending: false,
      registrationError: "",
      turnstileSiteKey: getMyAtlasTurnstileSiteKey(process.env),
      tutorialOpen: false,
      tutorialVariant: "preview",
      plannerActive: false,
      tripView: { active: false, route: [] },
      tripWorkspaceOpen: false,
      activeAtlasTab: "overview",
      atlasTabs: [
        { id: "overview", label: "Overview" },
        { id: "planning", label: "Planning" },
        { id: "past", label: "Past" },
      ],
      groupingDestinations: false,
      selectedVisitedPlaceIds: [],
      tripPlacement: { active: false, coordinates: null },
      plannerRoute: [],
      accountMenuOpen: false,
      profileMenuMaxHeight: null,
    }
  },
  computed: {
    plannerMapActive() {
      return this.activeAtlasTab === "planning" && this.plannerActive
    },
    tripMapActive() {
      return (
        this.activeAtlasTab !== "overview" &&
        this.tripWorkspaceOpen &&
        this.tripView.active
      )
    },
    organizedTrips() {
      return this.accountProfile?.tripSchemaVersion >= 1
    },
    tripWorkspaceVisible() {
      return (
        this.organizedTrips ||
        process.env.VUE_APP_MY_ATLAS_TRIPS_ENABLED === "true" ||
        (process.env.NODE_ENV === "development" &&
          this.$route.query.trips === "1")
      )
    },
    localRegistration() {
      return (
        process.env.NODE_ENV === "development" &&
        process.env.VUE_APP_MY_ATLAS_LOCAL_REGISTRATION === "true" &&
        ["http://localhost:8787", "http://127.0.0.1:8787"].includes(
          this.apiBaseUrl
        )
      )
    },
    validAtlasImageLocation() {
      return normalizeImageLocation(this.atlasImageLocationDraft)
    },
    savedInstagramUrl() {
      return instagramProfileUrl(this.accountProfile?.instagramHandle)
    },
    canUseAtlas() {
      return (
        !this.auth.loading &&
        this.auth.authenticated &&
        Boolean(this.accountProfile)
      )
    },
    authDisplayName() {
      return this.auth.user?.name || this.auth.user?.email || "Signed in"
    },
    authInitials() {
      const words = this.authDisplayName
        .replace(/@.*$/, "")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
      if (!words.length) return "ME"
      return words
        .slice(0, 2)
        .map(word => word[0])
        .join("")
        .toUpperCase()
    },
    customPlaceCharacterCount() {
      return Array.from(this.customPlaceName).length
    },
    customPlaceMaxCharacters() {
      return MY_ATLAS_CUSTOM_PLACE_MAX_CHARACTERS
    },
    customPlaceNameError() {
      if (!this.customPlaceName) return ""
      return normalizeMyAtlasCustomPlaceName(this.customPlaceName)
        ? ""
        : `Use plain text up to ${MY_ATLAS_CUSTOM_PLACE_MAX_CHARACTERS} characters.`
    },
    customPlaceReady() {
      return Boolean(
        normalizeMyAtlasCustomPlace({
          name: this.customPlaceName,
          coordinates: this.customPlaceCoordinates,
        })
      )
    },
    runtimeCatalog() {
      const baseIds = new Set(placeCatalog.records.map(place => place.placeId))
      return {
        ...placeCatalog,
        records: [
          ...placeCatalog.records,
          ...Object.values(this.loadedPlaces).filter(
            place => !baseIds.has(place.placeId)
          ),
        ],
      }
    },
    pinnedPlaces() {
      return this.pins
        .map(pin => {
          const place = resolveCatalogPlace(this.runtimeCatalog, pin.placeId)
          if (!place) return null
          const country = place.countryCode
            ? resolveCatalogPlace(
                this.runtimeCatalog,
                `iso-country:${place.countryCode}`
              )
            : null
          return {
            ...place,
            ...pin,
            continent: place.continent || country?.continent,
            featureCode: place.featureCode || place.source?.featureCode,
          }
        })
        .filter(place => place && Array.isArray(place.coordinates))
    },
    atlasStats() {
      return atlasStats(this.pinnedPlaces)
    },
    displayedPlaces() {
      if (this.timelineIndex >= 0) {
        return placesThroughTimelineStep(
          this.timelineSequence,
          this.timelineIndex
        )
      }
      return placesForYear(this.pinnedPlaces, this.yearFilter)
    },
    filterLabel() {
      if (this.timelineEntry) {
        return `Timeline through ${this.timelineEntry.place.name}, ${this.timelineEntry.year}`
      }
      if (this.yearFilter === "all") return "All destinations"
      if (this.yearFilter === "undated") return "Destinations with open dates"
      return `Destinations from ${this.yearFilter}`
    },
    pinEditorKey() {
      return `${this.pinEditorPlace?.placeId || "none"}:${this.pinEditorPin?.pinId || "new"}`
    },
    searchHelp() {
      return "Enter at least four characters."
    },
    shareUrl() {
      return this.accountProfile
        ? `${window.location.origin}/my-atlas/${this.accountProfile.handle}`
        : ""
    },
    selectedPlace() {
      return (
        this.displayedPlaces.find(
          place => place.placeId === this.selectedPlaceId
        ) || this.displayedPlaces[0]
      )
    },
    visibleStats() {
      return atlasStats(this.displayedPlaces)
    },
    visibleMemoryCount() {
      return this.displayedPlaces.filter(place => Boolean(place.memory)).length
    },
    years() {
      return atlasYears(this.pinnedPlaces)
    },
    timelineSequence() {
      return atlasTimelineSequence(this.pinnedPlaces)
    },
    timelineEntry() {
      return this.timelineSequence[this.timelineIndex] || null
    },
    timelineButtonLabel() {
      if (this.timelinePlaying) return "Pause timeline"
      if (
        this.timelineIndex >= 0 &&
        this.timelineIndex < this.timelineSequence.length - 1
      ) {
        return "Resume timeline"
      }
      if (
        this.timelineSequence.length &&
        this.timelineIndex === this.timelineSequence.length - 1
      ) {
        return "Replay timeline"
      }
      return "Play timeline"
    },
  },
  watch: {
    addPlaceOpen(value) {
      if (!value) {
        this.cancelCustomPlace()
        this.$refs.pinEditor?.stopLocationPlacement()
        this.editPlacement = { active: false, coordinates: null }
      }
    },
    "atlasImage.location": {
      immediate: true,
      handler(value) {
        this.atlasImageLocationDraft = value || ""
      },
    },
    "accountProfile.instagramHandle": {
      immediate: true,
      handler(value) {
        this.instagramDraft = value || ""
      },
    },
    "auth.authenticated"(authenticated) {
      if (!authenticated) this.actionFeedback = null
    },
    query(value) {
      this.queuePlaceSearch(value)
    },
  },
  async created() {
    await initializeMyAtlasAuth()
    if (this.auth.authenticated) await this.loadAccount()
  },
  mounted() {
    window.addEventListener("keydown", this.handleKeyboardNavigation)
    document.addEventListener("click", this.handleProfileOutsideClick)
  },
  // This project uses Vue 2; its lint preset also checks the Vue 3 lifecycle.
  // eslint-disable-next-line vue/no-deprecated-destroyed-lifecycle
  beforeDestroy() {
    window.clearTimeout(this.searchTimer)
    window.clearTimeout(this.timelineTimer)
    window.removeEventListener("keydown", this.handleKeyboardNavigation)
    document.removeEventListener("click", this.handleProfileOutsideClick)
    if (this.searchAbortController) this.searchAbortController.abort()
    if (this.atlasImageUrl) URL.revokeObjectURL(this.atlasImageUrl)
  },
  methods: {
    toggleProfileMenu() {
      if (this.accountMenuOpen) this.closeProfileMenu()
      else {
        this.accountMenuOpen = true
        this.$nextTick(() => {
          const menu = this.$refs.authSection
          if (!menu) return
          if (
            menu.getBoundingClientRect().top < 12 ||
            window.innerHeight - menu.getBoundingClientRect().top < 240
          )
            this.$refs.profileTrigger?.scrollIntoView({
              block: "start",
              behavior: "instant",
            })
          this.profileMenuMaxHeight = Math.max(
            100,
            window.innerHeight - menu.getBoundingClientRect().top - 12
          )
          menu.focus({ preventScroll: true })
        })
      }
    },
    closeProfileMenu() {
      this.accountMenuOpen = false
      this.$nextTick(() =>
        this.$refs.profileTrigger?.focus({ preventScroll: true })
      )
    },
    handleProfileOutsideClick(event) {
      if (
        !this.accountMenuOpen ||
        this.$refs.authSection?.contains(event.target) ||
        this.$refs.profileTrigger?.contains(event.target)
      )
        return
      this.accountMenuOpen = false
    },
    async openCustomization() {
      this.accountMenuOpen = false
      await this.selectAtlasTab("overview")
      await this.$nextTick()
      const section = this.$refs.customization
      if (!section) return
      this.customizationOpen = true
      await this.$nextTick()
      section.scrollIntoView({ behavior: "smooth", block: "start" })
      section
        .querySelector(".my-atlas-section-toggle")
        ?.focus({ preventScroll: true })
    },
    async selectAtlasTab(tab) {
      if (!this.atlasTabs.some(item => item.id === tab)) return
      this.activeAtlasTab = tab
      this.cancelLocationPlacement()
      if (this.timelinePlaying && tab !== "overview") this.pauseTimeline()
      if (tab === "planning") {
        if (this.tripWorkspaceVisible)
          await this.openTripWorkspace(false, "planning")
        else await this.openPlanner()
      } else if (tab === "past") {
        this.visitedOpen = true
        if (this.organizedTrips) await this.openTripWorkspace(false, "past")
      }
    },
    handleAtlasTabKey(event, tab) {
      const index = this.atlasTabs.findIndex(item => item.id === tab)
      const target =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? 2
            : event.key === "ArrowRight"
              ? (index + 1) % 3
              : event.key === "ArrowLeft"
                ? (index + 2) % 3
                : -1
      if (target < 0) return
      event.preventDefault()
      const next = this.atlasTabs[target].id
      this.selectAtlasTab(next)
      document.getElementById("atlas-tab-" + next)?.focus()
    },
    cancelDestinationGrouping() {
      this.groupingDestinations = false
      this.selectedVisitedPlaceIds = []
    },
    async groupVisitedDestinations() {
      const places = this.selectedVisitedPlaceIds.map(id =>
        this.pinnedPlaces.find(place => place.placeId === id)
      )
      if (
        !places.length ||
        places.some(place => !place || place.ungrouped === false)
      ) {
        this.showActionFeedback({
          message: "Select an ungrouped destination to add to a trip.",
          tone: "warning",
        })
        return
      }
      await this.openTripWorkspace()
      await this.$refs.trips?.prepareDestinationGroup(places)
    },
    async openTripWorkspace(create = false, tab = "past") {
      this.activeAtlasTab = tab
      this.addPlaceOpen = false
      this.visitedOpen = false
      this.toolsOpen = false
      this.$refs.planner?.closePlanner()
      this.closePinEditor()
      this.cancelCustomPlace()
      await this.$refs.trips?.reveal()
      if (create && this.organizedTrips) this.$refs.trips?.startNew()
      this.$refs.trips?.$el?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    },
    handleTripChange(state) {
      if (state.action === "groupDestinations") this.cancelDestinationGrouping()
      if (state.profile)
        this.accountProfile = {
          ...this.accountProfile,
          ...state.profile,
          tripSchemaVersion: state.upgraded
            ? state.profile.tripSchemaVersion || 1
            : 0,
          tripCount: state.upgraded ? state.profile.tripCount || 0 : 0,
        }
      if (state.idempotent !== undefined)
        this.refreshAccountState().catch(() =>
          this.showActionFeedback({
            message: "Trip saved. Refresh My Atlas to update its overview.",
            tone: "warning",
          })
        )
    },
    handleTripPlacement(value) {
      const active = this.tripPlacement.active
      this.tripPlacement = value
      if (value.active && !active)
        this.$nextTick(() => this.focusMapForPlacement())
    },
    handlePlannerPlacement(value) {
      const wasActive = this.plannerPlacement.active
      this.plannerPlacement = value
      if (value.active && !wasActive) {
        this.cancelCustomPlace()
        this.focusMapForPlacement()
      }
    },
    handleLocationPlacement(value) {
      if (this.tripPlacement.active) this.$refs.trips?.setCoordinates(value)
      else if (this.editPlacement.active)
        this.$refs.pinEditor?.setLocationCoordinates(value)
      else if (this.plannerPlacement.active)
        this.$refs.planner?.setCustomMapCoordinates(value)
      else this.setCustomPlaceCoordinates(value)
    },
    cancelLocationPlacement() {
      this.$refs.trips?.stopPlacement()
      this.$refs.pinEditor?.stopLocationPlacement()
      this.editPlacement = { active: false, coordinates: null }
      this.cancelCustomPlace()
      this.$refs.planner?.stopCustomMapPlacement()
      this.plannerPlacement = { active: false, coordinates: null }
    },
    handleEditPlacement(value) {
      const wasActive = this.editPlacement.active
      this.editPlacement = value
      if (value.active && !wasActive)
        this.$nextTick(() => this.focusMapForPlacement())
    },
    async resolveMapLink(url) {
      return resolveMyAtlasMapLink({
        apiBaseUrl: this.apiBaseUrl,
        accessToken: await getMyAtlasApiAccessToken(),
        url,
      })
    },
    applyCustomCoordinateFields() {
      const values = [this.customLongitudeDraft, this.customLatitudeDraft]
      const coordinates = values.every(value => String(value).trim() !== "")
        ? normalizeMyAtlasCustomCoordinates(values.map(Number))
        : null
      this.customPlaceCoordinates = coordinates ? [...coordinates] : null
      this.customPlaceError = coordinates
        ? ""
        : "Enter valid latitude and longitude, or choose a point on the map."
    },
    async saveVisitExperience(experienceChange) {
      const pinId = this.pinEditorPin?.pinId
      if (
        !pinId ||
        !this.canUseAtlas ||
        this.experiencePending ||
        this.accountPending
      )
        return
      this.experiencePending = true
      this.accountPending = true
      this.experienceError = ""
      let token
      try {
        token = await getMyAtlasApiAccessToken()
        const fingerprint = JSON.stringify({ pinId, experienceChange })
        if (this.experienceAttempt?.fingerprint !== fingerprint)
          this.experienceAttempt = {
            fingerprint,
            revision: this.accountProfile.revision,
            idempotencyKey: crypto.randomUUID(),
          }
        const result = await updateMyAtlasPin({
          apiBaseUrl: this.apiBaseUrl,
          accessToken: token,
          pinId,
          experienceChange,
          revision: this.experienceAttempt.revision,
          idempotencyKey: this.experienceAttempt.idempotencyKey,
        })
        this.pins = this.pins.map(pin =>
          pin.pinId === pinId ? result.pin : pin
        )
        this.pinEditorPin = result.pin
        this.updatePlanningRevision(result.revision)
        this.experienceSavedSequence++
        this.experienceAttempt = null
        this.showActionFeedback({
          message:
            experienceChange.action === "remove"
              ? "Your private experience was removed."
              : "Your private experience was saved.",
        })
      } catch (error) {
        this.experienceError =
          error.code === "revision_conflict"
            ? "Your Atlas changed elsewhere. Your draft is kept. Review the latest entries before saving again."
            : "The experience could not be saved. Your draft is kept. Please retry."
        if (error.code === "revision_conflict" && token) {
          this.experienceAttempt = null
          try {
            await this.refreshAccountState(token)
            this.pinEditorPin =
              this.pins.find(pin => pin.pinId === pinId) || this.pinEditorPin
          } catch {
            /* Preserve the draft and error if refreshing also fails. */
          }
        }
        this.showActionFeedback({
          message: this.experienceError,
          tone: "error",
        })
      } finally {
        this.experiencePending = false
        this.accountPending = false
      }
    },
    async saveAtlasImageLocation() {
      const location = this.validAtlasImageLocation
      if (!location || !this.atlasImage || this.atlasImagePending) return
      this.atlasImagePending = true
      this.atlasImageError = ""
      try {
        const token = await getMyAtlasApiAccessToken()
        const result = await this.withAccountRevisionRetry(token, revision =>
          updateMyAtlasImageVisibility({
            apiBaseUrl: this.apiBaseUrl,
            accessToken: token,
            location,
            revision,
          })
        )
        this.atlasImage = result.atlasImage
        this.updatePlanningRevision(result.revision)
        this.showActionFeedback({ message: "Your photo location was saved." })
      } catch (error) {
        this.atlasImageError = this.atlasImageErrorMessage(error)
      } finally {
        this.atlasImagePending = false
      }
    },
    async saveInstagramHandle() {
      if (!this.accountProfile || this.accountPending) return
      const draft = this.instagramDraft
      const instagramHandle = normalizeInstagramHandle(draft)
      this.instagramError = ""
      if (instagramHandle === null) {
        this.instagramError =
          "Enter a handle with up to 30 letters, numbers, periods or underscores. Do not include a URL."
        return
      }
      this.accountPending = true
      try {
        const token = await getMyAtlasApiAccessToken()
        const result = await this.withAccountRevisionRetry(token, revision =>
          updateMyAtlasInstagram({
            apiBaseUrl: this.apiBaseUrl,
            accessToken: token,
            instagramHandle,
            revision,
          })
        )
        this.accountProfile = result
        this.instagramDraft = instagramHandle
        this.showActionFeedback({
          message: instagramHandle
            ? "Your Instagram link was saved. It is visible when your Atlas is public."
            : "Your Instagram link was removed.",
        })
      } catch {
        this.instagramDraft = draft
        this.instagramError =
          "Your Instagram link could not be saved. Retry shortly."
        this.showActionFeedback({ message: this.instagramError, tone: "error" })
      } finally {
        this.accountPending = false
      }
    },
    showActionFeedback({ message, tone = "success" }) {
      if (!message) return
      this.actionFeedback = { id: ++this.actionFeedbackSequence, message, tone }
    },
    dismissActionFeedback(id) {
      if (this.actionFeedback?.id === id) this.actionFeedback = null
    },
    handlePlannerStateChange(state) {
      const active = state?.active === true
      this.plannerActive = active
      if (!active) this.plannerPlacement = { active: false, coordinates: null }
      this.plannerRoute =
        active && Array.isArray(state?.route) ? state.route : []
      if (active && this.timelinePlaying) this.pauseTimeline()
    },
    openAtlasPanel(panel) {
      this.activeAtlasTab = "past"
      this.$refs.trips?.close()
      if (!this.canUseAtlas) return
      const nextAdd = panel === "add" && !this.addPlaceOpen
      const nextVisited = panel === "visited" && !this.visitedOpen
      this.addPlaceOpen = nextAdd
      this.visitedOpen = panel === "add" ? true : nextVisited
      this.toolsOpen = false
      if (nextAdd || nextVisited) this.$refs.planner?.closePlanner()
      if (nextAdd) this.$nextTick(() => this.$refs.searchInput?.focus())
    },
    async openPlanner() {
      this.activeAtlasTab = "planning"
      this.$refs.trips?.close()
      this.addPlaceOpen = false
      this.visitedOpen = false
      this.toolsOpen = false
      await this.$nextTick()
      await this.$refs.planner?.revealPlanner()
    },
    openTools() {
      this.activeAtlasTab = "overview"
      const opening = !this.toolsOpen
      this.toolsOpen = opening
      if (!opening) return
      this.toolsStatus = ""
      this.addPlaceOpen = false
      this.visitedOpen = false
      this.$refs.planner?.closePlanner()
    },
    updatePlanningRevision(revision) {
      if (
        !this.accountProfile ||
        !Number.isSafeInteger(revision) ||
        revision <= this.accountProfile.revision
      ) {
        return
      }
      this.accountProfile = { ...this.accountProfile, revision }
    },
    handlePlannerPinsCreated(pins) {
      if (!Array.isArray(pins) || !this.accountProfile) return
      pins.forEach(pin => {
        if (!this.pins.some(candidate => candidate.pinId === pin.pinId)) {
          this.pins = [
            ...this.pins,
            {
              pinId: pin.pinId,
              placeId: pin.placeId,
              visitedDates: pin.visitedDates,
              visitedYears: pin.visitedYears,
              memory: pin.memory,
            },
          ]
        }
        this.$set(this.loadedPlaces, pin.placeId, {
          placeId: pin.placeId,
          placeType: pin.placeType,
          name: pin.name,
          countryCode: pin.countryCode,
          admin1Name: pin.admin1Name,
          countryName: pin.countryName,
          continent: pin.continent,
          featureCode: pin.featureCode,
          spotCategory: pin.spotCategory,
          spotKind: pin.spotKind,
          coordinates: pin.coordinates,
          deprecated: false,
        })
      })
      this.accountProfile = {
        ...this.accountProfile,
        pinCount: this.pins.length,
      }
      this.addPlaceOpen = false
      this.visitedOpen = true
      this.recapInvitation = pins.length > 0
      this.activeAtlasTab = "past"
    },
    handleAccountDeleted() {
      this.deleteConfirmation = ""
      this.accountMenuOpen = false
      this.accountProfile = null
      this.accountMissing = true
      this.pins = []
      this.selectedPlaceId = ""
      this.addPlaceOpen = false
      this.visitedOpen = false
      this.toolsOpen = false
      this.toolsStatus = ""
      this.clearAtlasImage()
      this.plannerActive = false
      this.plannerRoute = []
      this.workflowSectionsInitialized = false
      this.announcement = "Your My Atlas application data was deleted."
    },
    applyAccountState(state, { initializeWorkflow = false } = {}) {
      this.accountProfile = state.profile
      this.atlasImage = state.atlasImage || null
      this.accountMissing = false
      this.pins = state.pins.map(pin => ({
        pinId: pin.pinId,
        placeId: pin.placeId,
        visitedDates: pin.visitedDates,
        visitedYears: pin.visitedYears,
        memory: pin.memory,
        ...(pin.experiences === undefined
          ? {}
          : { experiences: pin.experiences }),
      }))
      if (initializeWorkflow && !this.workflowSectionsInitialized) {
        this.addPlaceOpen = false
        this.visitedOpen = false
        this.toolsOpen = false
        this.workflowSectionsInitialized = true
      }
      state.pins.forEach(pin => {
        this.$set(this.loadedPlaces, pin.placeId, {
          placeId: pin.placeId,
          placeType: pin.placeType,
          name: pin.name,
          countryCode: pin.countryCode,
          admin1Name: pin.admin1Name,
          countryName: pin.countryName,
          continent: pin.continent,
          featureCode: pin.featureCode,
          spotCategory: pin.spotCategory,
          spotKind: pin.spotKind,
          coordinates: pin.coordinates,
          deprecated: false,
        })
      })
    },
    async refreshAccountState(accessToken) {
      const state = await fetchMyAtlasState({
        apiBaseUrl: this.apiBaseUrl,
        accessToken,
      })
      this.applyAccountState(state)
      if (state.atlasImage) await this.loadAtlasImage(accessToken)
      else this.clearAtlasImage()
      return state
    },
    clearAtlasImage() {
      if (this.atlasImageUrl) URL.revokeObjectURL(this.atlasImageUrl)
      this.atlasImageUrl = ""
      this.atlasImage = null
      this.atlasImageError = ""
    },
    async loadAtlasImage(accessToken) {
      if (!this.atlasImage) {
        this.clearAtlasImage()
        return
      }
      try {
        const blob = await fetchMyAtlasImage({
          apiBaseUrl: this.apiBaseUrl,
          accessToken,
        })
        const nextUrl = URL.createObjectURL(blob)
        if (this.atlasImageUrl) URL.revokeObjectURL(this.atlasImageUrl)
        this.atlasImageUrl = nextUrl
        this.atlasImageError = ""
      } catch (error) {
        this.atlasImageError = this.atlasImageErrorMessage(error)
      }
    },
    atlasImageErrorMessage(error) {
      const messages = {
        atlas_image_location_required:
          "Enter a photo location before saving or publishing the image.",
        image_empty: "Choose an image before uploading.",
        image_length_required:
          "This browser could not send the image safely. Try another browser.",
        image_too_large: "Choose an image smaller than 10 MiB.",
        image_type_not_supported: "Choose a JPEG, PNG, or WebP image.",
        image_animation_not_supported: "Animated images are not supported.",
        image_dimensions_too_large:
          "Choose an image with fewer than 36 million pixels.",
        image_decode_failed: "This image could not be read.",
        image_processing_failed: "This image could not be processed.",
        image_output_too_large:
          "This image remains too large after processing. Choose another image.",
        atlas_image_service_unavailable:
          "The image service is temporarily unavailable. Try again shortly.",
        unavailable: "The image service could not be reached.",
      }
      const reference = error?.requestId
        ? ` Reference: ${error.requestId}.`
        : ""
      return `${messages[error?.code] || "Your favorite travel image could not be updated."}${reference}`
    },
    async handleAtlasImageSelection(event) {
      const file = event.target.files?.[0]
      event.target.value = ""
      if (!file || !this.accountProfile) return
      const location = this.validAtlasImageLocation
      if (!location) {
        this.atlasImageError =
          "Enter the photo location before choosing an image."
        return
      }
      if (file.size > MY_ATLAS_IMAGE_MAX_INPUT_BYTES) {
        this.atlasImageError = "Choose an image smaller than 10 MiB."
        return
      }
      this.atlasImagePending = true
      this.atlasImageError = ""
      try {
        const token = await getMyAtlasApiAccessToken()
        const result = await this.withAccountRevisionRetry(token, revision =>
          replaceMyAtlasImage({
            apiBaseUrl: this.apiBaseUrl,
            accessToken: token,
            file,
            location,
            revision,
          })
        )
        this.atlasImage = result.atlasImage
        this.updatePlanningRevision(result.revision)
        await this.loadAtlasImage(token)
        this.announcement =
          "Your favorite travel image will be used on Story exports. Choose Show on public profile to share it there."
      } catch (error) {
        this.atlasImageError = this.atlasImageErrorMessage(error)
      } finally {
        this.atlasImagePending = false
      }
    },
    async removeFavoriteImage() {
      if (!this.atlasImage || !this.accountProfile) return
      this.atlasImagePending = true
      this.atlasImageError = ""
      try {
        const token = await getMyAtlasApiAccessToken()
        const revision = await this.withAccountRevisionRetry(
          token,
          currentRevision =>
            removeMyAtlasImage({
              apiBaseUrl: this.apiBaseUrl,
              accessToken: token,
              revision: currentRevision,
            })
        )
        this.updatePlanningRevision(revision)
        this.clearAtlasImage()
        this.announcement = "Your favorite travel image was removed."
      } catch (error) {
        this.atlasImageError = this.atlasImageErrorMessage(error)
      } finally {
        this.atlasImagePending = false
      }
    },
    async toggleFavoriteImageVisibility() {
      if (!this.atlasImage || !this.accountProfile) return
      this.atlasImagePending = true
      this.atlasImageError = ""
      const publicProfile = !this.atlasImage.publicProfile
      try {
        const token = await getMyAtlasApiAccessToken()
        const result = await this.withAccountRevisionRetry(token, revision =>
          updateMyAtlasImageVisibility({
            apiBaseUrl: this.apiBaseUrl,
            accessToken: token,
            publicProfile,
            revision,
          })
        )
        this.atlasImage = result.atlasImage
        this.updatePlanningRevision(result.revision)
        this.announcement = publicProfile
          ? "Your favorite travel image will appear on your public Visited Atlas."
          : "Your favorite travel image is now private."
      } catch (error) {
        this.atlasImageError = this.atlasImageErrorMessage(error)
      } finally {
        this.atlasImagePending = false
      }
    },
    async withAccountRevisionRetry(accessToken, action) {
      try {
        return await action(this.accountProfile.revision)
      } catch (error) {
        if (error?.code !== "revision_conflict") throw error
        const state = await this.refreshAccountState(accessToken)
        return action(state.profile.revision)
      }
    },
    queuePlaceSearch(value, delay = 350) {
      window.clearTimeout(this.searchTimer)
      if (this.searchAbortController) this.searchAbortController.abort()
      this.searchResults = []
      this.searchError = ""
      const request = ++this.searchRequest
      if (!this.canUseAtlas || value.trim().length < 4) {
        this.searchPending = false
        return
      }
      this.searchPending = true
      this.searchTimer = window.setTimeout(async () => {
        if (!this.canUseAtlas) return
        this.searchAbortController = new AbortController()
        try {
          const results = await searchMyAtlasPlaces({
            query: value,
            catalog: placeCatalog,
            endpoint: this.placeSearchEndpoint,
            limit: 8,
            signal: this.searchAbortController.signal,
          })
          if (request !== this.searchRequest) return
          results.forEach(place => {
            this.$set(this.loadedPlaces, place.placeId, place)
          })
          this.searchResults = results
        } catch (error) {
          if (error.name === "AbortError" || request !== this.searchRequest)
            return
          this.searchError = this.placeSearchErrorMessage(error)
        } finally {
          if (request === this.searchRequest) this.searchPending = false
        }
      }, delay)
    },
    retryPlaceSearch() {
      this.queuePlaceSearch(this.query, 0)
    },
    placeSearchErrorMessage(error) {
      return formatMyAtlasPlaceSearchError(error)
    },
    signIn() {
      loginToMyAtlas()
    },
    signOut() {
      this.accountMenuOpen = false
      logoutFromMyAtlas()
    },
    async loadAccount() {
      if (!this.apiBaseUrl) return
      this.accountPending = true
      this.accountError = ""
      this.accountLoadFailed = false
      try {
        const token = await getMyAtlasApiAccessToken()
        discardLegacyDeletion(window.sessionStorage)
        const state = await fetchMyAtlasState({
          apiBaseUrl: this.apiBaseUrl,
          accessToken: token,
        })
        this.applyAccountState(state, { initializeWorkflow: true })
        if (state.atlasImage) await this.loadAtlasImage(token)
        this.$nextTick(() => this.showAccountTutorialIfNeeded())
      } catch (error) {
        if (error.status === 404) {
          this.accountMissing = true
        } else {
          this.accountLoadFailed = true
          this.accountError = this.accountLoadErrorMessage(error)
        }
      } finally {
        this.accountPending = false
      }
    },
    accountLoadErrorMessage(error) {
      const reference = error?.requestId
        ? ` Reference: ${error.requestId}.`
        : ""
      if (
        error?.status === 401 ||
        error?.error === "login_required" ||
        error?.code === "unauthorized"
      ) {
        return `Your Google sign in is present, but the API session needs to be renewed. Sign out, then sign in again.${reference}`
      }
      if (error?.status === 429 || error?.code === "rate_limited") {
        return `Your saved Atlas is busy. Wait about a minute, then retry.${reference}`
      }
      if (
        error?.status === 503 ||
        [
          "account_service_unavailable",
          "catalog_unavailable",
          "identity_provider_unavailable",
          "rate_limit_unavailable",
        ].includes(error?.code)
      ) {
        return `Your saved Atlas is temporarily unavailable. Retry in a moment.${reference}`
      }
      if (error?.code === "unavailable") {
        return `Your saved Atlas could not be reached. Check your connection and retry.${reference}`
      }
      return `Your saved Atlas could not be loaded. Retry without reloading the page.${reference}`
    },
    async registerAccount(registration) {
      this.registrationPending = true
      this.registrationError = ""
      try {
        const token = await getMyAtlasApiAccessToken()
        this.accountProfile = await registerMyAtlasAccount({
          apiBaseUrl: this.apiBaseUrl,
          accessToken: token,
          registration,
        })
        this.accountMissing = false
        this.pins = []
        this.clearAtlasImage()
        this.selectedPlaceId = ""
        this.addPlaceOpen = false
        this.visitedOpen = false
        this.toolsOpen = false
        this.workflowSectionsInitialized = true
        this.announcement =
          "Your private Atlas account was created. Add your first destination."
        this.$nextTick(() => this.openTutorial("account"))
      } catch (error) {
        const messages = {
          service_configuration_error:
            "Account registration is unavailable because the account service is not configured. Your profile has not been created.",
          invalid_registration:
            "Check the invitation code, handle, and required acceptance fields.",
          registration_verification_failed:
            "Human verification expired. Complete it again and retry.",
          registration_unavailable:
            "This invitation could not be used. Confirm that it is active and unused.",
        }
        this.registrationError =
          messages[error.code] ||
          "Your beta account could not be created. Please retry."
        this.$refs.registration?.resetTurnstile()
      } finally {
        this.registrationPending = false
      }
    },
    placeLabel(place) {
      if (place.placeType === "custom") return "Custom map pin"
      const label = formatPlaceLabel(place)
      if (place.placeType === "country") return place.countryName || place.name
      return label.replace(place.name + ", ", "")
    },
    closePinEditor() {
      this.locationAttempt = null
      this.editPlacement = { active: false, coordinates: null }
      this.experienceAttempt = null
      this.experienceError = ""
      this.pinEditorPlace = null
      this.pinEditorPin = null
      this.pinEditorMemoryOnly = false
      this.pinEditorError = ""
      this.pendingCustomPlace = null
    },
    openNewPin(place) {
      this.cancelCustomPlace()
      if (this.pins.some(pin => pin.placeId === place.placeId)) {
        this.accountError = "This destination is already in your Atlas."
        return
      }
      this.pinEditorPlace = place
      this.pinEditorPin = null
      this.pinEditorMemoryOnly = false
      this.pinEditorError = ""
    },
    beginCustomPlace() {
      if (!this.accountProfile) return
      this.closePinEditor()
      this.customPlaceOpen = true
      this.customPlaceCoordinates = null
      this.customLatitudeDraft = ""
      this.customLongitudeDraft = ""
      this.customPlaceError = ""
      const queryName = normalizeMyAtlasCustomPlaceName(this.query)
      this.customPlaceName = queryName || this.query.trim().slice(0, 160)
      this.announcement =
        "Custom pin placement is active. Choose a position on the map."
      this.$nextTick(() => this.$refs.locationPicker?.focusName())
    },
    setCustomPlaceCoordinates(value) {
      if (!this.customPlaceOpen) return
      const coordinates = normalizeMyAtlasCustomCoordinates(value)
      if (!coordinates) {
        this.customPlaceError = "Choose a valid position on the map."
        return
      }
      this.customPlaceCoordinates = [...coordinates]
      this.customLongitudeDraft = String(coordinates[0])
      this.customLatitudeDraft = String(coordinates[1])
      this.customPlaceError = ""
      this.announcement = "Custom pin position selected."
    },
    focusMapForPlacement() {
      this.$nextTick(() => this.$refs.atlasMap?.focusPlacement())
      this.$refs.atlasMap?.$el?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    },
    cancelCustomPlace() {
      this.customPlaceOpen = false
      this.customPlaceName = ""
      this.customPlaceCoordinates = null
      this.customPlaceError = ""
      this.pendingCustomPlace = null
    },
    continueCustomPlace() {
      const customPlace = normalizeMyAtlasCustomPlace({
        name: this.customPlaceName,
        coordinates: this.customPlaceCoordinates,
      })
      if (!customPlace) {
        this.customPlaceError =
          "Enter a valid name and choose a position on the map."
        return
      }
      this.pendingCustomPlace = customPlace
      this.pinEditorPlace = {
        placeId: "custom:draft",
        placeType: "custom",
        name: customPlace.name,
        coordinates: [...customPlace.coordinates],
      }
      this.pinEditorPin = null
      this.pinEditorMemoryOnly = false
      this.pinEditorError = ""
      this.customPlaceOpen = false
      this.customPlaceError = ""
    },
    experienceCount(place) {
      return (
        this.pins.find(pin => pin.placeId === place.placeId)?.experiences
          ?.length || 0
      )
    },
    openVisitExperiences(place) {
      this.recapInvitation = false
      this.openExistingPin(place)
      this.$nextTick(() => {
        const section =
          this.$refs.pinEditor?.$el?.querySelector(".visit-experiences")
        section?.scrollIntoView({ behavior: "smooth", block: "center" })
        section?.querySelector("input")?.focus({ preventScroll: true })
      })
    },
    openExistingPin(place, { memoryOnly = false } = {}) {
      this.activeAtlasTab = "past"
      this.addPlaceOpen = true
      this.visitedOpen = false
      this.toolsOpen = false
      this.$refs.planner?.closePlanner()
      this.pinEditorPlace = place
      this.pinEditorPin = this.pins.find(pin => pin.placeId === place.placeId)
      this.pinEditorMemoryOnly = memoryOnly
      this.pinEditorError = ""
    },
    async savePinDetails({ visitedDates, memory, customPlace }) {
      if (this.pinEditorPin) {
        await this.updatePlaceDetails(
          this.pinEditorPin,
          visitedDates,
          memory,
          customPlace
        )
      } else {
        await this.addPlace(this.pinEditorPlace, visitedDates, memory)
      }
    },
    async addPlace(place, visitedDates = [], memory = "") {
      if (!this.canUseAtlas) return
      if (this.accountProfile) {
        if (place.placeType === "custom" && !this.pendingCustomPlace) {
          this.pinEditorError =
            "This custom pin expired. Return to search and place it again."
          return
        }
        this.accountPending = true
        this.accountError = ""
        this.showActionFeedback({
          message: `Adding ${place.name} to your Visited Atlas.`,
          tone: "busy",
        })
        try {
          const token = await getMyAtlasApiAccessToken()
          const result = await this.withAccountRevisionRetry(token, revision =>
            createMyAtlasPin({
              apiBaseUrl: this.apiBaseUrl,
              accessToken: token,
              ...(place.placeType === "custom" && this.pendingCustomPlace
                ? { customPlace: this.pendingCustomPlace }
                : { placeId: place.placeId }),
              visitedDates,
              memory,
              revision,
            })
          )
          this.pins = [...this.pins, result.pin]
          this.accountProfile = {
            ...this.accountProfile,
            revision: result.revision,
            pinCount: this.accountProfile.pinCount + 1,
          }
          this.$set(this.loadedPlaces, result.pin.placeId, {
            placeId: result.pin.placeId,
            placeType: result.pin.placeType,
            name: result.pin.name,
            countryCode: result.pin.countryCode,
            admin1Name: result.pin.admin1Name,
            countryName: result.pin.countryName,
            continent: result.pin.continent,
            featureCode: result.pin.featureCode,
            spotCategory: result.pin.spotCategory,
            spotKind: result.pin.spotKind,
            coordinates: result.pin.coordinates,
            deprecated: false,
          })
          this.selectedPlaceId = result.pin.placeId
          this.query = ""
          this.closePinEditor()
          this.addPlaceOpen = false
          this.visitedOpen = true
          this.announcement = result.pin.name + " was added to your map."
          this.showActionFeedback({ message: this.announcement })
        } catch (error) {
          const reference = error?.requestId
            ? ` Reference: ${error.requestId}.`
            : ""
          this.pinEditorError =
            error.code === "revision_conflict"
              ? `Your Atlas changed again while saving. Retry once.${reference}`
              : error.code === "place_unavailable"
                ? `This catalog destination is temporarily unavailable.${reference}`
                : `This destination could not be added.${reference}`
          this.showActionFeedback({
            message: this.pinEditorError,
            tone: "error",
          })
        } finally {
          this.accountPending = false
        }
        return
      }
    },
    async updatePlaceDetails(pin, visitedDates, memory, customPlace) {
      if (!this.accountProfile) return
      this.accountPending = true
      this.pinEditorError = ""
      this.showActionFeedback({
        message: `Saving ${pin.name || "destination"} details.`,
        tone: "busy",
      })
      try {
        const token = await getMyAtlasApiAccessToken()
        if (customPlace) {
          const fingerprint = JSON.stringify({
            pinId: pin.pinId,
            visitedDates,
            memory,
            customPlace,
          })
          if (this.locationAttempt?.fingerprint !== fingerprint)
            this.locationAttempt = {
              fingerprint,
              revision: this.accountProfile.revision,
              key: crypto.randomUUID(),
            }
        }
        const write = revision =>
          updateMyAtlasPin({
            apiBaseUrl: this.apiBaseUrl,
            accessToken: token,
            pinId: pin.pinId,
            visitedDates,
            memory,
            ...(customPlace ? { customPlace } : {}),
            ...(customPlace
              ? { idempotencyKey: this.locationAttempt.key }
              : {}),
            revision,
          })
        const result = customPlace
          ? await write(this.locationAttempt.revision)
          : await this.withAccountRevisionRetry(token, write)
        this.pins = this.pins.map(candidate =>
          candidate.pinId === pin.pinId
            ? { ...candidate, ...result.pin }
            : candidate
        )
        if (customPlace)
          this.$set(this.loadedPlaces, result.pin.placeId, {
            ...this.loadedPlaces[result.pin.placeId],
            ...result.pin,
          })
        this.accountProfile = {
          ...this.accountProfile,
          revision: result.revision,
        }
        this.closePinEditor()
        this.announcement = "Destination details were updated."
        this.showActionFeedback({ message: this.announcement })
      } catch (error) {
        if (customPlace && error.code === "revision_conflict") {
          this.locationAttempt = null
          try {
            await this.refreshAccountState()
          } catch {
            /* Keep the draft available. */
          }
        }
        this.pinEditorError =
          error.code === "revision_conflict"
            ? "Your Atlas changed. Review this location draft and retry saving."
            : "These destination details could not be saved. Your draft is still here."
        this.showActionFeedback({ message: this.pinEditorError, tone: "error" })
      } finally {
        this.accountPending = false
      }
    },
    async removePlace(place) {
      if (!this.canUseAtlas) return
      if (this.accountProfile) {
        const pin = this.pins.find(item => item.placeId === place.placeId)
        if (!pin) return
        this.accountPending = true
        this.accountError = ""
        try {
          const token = await getMyAtlasApiAccessToken()
          const revision = await this.withAccountRevisionRetry(
            token,
            currentRevision =>
              deleteMyAtlasPin({
                apiBaseUrl: this.apiBaseUrl,
                accessToken: token,
                pinId: pin.pinId,
                revision: currentRevision,
              })
          )
          this.pins = this.pins.filter(item => item.pinId !== pin.pinId)
          this.accountProfile = {
            ...this.accountProfile,
            revision,
            pinCount: Math.max(0, this.accountProfile.pinCount - 1),
            public: this.pins.length > 0 && this.accountProfile.public,
          }
          if (this.selectedPlaceId === place.placeId) {
            this.selectedPlaceId = ""
          }
          if (this.pinEditorPin?.pinId === pin.pinId) this.closePinEditor()
          if (place.placeType === "custom") {
            this.$delete(this.loadedPlaces, place.placeId)
          }
          this.announcement = place.name + " was removed from your map."
        } catch (error) {
          this.accountError = "This place could not be removed from your Atlas."
        } finally {
          this.accountPending = false
        }
        return
      }
    },
    selectPin(placeId) {
      if (this.timelinePlaying) this.pauseTimeline()
      this.selectedPlaceId = placeId
      const place = this.displayedPlaces.find(item => item.placeId === placeId)
      this.announcement = place?.memory
        ? `${place.name}. Favorite memory is visible on the map.`
        : `${place?.name || "Destination"} selected.`
    },
    cyclePin(direction) {
      if (!this.displayedPlaces.length) return
      if (this.timelinePlaying) this.pauseTimeline()
      const currentIndex = this.displayedPlaces.findIndex(
        place => place.placeId === this.selectedPlaceId
      )
      const baseIndex =
        currentIndex >= 0 ? currentIndex : direction > 0 ? -1 : 0
      const nextIndex =
        (baseIndex + direction + this.displayedPlaces.length) %
        this.displayedPlaces.length
      this.selectedPlaceId = this.displayedPlaces[nextIndex].placeId
    },
    handleKeyboardNavigation(event) {
      if (!this.canUseAtlas || this.tutorialOpen) return
      const tag = event.target?.tagName?.toLowerCase()
      if (["input", "select", "textarea", "button"].includes(tag)) return
      if (event.key === "ArrowLeft") this.cyclePin(-1)
      if (event.key === "ArrowRight") this.cyclePin(1)
    },
    openTutorial(variant = "preview") {
      if (!this.canUseAtlas) return
      this.tutorialVariant = variant === "account" ? "account" : "preview"
      this.tutorialOpen = true
    },
    closeTutorial() {
      if (this.tutorialVariant === "account") {
        this.markAccountTutorialSeen()
      }
      this.tutorialOpen = false
    },
    completeTutorial() {
      const variant = this.tutorialVariant
      this.closeTutorial()
      if (variant === "account") {
        this.addPlaceOpen = true
        this.visitedOpen = false
      }
      this.$nextTick(() => {
        if (variant === "account") {
          this.$refs.searchInput?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          })
          this.$refs.searchInput?.focus()
          return
        }
        const registration = this.$refs.registration?.$el
        const target = registration || this.$refs.authSection
        target?.scrollIntoView({ behavior: "smooth", block: "center" })
        if (!this.auth.authenticated) this.$refs.signInButton?.focus()
      })
    },
    accountTutorialStorageKey() {
      return this.accountProfile?.handle
        ? `${ACCOUNT_TUTORIAL_STORAGE_PREFIX}${this.accountProfile.handle}`
        : ""
    },
    accountTutorialSeen() {
      const key = this.accountTutorialStorageKey()
      if (!key) return false
      try {
        return window.localStorage.getItem(key) === "seen"
      } catch (error) {
        return false
      }
    },
    markAccountTutorialSeen() {
      const key = this.accountTutorialStorageKey()
      if (!key) return
      try {
        window.localStorage.setItem(key, "seen")
      } catch (error) {
        // Storage can be unavailable in strict privacy modes.
      }
    },
    showAccountTutorialIfNeeded() {
      if (
        !this.accountProfile ||
        this.accountProfile.revision !== 1 ||
        Number(this.accountProfile.pinCount || 0) !== 0 ||
        this.pins.length ||
        this.accountTutorialSeen()
      ) {
        return
      }
      this.openTutorial("account")
    },
    pauseTimeline() {
      window.clearTimeout(this.timelineTimer)
      this.timelineTimer = null
      this.timelinePlaying = false
    },
    resetTimeline() {
      this.pauseTimeline()
      this.timelineIndex = -1
    },
    showTimelineStep(index) {
      const entry = this.timelineSequence[index]
      if (!entry) return false
      this.timelineIndex = index
      this.selectedPlaceId = entry.place.placeId
      this.announcement = `${entry.place.name}, ${entry.year}`
      return true
    },
    scheduleTimelineStep() {
      window.clearTimeout(this.timelineTimer)
      this.timelineTimer = window.setTimeout(() => {
        if (!this.timelinePlaying) return
        const nextIndex = this.timelineIndex + 1
        if (!this.showTimelineStep(nextIndex)) {
          this.timelinePlaying = false
          this.timelineTimer = null
          return
        }
        this.scheduleTimelineStep()
      }, 4200)
    },
    toggleTimeline() {
      if (this.timelinePlaying) {
        this.pauseTimeline()
        return
      }
      if (!this.timelineSequence.length) return
      this.yearFilter = "all"
      if (
        this.timelineIndex < 0 ||
        this.timelineIndex >= this.timelineSequence.length - 1
      ) {
        this.showTimelineStep(0)
      }
      this.timelinePlaying = true
      this.scheduleTimelineStep()
    },
    async exportStory() {
      if (this.storyExportPending) return
      if (!this.pinnedPlaces.length) {
        this.toolsStatus =
          "Add at least one visited place before exporting a Story image."
        return
      }
      this.storyExportPending = true
      this.toolsStatus = "Creating your Story image."
      try {
        if (this.atlasImage && !this.atlasImageUrl) {
          const token = await getMyAtlasApiAccessToken()
          await this.loadAtlasImage(token)
          if (!this.atlasImageUrl) throw new Error("atlas_image_unavailable")
        }
        await this.$nextTick()
        const favoriteImage = this.$refs.favoriteImagePreview || null
        if (favoriteImage?.decode) await favoriteImage.decode()
        const filename = await downloadMyAtlasStory({
          displayName: this.accountProfile?.displayName || this.authDisplayName,
          favoriteImage,
          favoriteImageLocation: this.atlasImage?.location || "",
          filterLabel: this.filterLabel,
          handle: this.accountProfile?.handle || "",
          places: this.displayedPlaces,
          stats: this.visibleStats,
        })
        this.toolsStatus = `${filename} was downloaded.`
        this.announcement = this.toolsStatus
      } catch {
        this.atlasImageError =
          "Your Atlas Story image could not be created. Try again."
        this.toolsStatus = this.atlasImageError
      } finally {
        this.storyExportPending = false
      }
    },
    formatVisitedDates,
    placeTypeLabel: formatPlaceTypeLabel,
    async toggleSharing() {
      this.accountPending = true
      this.accountError = ""
      this.toolsStatus = "Updating your Atlas sharing setting."
      try {
        const token = await getMyAtlasApiAccessToken()
        const publish = !this.accountProfile.public
        this.accountProfile = await this.withAccountRevisionRetry(
          token,
          revision =>
            updateMyAtlasSharing({
              apiBaseUrl: this.apiBaseUrl,
              accessToken: token,
              public: publish,
              revision,
            })
        )
        this.announcement = this.accountProfile.public
          ? "Your Atlas is now available through your share link."
          : "Your Atlas is private."
        this.toolsStatus = this.announcement
      } catch (error) {
        this.accountError = "Your sharing setting could not be changed."
        this.toolsStatus = this.accountError
      } finally {
        this.accountPending = false
      }
    },
    async copyShareLink() {
      try {
        await navigator.clipboard.writeText(this.shareUrl)
        this.announcement = "Your Atlas link was copied."
        this.toolsStatus = this.announcement
      } catch (error) {
        this.announcement = "Copy the visible Atlas link to share it."
        this.toolsStatus = this.announcement
      }
    },
    async deleteAccount() {
      if (
        !this.canUseAtlas ||
        this.accountPending ||
        this.atlasImagePending ||
        this.deleteConfirmation !== "DELETE MY ATLAS"
      )
        return
      if (
        !window.confirm(
          "Permanently delete all My Atlas application data? This cannot be undone."
        )
      )
        return
      this.accountPending = true
      this.accountError = ""
      this.toolsStatus = "Deleting your My Atlas account."
      try {
        const storageKey = accountDeletionStorageKey(
          this.apiBaseUrl,
          this.accountProfile
        )
        let operation = null
        try {
          operation = JSON.parse(window.sessionStorage.getItem(storageKey))
        } catch {
          /* Replace invalid recovery state below. */
        }
        if (
          !operation?.idempotencyKey ||
          !Number.isSafeInteger(operation?.revision) ||
          operation.revision < 1
        ) {
          operation = {
            idempotencyKey: window.crypto.randomUUID(),
            revision: this.accountProfile.revision,
          }
          window.sessionStorage.setItem(storageKey, JSON.stringify(operation))
        }
        await deleteMyAtlasAccountWithRevisionRecovery({
          apiBaseUrl: this.apiBaseUrl,
          accountId: this.accountProfile.userId,
          accessToken: await getMyAtlasApiAccessToken(),
          revision: operation.revision,
          idempotencyKey: operation.idempotencyKey,
          onRevision: revision => {
            operation = { ...operation, revision }
            window.sessionStorage.setItem(storageKey, JSON.stringify(operation))
            this.updatePlanningRevision(revision)
          },
        })
        window.sessionStorage.removeItem(storageKey)
        this.handleAccountDeleted()
        logoutFromMyAtlas()
      } catch (error) {
        const reference = error?.requestId
          ? ` Reference: ${error.requestId}.`
          : ""
        this.accountError = `Your account could not be deleted. Try again.${reference}`
        this.toolsStatus = this.accountError
      } finally {
        this.accountPending = false
      }
    },
    async exportAccountData() {
      if (!this.canUseAtlas || this.accountPending) return
      this.accountPending = true
      this.accountError = ""
      try {
        const value = await fetchMyAtlasAccountExport({
          apiBaseUrl: this.apiBaseUrl,
          accessToken: await getMyAtlasApiAccessToken(),
        })
        const blob = new Blob([JSON.stringify(value, null, 2)], {
          type: "application/json",
        })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `my-atlas-${new Date().toISOString().slice(0, 10)}.json`
        document.body.appendChild(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(url)
        this.toolsStatus = "Your private My Atlas data export was downloaded."
      } catch {
        this.toolsStatus =
          "Your private account data could not be downloaded. Try again."
      } finally {
        this.accountPending = false
      }
    },
    async toggleDiscovery() {
      this.accountPending = true
      this.accountError = ""
      this.toolsStatus = "Updating your Atlas discovery setting."
      try {
        const token = await getMyAtlasApiAccessToken()
        const discoverable = !this.accountProfile.discoverable
        this.accountProfile = await this.withAccountRevisionRetry(
          token,
          revision =>
            updateMyAtlasDiscovery({
              apiBaseUrl: this.apiBaseUrl,
              accessToken: token,
              discoverable,
              revision,
            })
        )
        this.announcement = discoverable
          ? "Your Atlas can now appear in Explore Atlases."
          : "Your Atlas was removed from Explore Atlases."
        this.toolsStatus = this.announcement
      } catch {
        this.accountError = "Your discovery setting could not be changed."
        this.toolsStatus = this.accountError
      } finally {
        this.accountPending = false
      }
    },
  },
}
</script>

<style scoped>
.my-atlas-custom-coordinate-fields {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 0.6rem;
}
.my-atlas-custom-coordinate-fields label {
  display: grid;
  gap: 0.3rem;
  font-size: 0.75rem;
  min-width: 0;
}
.my-atlas-custom-coordinate-fields input {
  width: 100%;
  box-sizing: border-box;
  min-width: 0;
  padding: 0.65rem;
  font: inherit;
  color: var(--color-text);
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border, #567);
  border-radius: 0.5rem;
}
.my-atlas-proof {
  position: relative;
  min-height: 100dvh;
  overflow: hidden;
  color: var(--color-text, #edf7f2);
  background: var(--color-page, #0d1719);
  font-family: "Poppins", sans-serif;
}

.my-atlas-panel {
  box-sizing: border-box;
  position: relative;
  z-index: 3;
  display: flex;
  flex-direction: column;
  min-width: 0;
  width: min(30rem, calc(100vw - 2rem));
  max-height: calc(100dvh - 2rem);
  margin: 1rem;
  padding: 1.25rem;
  overflow-y: auto;
  border: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.12);
  border-radius: 1.5rem;
  background: rgba(var(--color-page-rgb, 10, 20, 22), 0.92);
  box-shadow: 0 1.4rem 4rem rgba(0, 0, 0, 0.42);
  backdrop-filter: blur(18px);
  transition: width 180ms ease;
}

.my-atlas-panel.is-planning {
  width: min(52rem, calc(100vw - 2rem));
}

.my-atlas-panel > * {
  flex: 0 0 auto;
}

.my-atlas-panel > header {
  order: -30;
}

.my-atlas-intro {
  order: -20;
}

.my-atlas-account {
  order: -10;
}

.my-atlas-panel > .my-atlas-registration {
  order: -5;
}

.my-atlas-panel > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  color: var(--color-accent-soft, #e6ba68);
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.72rem;
  font-weight: 700;
}

.my-atlas-theme-selector {
  margin-left: auto;
}

.my-atlas-brand-lockup {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.my-atlas-brand-lockup > a {
  display: grid;
  width: 2.35rem;
  height: 2.35rem;
  place-items: center;
  letter-spacing: 0;
}

.my-atlas-profile-trigger,
.my-atlas-header-sign-in {
  flex: 0 0 auto;
  min-width: 2.35rem;
  min-height: 2.35rem;
  padding: 0.45rem;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.55);
  border-radius: 999px;
  color: var(--color-accent-contrast, #132023);
  background: var(--color-accent, #e6ba68);
  font: inherit;
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  cursor: pointer;
}

.my-atlas-header-sign-in {
  padding-right: 0.85rem;
  padding-left: 0.85rem;
  color: var(--color-accent-soft, #f7e6bf);
  background: rgba(var(--color-accent-rgb, 230, 186, 104), 0.08);
  text-transform: none;
  letter-spacing: 0;
}

.my-atlas-profile-trigger:focus-visible,
.my-atlas-header-sign-in:focus-visible {
  outline: 2px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.5);
  outline-offset: 0.15rem;
}

.my-atlas-intro {
  margin: 1.8rem 0 1.35rem;
}

.my-atlas-overview {
  display: grid;
  gap: 0.8rem;
  margin: 0 0 1.25rem;
  padding: 0.9rem;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.2);
  border-radius: 1rem;
  background:
    radial-gradient(
      circle at 100% 0%,
      rgba(var(--color-accent-rgb, 230, 186, 104), 0.12),
      transparent 42%
    ),
    rgba(var(--color-highlight-rgb, 255, 255, 255), 0.035);
}

.my-atlas-overview-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.45rem;
  padding-top: 0.7rem;
  border-top: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.09);
}

.my-atlas-overview-actions.has-planner-action {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.my-atlas-overview-actions button {
  min-height: 2.75rem;
  padding: 0.55rem 0.65rem;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.34);
  border-radius: 0.7rem;
  color: var(--color-accent-soft, #f4d38f);
  background: rgba(var(--color-accent-rgb, 230, 186, 104), 0.06);
  font: inherit;
  font-size: 0.62rem;
  font-weight: 700;
  cursor: pointer;
}

.my-atlas-overview-actions button.is-active {
  color: var(--color-accent-contrast, #132023);
  background: var(--color-accent, #e6ba68);
}

.my-atlas-overview-actions b {
  margin-left: 0.25rem;
}

.my-atlas-overview-panel {
  margin-top: -1.26rem;
  margin-bottom: 1.25rem;
  border-color: rgba(var(--color-accent-rgb, 230, 186, 104), 0.2);
  border-top: 0;
  border-radius: 0 0 1rem 1rem;
  background: rgba(var(--color-highlight-rgb, 255, 255, 255), 0.035);
}

.my-atlas-panel-label {
  margin: 0 0 0.65rem;
  color: var(--color-accent-soft, #d6ba7c);
  font-size: 0.6rem;
  font-weight: 700;
}

.my-atlas-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.4rem;
}

.my-atlas-stats > div {
  display: grid;
  gap: 0.1rem;
  min-width: 0;
  padding: 0.55rem 0.35rem;
  border-radius: 0.7rem;
  text-align: center;
  background: rgba(var(--color-highlight-rgb, 255, 255, 255), 0.055);
}

.my-atlas-stats strong {
  color: var(--color-accent-soft, #f0c978);
  font-size: 1.15rem;
}

.my-atlas-stats span {
  overflow: hidden;
  color: var(--color-text-muted, #91a49e);
  text-overflow: ellipsis;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 0.5rem;
}

.my-atlas-view-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.45rem;
}

.my-atlas-controls-drawer {
  display: grid;
  gap: 0.6rem;
}

.my-atlas-mobile-controls-toggle {
  display: none;
}

.my-atlas-view-controls label {
  display: grid;
  flex: 1 1 10rem;
  gap: 0.2rem;
  color: var(--color-text-muted, #93a69f);
  font-size: 0.62rem;
}

.my-atlas-view-controls select,
.my-atlas-view-controls button,
.my-atlas-selected button {
  padding: 0.5rem 0.6rem;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.4);
  border-radius: 0.65rem;
  color: var(--color-accent-soft, #f7e6bf);
  background: rgba(var(--color-accent-rgb, 230, 186, 104), 0.07);
  font: inherit;
  font-size: 0.62rem;
  font-weight: 700;
  cursor: pointer;
}

.my-atlas-view-controls select {
  display: block;
  color: var(--color-text, #edf7f2);
  background: var(--color-surface-raised, #111f22);
}

.my-atlas-timeline-year {
  display: grid;
  gap: 0.12rem;
  margin: 0;
  color: var(--color-accent-soft, #f0c978);
  font-family: "Poppins", system-ui, sans-serif;
  font-size: 1.25rem;
}

.my-atlas-timeline-year span {
  color: var(--color-text-muted, #94a79f);
  font-family: "Poppins", sans-serif;
  font-size: 0.62rem;
  font-weight: 700;
}

.my-atlas-connections-note {
  margin: 0;
  color: var(--color-text-subtle, #7f938c);
  font-size: 0.6rem;
}

.my-atlas-selected {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.55rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.09);
}

.my-atlas-selected > div {
  display: grid;
  min-width: 0;
  text-align: center;
}

.my-atlas-selected strong {
  overflow: hidden;
  color: var(--color-text, #f4fbf7);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.my-atlas-selected span,
.my-atlas-selected small {
  overflow: hidden;
  color: var(--color-text-muted, #91a49e);
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.62rem;
}

.my-atlas-selected small {
  color: var(--color-accent-soft, #d9bd80);
}

.my-atlas-selected blockquote {
  grid-column: 1 / -1;
  margin: 0;
  padding: 0.55rem 0.65rem;
  border-left: 2px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.55);
  color: var(--color-text, #dce9e4);
  background: rgba(var(--color-accent-rgb, 230, 186, 104), 0.06);
  font-size: 0.68rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.my-atlas-selected-memory-empty {
  grid-column: 1 / -1;
  margin: 0;
  color: var(--color-text-muted, #91a49e);
  text-align: center;
  font-size: 0.65rem;
}

.my-atlas-selected .my-atlas-selected-memory-action {
  grid-column: 1 / -1;
  justify-self: center;
  min-height: 2.75rem;
  padding-inline: 1rem;
  color: var(--color-accent-contrast, #132023);
  background: var(--color-accent, #e6ba68);
}

.my-atlas-intro h1 {
  max-width: 10em;
  margin: 0;
  font-family: "Poppins", system-ui, sans-serif;
  font-size: clamp(2rem, 6vw, 3.2rem);
  line-height: 0.98;
  text-wrap: balance;
}

.my-atlas-intro-copy {
  margin: 1rem 0 0;
  color: var(--color-text-muted, #b2c2bd);
  font-size: 0.88rem;
  line-height: 1.55;
}

.my-atlas-intro-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem 0.65rem;
  margin-top: 1rem;
}

.my-atlas-profile-links {
  margin-top: 1rem;
  padding: 0.8rem;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.3);
  border-radius: 0.8rem;
}

.my-atlas-image-location {
  display: grid;
  gap: 0.4rem;
  margin-top: 0.8rem;
  color: var(--color-text, #edf7f2);
}
.my-atlas-image-location input {
  box-sizing: border-box;
  width: 100%;
  border: 1px solid var(--color-control-border, #8fa29c);
  border-radius: 0.5rem;
  padding: 0.6rem;
  color: inherit;
  background: var(--color-surface-raised, #111f22);
}
.my-atlas-profile-links summary {
  color: var(--color-accent-soft, #f4d38f);
  cursor: pointer;
  font-weight: 700;
}
.my-atlas-profile-links form {
  display: grid;
  gap: 0.65rem;
  padding-top: 0.8rem;
}
.my-atlas-profile-links input {
  box-sizing: border-box;
  width: 100%;
  color: var(--color-text, #edf7f2);
  background: var(--color-surface-raised, #111f22);
  border: 1px solid var(--color-control-border, #8fa29c);
  border-radius: 0.5rem;
  padding: 0.65rem;
}
.my-atlas-profile-links label,
.my-atlas-profile-links p,
.my-atlas-profile-links a {
  margin: 0;
  font-size: 0.72rem;
  line-height: 1.5;
}
.my-atlas-profile-links a {
  color: var(--color-accent-soft, #f4d38f);
  overflow-wrap: anywhere;
}
.my-atlas-profile-links button {
  justify-self: start;
  border: 1px solid var(--color-accent, #e6ba68);
  border-radius: 999px;
  padding: 0.6rem 0.85rem;
  color: var(--color-accent-soft, #f4d38f);
  background: transparent;
  cursor: pointer;
}
.my-atlas-profile-links :focus-visible {
  outline: 2px solid var(--color-focus, #f4d38f);
  outline-offset: 3px;
}

.my-atlas-intro-actions button,
.my-atlas-intro-actions .my-atlas-explore-link {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  justify-content: center;
  line-height: 1.3;
}

.my-atlas-intro-actions .my-atlas-explore-link {
  box-sizing: border-box;
  padding: 0.65rem 0.85rem;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.5);
  border-radius: 999px;
  color: var(--color-accent-soft, #f7e6bf);
  background: transparent;
  font: inherit;
  font-size: 0.7rem;
  font-weight: 700;
  text-decoration: none;
}

.my-atlas-intro-actions button {
  padding: 0.65rem 0.85rem;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.5);
  border-radius: 999px;
  color: var(--color-accent-soft, #f7e6bf);
  background: rgba(var(--color-accent-rgb, 230, 186, 104), 0.08);
  font: inherit;
  font-size: 0.7rem;
  font-weight: 700;
  cursor: pointer;
}

.my-atlas-intro-actions button:hover,
.my-atlas-intro-actions button:focus-visible,
.my-atlas-intro-actions .my-atlas-explore-link:hover,
.my-atlas-intro-actions .my-atlas-explore-link:focus-visible {
  border-color: var(--color-accent, #e6ba68);
  background: rgba(var(--color-accent-rgb, 230, 186, 104), 0.14);
  outline: none;
}

.my-atlas-search {
  display: grid;
  gap: 0.4rem;
}

.my-atlas-account {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: center;
  justify-items: stretch;
  width: 100%;
  height: auto;
  min-height: 2.75rem;
  margin: 0 0 1.25rem;
  padding: 0.6rem;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.35);
  border-radius: 1rem;
  color: inherit;
  background: var(--color-surface, #101d20);
  box-shadow: 0 1rem 2.5rem rgba(0, 0, 0, 0.4);
  line-height: 1.2;
}

.my-atlas-account.is-menu {
  position: absolute;
  top: 4.25rem;
  right: 1.25rem;
  z-index: 8;
  width: min(22rem, calc(100% - 2.5rem));
  margin: 0;
  max-height: calc(100dvh - 6rem);
  overflow-y: auto;
  overscroll-behavior: contain;
}

.my-atlas-profile-settings {
  display: grid;
  gap: 0.75rem;
  min-width: 0;
  padding: 0.75rem 0.2rem 0.2rem;
}
.my-atlas-profile-menu-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.my-atlas-profile-menu-heading h2 {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.3;
}
.my-atlas-profile-menu-heading button,
.my-atlas-profile-customize {
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.4);
  border-radius: 0.6rem;
  padding: 0.55rem 0.7rem;
  color: var(--color-accent-soft, #e6ba68);
  background: transparent;
  font: inherit;
  font-size: 0.72rem;
  line-height: 1.4;
  cursor: pointer;
}
.my-atlas-profile-help {
  margin: 0;
  color: var(--color-text-muted, #aebdb8);
  font-size: 0.7rem;
  line-height: 1.5;
}
.my-atlas-profile-settings .my-atlas-explore-link {
  padding: 0;
  color: var(--color-accent-soft, #e6ba68);
  font-size: 0.75rem;
  line-height: 1.5;
}
.my-atlas-customization h3 {
  margin: 0;
  font-size: 0.85rem;
}
.my-atlas-overview-journeys {
  display: grid;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.1);
}
.my-atlas-overview-journeys h2 {
  margin: 0;
  font-size: 0.9rem;
}
.my-atlas-overview-journeys p {
  margin: 0;
  font-size: 0.72rem;
  line-height: 1.5;
  color: var(--color-text-muted, #aebdb8);
}
.my-atlas-customization > div > p {
  margin: 0;
  color: var(--color-text-muted, #aebdb8);
  font-size: 0.75rem;
  line-height: 1.6;
}

.my-atlas-account:focus {
  outline: 2px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.45);
  outline-offset: 0.18rem;
}

.my-atlas-account-status {
  margin: 0;
  color: var(--color-text-muted, #9eb0aa);
  font-size: 0.66rem;
}

.my-atlas-sign-in,
.my-atlas-account-card button,
.my-atlas-tools-actions button {
  min-height: 2.75rem;
  padding: 0.55rem 0.75rem;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.45);
  border-radius: 999px;
  color: var(--color-accent-contrast, #132023);
  background: var(--color-accent, #e6ba68);
  font: inherit;
  font-size: 0.66rem;
  font-weight: 700;
  cursor: pointer;
}

.my-atlas-account-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 0.55rem;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: 0.55rem 0.6rem 0.55rem 0.75rem;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.35);
  border-radius: 0.85rem;
  color: var(--color-text, #edf7f2);
  background: rgba(var(--color-accent-rgb, 230, 186, 104), 0.08);
  line-height: 1.2;
}

.my-atlas-account-card > span {
  display: grid;
  min-width: 0;
  line-height: 1.2;
  text-align: left;
}

.my-atlas-account-card strong,
.my-atlas-account-card small {
  display: block;
  overflow: hidden;
  margin: 0;
  padding: 0;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.my-atlas-account-card small {
  color: var(--color-text-muted, #aebdb8);
  font-size: 0.54rem;
}

.my-atlas-account-card button {
  min-width: 6rem;
  border-radius: 0.65rem;
  color: var(--color-accent-soft, #f4d38f);
  background: rgba(var(--color-accent-rgb, 230, 186, 104), 0.07);
}

.my-atlas-sign-in:focus,
.my-atlas-sign-in:focus-visible,
.my-atlas-account-card button:focus,
.my-atlas-account-card button:focus-visible {
  border-color: var(--color-accent, #e6ba68);
  background: rgba(var(--color-accent-rgb, 230, 186, 104), 0.14);
  outline: 2px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.35);
  outline-offset: 0.12rem;
}

.my-atlas-account > .my-atlas-auth-error,
.my-atlas-account > .my-atlas-auth-success {
  position: static;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  margin: 0.4rem 0 0;
  padding: 0.35rem 0.5rem;
  border-radius: 0.5rem;
  background: var(--color-surface-raised, #111f22);
  font-size: 0.58rem;
}

.my-atlas-account > .my-atlas-auth-error {
  color: var(--color-error, #e6a8a1);
}

.my-atlas-account > .my-atlas-auth-success {
  color: var(--color-success, #9bd3b0);
}

.my-atlas-workflow-section {
  margin-top: 0.8rem;
  overflow: hidden;
  border: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.11);
  border-radius: 0.9rem;
  background: rgba(var(--color-highlight-rgb, 255, 255, 255), 0.025);
}

.my-atlas-section-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  box-sizing: border-box;
  width: 100%;
  min-height: 3.75rem;
  padding: 0.72rem 0.8rem;
  border: 0;
  color: inherit;
  text-align: left;
  background: transparent;
  font: inherit;
  cursor: pointer;
}

.my-atlas-section-toggle > span {
  display: grid;
  gap: 0.12rem;
  min-width: 0;
}

.my-atlas-section-toggle strong {
  color: var(--color-text, #edf7f2);
  font-size: 0.74rem;
}

.my-atlas-section-toggle small {
  overflow: hidden;
  color: var(--color-text-muted, #8fa29c);
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.58rem;
}

.my-atlas-section-toggle b {
  flex: 0 0 auto;
  padding: 0.35rem 0.5rem;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.34);
  border-radius: 999px;
  color: var(--color-accent-soft, #efc975);
  background: rgba(var(--color-accent-rgb, 230, 186, 104), 0.07);
  font-size: 0.6rem;
  white-space: nowrap;
}

.my-atlas-section-toggle:hover,
.my-atlas-section-toggle:focus-visible {
  background: rgba(var(--color-accent-rgb, 230, 186, 104), 0.055);
  outline: none;
}

.my-atlas-section-toggle:focus-visible {
  box-shadow: inset 0 0 0 2px rgba(230, 186, 104, 0.55);
}

.my-atlas-section-toggle:disabled {
  cursor: not-allowed;
  opacity: 0.68;
}

.my-atlas-section-content {
  display: grid;
  gap: 0.75rem;
  padding: 0.8rem;
  border-top: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.09);
}

.my-atlas-tools-content > p {
  margin: 0;
  color: var(--color-text-muted, #9bada7);
  font-size: 0.66rem;
  line-height: 1.55;
}

.my-atlas-tools-empty {
  display: grid;
  gap: 0.4rem;
  padding: 0.75rem;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.32);
  border-radius: 0.75rem;
  background: rgba(var(--color-accent-rgb, 230, 186, 104), 0.06);
}

.my-atlas-tools-empty strong {
  color: var(--color-accent-soft, #f3d38f);
  font-size: 0.76rem;
}

.my-atlas-tools-empty p,
.my-atlas-tools-status {
  margin: 0;
  color: var(--color-text-muted, #a8bab4);
  font-size: 0.66rem;
  line-height: 1.5;
}

.my-atlas-tools-empty button {
  justify-self: start;
  min-height: 2.75rem;
  padding: 0.55rem 0.75rem;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.45);
  border-radius: 0.7rem;
  color: var(--color-accent-contrast, #102023);
  background: var(--color-accent, #e6ba68);
  font: inherit;
  font-size: 0.66rem;
  font-weight: 800;
  cursor: pointer;
}

.my-atlas-tools-status {
  padding: 0.65rem 0.7rem;
  border-left: 2px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.65);
  color: var(--color-text, #d6e3de);
  background: rgba(var(--color-highlight-rgb, 255, 255, 255), 0.025);
}

.my-atlas-favorite-image {
  display: grid;
  grid-template-columns: 7.5rem minmax(0, 1fr);
  gap: 0.85rem;
  padding: 0.75rem;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.22);
  border-radius: 0.85rem;
  background: rgba(var(--color-accent-rgb, 230, 186, 104), 0.045);
}

.my-atlas-favorite-image-preview {
  display: grid;
  width: 7.5rem;
  aspect-ratio: 1;
  overflow: hidden;
  place-items: center;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.35);
  border-radius: 0.8rem;
  color: var(--color-accent-soft, #d9c58f);
  background:
    linear-gradient(
      145deg,
      rgba(var(--color-accent-rgb, 230, 186, 104), 0.13),
      transparent 55%
    ),
    var(--color-surface-raised, #102023);
  text-align: center;
  font-size: 0.66rem;
  font-weight: 700;
}

.my-atlas-favorite-image-preview img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.my-atlas-favorite-image-copy {
  display: grid;
  align-content: start;
  gap: 0.42rem;
  min-width: 0;
}

.my-atlas-favorite-image-copy > strong {
  color: var(--color-accent-soft, #f3d38f);
  font-size: 0.76rem;
}

.my-atlas-favorite-image-copy > p,
.my-atlas-favorite-image-copy > small {
  margin: 0;
  color: var(--color-text-muted, #a8bab4);
  font-size: 0.66rem;
  line-height: 1.5;
}

.my-atlas-favorite-image-copy > small {
  color: var(--color-text-subtle, #7f948d);
  font-size: 0.6rem;
}

.my-atlas-favorite-image-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.15rem;
}

.my-atlas-favorite-image-actions button {
  min-height: 2.45rem;
  padding: 0.5rem 0.7rem;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.42);
  border-radius: 0.65rem;
  color: var(--color-accent-soft, #f4d38f);
  background: rgba(var(--color-accent-rgb, 230, 186, 104), 0.07);
  font: inherit;
  font-size: 0.64rem;
  font-weight: 700;
  cursor: pointer;
}

.my-atlas-favorite-image-actions button:disabled {
  cursor: wait;
  opacity: 0.62;
}

.my-atlas-favorite-image-error {
  color: var(--color-error, #e6a8a1) !important;
}

.my-atlas-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  white-space: nowrap;
}

.my-atlas-tools-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr));
  gap: 0.5rem;
}

.my-atlas-tools-actions button {
  border-radius: 0.7rem;
  color: var(--color-accent-soft, #f4d38f);
  background: rgba(var(--color-accent-rgb, 230, 186, 104), 0.07);
}

.my-atlas-tools-actions button:focus-visible {
  border-color: var(--color-accent, #e6ba68);
  outline: 2px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.35);
  outline-offset: 0.12rem;
}

.my-atlas-share-link {
  display: grid;
  gap: 0.2rem;
  padding: 0.65rem 0.7rem;
  border: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.1);
  border-radius: 0.7rem;
  background: rgba(var(--color-highlight-rgb, 255, 255, 255), 0.035);
}

.my-atlas-account-data-actions {
  display: grid;
  gap: 0.65rem;
  padding-top: 0.8rem;
  border-top: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.12);
}

.my-atlas-account-data-actions button {
  min-height: 2.75rem;
  padding: 0.6rem 0.75rem;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.42);
  border-radius: 0.7rem;
  color: var(--color-accent-soft, #f4d38f);
  background: transparent;
  font: inherit;
  font-size: 0.66rem;
  font-weight: 700;
  cursor: pointer;
}

.my-atlas-delete-account {
  padding: 0.8rem;
  border: 1px solid rgba(var(--color-error-rgb, 213, 135, 126), 0.4);
  border-radius: 0.8rem;
  color: var(--color-error, #f3c1bb);
}

.my-atlas-delete-account summary {
  padding: 0.4rem 0;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
}

.my-atlas-delete-account p,
.my-atlas-delete-account label {
  margin: 0.7rem 0;
  color: var(--color-text-muted, #cbd8d4);
  font-size: 0.66rem;
  line-height: 1.6;
}

.my-atlas-delete-account label {
  display: grid;
  gap: 0.4rem;
}

.my-atlas-delete-account input {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  height: auto;
  margin: 0;
  padding: 0.7rem;
  border: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.2);
  border-radius: 0.6rem;
  color: var(--color-text, #edf7f2);
  background: var(--color-surface-raised, #111f22);
  font: inherit;
}

.my-atlas-delete-account button {
  color: var(--color-error, #f3c1bb);
  border-color: rgba(var(--color-error-rgb, 213, 135, 126), 0.45);
}

.my-atlas-account-data-actions button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.my-atlas-account-data-actions :focus-visible {
  outline: 2px solid var(--color-focus, #f4d38f);
  outline-offset: 3px;
}

.my-atlas-share-link span {
  color: var(--color-accent-soft, #e6ba68);
  font-size: 0.56rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.my-atlas-share-link strong {
  overflow-wrap: anywhere;
  color: var(--color-text, #edf7f2);
  font-size: 0.62rem;
}

.my-atlas-explore-link {
  justify-self: start;
  color: var(--color-accent-soft, #f4d38f);
  font-size: 0.66rem;
  font-weight: 700;
  text-underline-offset: 0.2rem;
}

.my-atlas-explore-link:focus-visible {
  border-radius: 0.25rem;
  outline: 2px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.35);
  outline-offset: 0.2rem;
}

.my-atlas-search > span {
  font-size: 0.78rem;
  font-weight: 700;
}

.my-atlas-search input {
  box-sizing: border-box;
  width: 100%;
  height: auto;
  margin: 0;
  padding: 0.85rem 1rem;
  border: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.18);
  border-radius: 0.9rem;
  color: var(--color-text, #fff);
  background: rgba(var(--color-highlight-rgb, 255, 255, 255), 0.07);
  font: inherit;
}

.my-atlas-search input:focus {
  border-color: var(--color-accent, #e6ba68);
  box-shadow: 0 0 0 2px rgba(230, 186, 104, 0.2);
  outline: none;
}

.my-atlas-custom-place {
  display: grid;
  gap: 0.75rem;
  margin-top: 0.7rem;
}

.my-atlas-custom-place.is-open {
  padding: 0.9rem;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.34);
  border-radius: 0.95rem;
  background:
    radial-gradient(
      circle at 100% 0%,
      rgba(var(--color-accent-rgb, 230, 186, 104), 0.12),
      transparent 45%
    ),
    rgba(var(--color-highlight-rgb, 255, 255, 255), 0.035);
}

.my-atlas-custom-place-trigger,
.my-atlas-custom-place-continue,
.my-atlas-custom-place-heading button {
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.45);
  border-radius: 0.72rem;
  color: var(--color-accent-soft, #f5d999);
  background: rgba(var(--color-accent-rgb, 230, 186, 104), 0.07);
  font: inherit;
  font-size: 0.68rem;
  font-weight: 700;
  cursor: pointer;
}

.my-atlas-custom-place-trigger {
  width: 100%;
  padding: 0.65rem 0.75rem;
  border-style: dashed;
  text-align: left;
}

.my-atlas-custom-place-heading {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 0.75rem;
}

.my-atlas-custom-place-heading > div {
  display: grid;
  gap: 0.15rem;
}

.my-atlas-custom-place-heading p,
.my-atlas-custom-place-heading span,
.my-atlas-custom-place-disclosure,
.my-atlas-custom-place-error {
  margin: 0;
}

.my-atlas-custom-place-heading p {
  color: var(--color-accent-soft, #e6ba68);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.65rem;
  font-weight: 800;
}

.my-atlas-custom-place-heading span,
.my-atlas-custom-place-disclosure {
  color: var(--color-text-muted, #94a7a0);
  font-size: 0.64rem;
  line-height: 1.45;
}

.my-atlas-custom-place-heading button {
  padding: 0.42rem 0.55rem;
  color: var(--color-accent-soft, #d9b96f);
  background: transparent;
}

.my-atlas-custom-place > label {
  display: grid;
  gap: 0.3rem;
  color: var(--color-text, #edf7f2);
  font-size: 0.7rem;
  font-weight: 700;
}

.my-atlas-custom-place > label input {
  box-sizing: border-box;
  width: 100%;
  padding: 0.72rem 0.8rem;
  border: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.18);
  border-radius: 0.72rem;
  color: var(--color-text, #fff);
  background: rgba(var(--color-page-rgb, 5, 14, 16), 0.68);
  font: inherit;
  font-weight: 400;
}

.my-atlas-custom-place > label input:focus {
  border-color: var(--color-accent, #e6ba68);
  outline: 2px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.18);
}

.my-atlas-custom-place > label small {
  justify-self: end;
  color: var(--color-text-subtle, #7f938c);
  font-size: 0.58rem;
  font-weight: 400;
}

.my-atlas-custom-place > label small.is-error {
  color: var(--color-error, #e6a8a1);
}

.my-atlas-custom-place-position {
  display: grid;
  gap: 0.15rem;
  padding: 0.65rem 0.7rem;
  border-left: 3px solid var(--color-accent, #e6ba68);
  border-radius: 0.25rem 0.65rem 0.65rem 0.25rem;
  background: rgba(var(--color-accent-rgb, 230, 186, 104), 0.07);
}

.my-atlas-custom-place-position strong {
  color: var(--color-accent-soft, #f3d28b);
  font-size: 0.66rem;
}

.my-atlas-custom-place-position span {
  color: var(--color-text-muted, #a7b9b3);
  font-size: 0.62rem;
  line-height: 1.45;
}

.my-atlas-custom-place-position button {
  justify-self: start;
  margin-top: 0.35rem;
  padding: 0.45rem 0.6rem;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.48);
  border-radius: 0.6rem;
  color: var(--color-accent-soft, #f3d28b);
  background: rgba(var(--color-accent-rgb, 230, 186, 104), 0.08);
  font: inherit;
  font-size: 0.62rem;
  font-weight: 700;
  cursor: pointer;
}

.my-atlas-custom-place-error {
  color: var(--color-error, #e6a8a1);
  font-size: 0.65rem;
}

.my-atlas-custom-place-continue {
  justify-self: start;
  padding: 0.62rem 0.78rem;
  color: var(--color-accent-contrast, #132023);
  background: var(--color-accent, #e6ba68);
}

.my-atlas-custom-place button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.my-atlas-search small,
.my-atlas-search-state {
  color: var(--color-text-muted, #8ea29c);
  font-size: 0.7rem;
}

.my-atlas-search-state {
  padding: 0.8rem 0;
}

.my-atlas-search-state.is-error {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.55rem;
  color: var(--color-error, #e6a8a1);
}

.my-atlas-search-state.is-error button {
  padding: 0.4rem 0.65rem;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.5);
  border-radius: 999px;
  color: var(--color-accent-soft, #f4cf83);
  background: transparent;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.my-atlas-results,
.my-atlas-pins ul {
  display: grid;
  gap: 0.45rem;
  margin: 0.7rem 0 0;
  padding: 0;
  list-style: none;
}

.my-atlas-pins ul {
  max-height: min(52rem, 65vh);
  padding-right: 0.2rem;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-color: rgba(var(--color-accent-rgb, 230, 186, 104), 0.4) transparent;
}

.my-atlas-results button,
.my-atlas-pins li {
  border: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.1);
  border-radius: 0.85rem;
  background: rgba(var(--color-highlight-rgb, 255, 255, 255), 0.05);
}

.my-atlas-results button {
  display: grid;
  grid-template-columns: 1fr auto;
  width: 100%;
  padding: 0.7rem 0.8rem;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.my-atlas-results button:hover,
.my-atlas-results button:focus-visible {
  border-color: var(--color-accent, #e6ba68);
}

.my-atlas-results button:disabled,
.my-atlas-pins button:disabled,
.my-atlas-sharing button:disabled {
  cursor: wait;
  opacity: 0.55;
}

.my-atlas-results span,
.my-atlas-pins li span {
  font-weight: 700;
}

.my-atlas-results small,
.my-atlas-pins li small {
  grid-column: 1;
  color: var(--color-text-muted, #9eb0aa);
  font-size: 0.7rem;
}

.my-atlas-pins em {
  grid-column: 1;
  margin-top: 0.15rem;
  color: var(--color-accent-soft, #d3b879);
  font-size: 0.62rem;
  font-style: normal;
}

.my-atlas-pins q {
  grid-column: 1;
  max-width: 36ch;
  margin-top: 0.2rem;
  overflow: hidden;
  color: var(--color-text-muted, #b9c9c4);
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.62rem;
  quotes: none;
}

.my-atlas-results b {
  grid-column: 2;
  grid-row: 1 / span 2;
  align-self: center;
  color: var(--color-accent-soft, #e6ba68);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.58rem;
}

.my-atlas-pins {
  margin-top: 0.8rem;
}

.my-atlas-empty {
  margin: 0.7rem 0 0;
  color: var(--color-text-muted, #8ea29c);
  font-size: 0.76rem;
}

.my-atlas-sharing {
  margin-top: 0.8rem;
}

.my-atlas-sharing p,
.my-atlas-sharing a {
  margin: 0;
  color: var(--color-text-muted, #9eb0aa);
  font-size: 0.7rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.my-atlas-sharing a {
  color: var(--color-accent-soft, #e6ba68);
}

.my-atlas-sharing-content {
  gap: 0.75rem;
}

.my-atlas-sharing-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.my-atlas-sharing-actions button {
  padding: 0.55rem 0.75rem;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.45);
  border-radius: 0.7rem;
  color: var(--color-accent-contrast, #132023);
  background: var(--color-accent, #e6ba68);
  font: inherit;
  font-size: 0.68rem;
  font-weight: 700;
  cursor: pointer;
}

.my-atlas-pins li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  padding: 0.35rem;
}

.my-atlas-pins li > .visited-place-main {
  display: grid;
  flex: 1;
  padding: 0.35rem 0.45rem;
  border: 0;
  color: inherit;
  text-align: left;
  background: transparent;
  cursor: pointer;
}

.my-atlas-tabs {
  display: grid;
  height: auto;
  line-height: 1.3;
  background: var(--color-surface, #112124);
  box-shadow: none;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.35rem;
  margin: 1rem 0;
  padding: 0.3rem;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.3);
  border-radius: 0.85rem;
}
.my-atlas-tabs button {
  min-height: 42px;
  padding: 0.5rem 0.3rem;
  border: 0;
  border-radius: 0.6rem;
  background: transparent;
  color: var(--color-text, #edf7f2);
  cursor: pointer;
  font: inherit;
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1.3;
}
.my-atlas-tabs button[aria-selected="true"] {
  color: var(--color-accent-contrast, #132023);
  background: var(--color-accent, #e6ba68);
}
.my-atlas-tabs button:focus-visible {
  outline: 2px solid var(--color-accent, #e6ba68);
  outline-offset: 2px;
}
.my-atlas-past-add {
  padding: 0.55rem 0.7rem;
  margin-bottom: 0.75rem;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.5);
  border-radius: 0.6rem;
  color: var(--color-accent-soft, #e6ba68);
  background: transparent;
  font: inherit;
  font-size: 0.75rem;
  cursor: pointer;
}
.visited-group-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 0.75rem;
}
.visited-group-controls p {
  flex-basis: 100%;
  margin: 0;
  font-size: 0.75rem;
}
.visited-group-controls button {
  padding: 0.55rem 0.7rem;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.5);
  border-radius: 0.6rem;
  background: transparent;
  color: var(--color-accent-soft, #e6ba68);
  font: inherit;
  font-size: 0.72rem;
  cursor: pointer;
}
.visited-group-controls button:disabled {
  opacity: 0.5;
  cursor: default;
}
.visited-group-choice {
  display: flex;
  flex-basis: 100%;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  cursor: pointer;
}
.visited-group-choice input {
  position: static;
  opacity: 1;
  pointer-events: auto;
  appearance: auto;
  width: 1rem;
  height: 1rem;
  margin: 0;
  accent-color: var(--color-accent, #e6ba68);
}
.my-atlas-pins .visited-group-choice b {
  font-size: 0.72rem;
  font-weight: 400;
}

.my-atlas-pin-actions {
  display: grid;
  flex: 0 0 auto;
  justify-items: end;
  gap: 0.05rem;
}

.my-atlas-pins .remove {
  padding: 0.45rem;
  border: 0;
  color: var(--color-error, #d5a19b);
  background: transparent;
  font-size: 0.65rem;
  cursor: pointer;
}

.my-atlas-pins .edit {
  padding: 0.45rem;
  border: 0;
  color: var(--color-accent-soft, #e6ba68);
  background: transparent;
  font-size: 0.65rem;
  cursor: pointer;
}

.my-atlas-pins .visit-edit {
  padding: 0.45rem;
  border: 0;
  color: var(--color-text-muted, #b8cbc5);
  background: transparent;
  font-size: 0.65rem;
  cursor: pointer;
}
.my-atlas-pins .experience-edit {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.4rem;
  min-height: 32px;
  padding: 0.4rem 0.45rem;
  border: 0;
  border-radius: 0.5rem;
  background: transparent;
  color: var(--color-accent-soft, #e6ba68);
  font: inherit;
  font-size: 0.65rem;
  cursor: pointer;
}
.my-atlas-pins .experience-edit b {
  display: inline-grid;
  place-items: center;
  min-width: 1.1rem;
  height: 1.1rem;
  padding: 0 0.2rem;
  border-radius: 999px;
  background: rgba(var(--color-accent-rgb, 230, 186, 104), 0.12);
  font-size: 0.6rem;
}
.my-atlas-pins .experience-edit:hover,
.my-atlas-pins .experience-edit:focus-visible {
  background: rgba(var(--color-accent-rgb, 230, 186, 104), 0.1);
}

.my-atlas-beta-note,
.my-atlas-attribution {
  margin: 1rem 0 0;
  color: var(--color-text-subtle, #80938d);
  font-size: 0.65rem;
  line-height: 1.5;
}

.my-atlas-attribution a {
  color: var(--color-accent-soft, #cdb171);
}

.my-atlas-brand {
  margin: 1rem 0 0;
  color: var(--color-accent-soft, #e6ba68);
  font-size: 0.68rem;
  font-weight: 700;
}

.my-atlas-announcement {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

@media (max-width: 720px) {
  .my-atlas-proof {
    display: grid;
    grid-template-rows: minmax(20rem, 54dvh) auto;
    width: 100%;
    min-width: 0;
    overflow-x: hidden;
    overflow-y: visible;
  }

  .my-atlas-proof > :first-child {
    position: relative;
  }

  .my-atlas-panel {
    min-width: 0;
    width: 100%;
    max-width: 100%;
    max-height: none;
    margin: -1.4rem 0 0;
    border-right: 0;
    border-bottom: 0;
    border-left: 0;
    border-radius: 1.5rem 1.5rem 0 0;
    background: var(--color-page, #0a1416);
  }

  .my-atlas-intro {
    margin: 1.2rem 0 1rem;
  }

  .my-atlas-overview {
    gap: 0.65rem;
    padding: 0.75rem;
  }

  .my-atlas-mobile-controls-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0.7rem 0.75rem;
    border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.32);
    border-radius: 0.75rem;
    color: var(--color-text, #edf7f2);
    background: rgba(var(--color-accent-rgb, 230, 186, 104), 0.07);
    font: inherit;
    font-size: 0.68rem;
    font-weight: 700;
  }

  .my-atlas-mobile-controls-toggle strong {
    color: var(--color-accent-soft, #e6ba68);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.56rem;
  }

  .my-atlas-controls-drawer {
    display: none;
    padding: 0.1rem 0.1rem 0;
  }

  .my-atlas-controls-drawer.is-open {
    display: grid;
  }

  .my-atlas-view-controls {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .my-atlas-view-controls label {
    grid-column: 1 / -1;
    min-width: 0;
  }

  .my-atlas-view-controls select {
    width: 100%;
  }

  .my-atlas-view-controls button {
    width: 100%;
  }

  .my-atlas-selected {
    position: sticky;
    bottom: 0.5rem;
    z-index: 2;
    padding: 0.7rem;
    border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.24);
    border-radius: 0.9rem;
    background: rgba(var(--color-page-rgb, 8, 20, 22), 0.96);
    box-shadow: 0 0.8rem 2rem rgba(0, 0, 0, 0.35);
  }
}

@media (max-width: 480px) {
  .my-atlas-favorite-image {
    grid-template-columns: 1fr;
  }

  .my-atlas-favorite-image-preview {
    width: min(11rem, 100%);
  }

  .my-atlas-account.is-menu {
    justify-items: stretch;
    min-height: 0;
    width: calc(100% - 2.5rem);
    margin: 0;
  }

  .my-atlas-sign-in,
  .my-atlas-account-card {
    width: 100%;
    height: auto;
    min-height: 2.75rem;
    border-radius: 0.85rem;
    transform: none;
  }

  .my-atlas-account-card {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .my-atlas-account-retry {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .my-atlas-tools-actions {
    grid-template-columns: 1fr;
  }

  .my-atlas-overview-actions.has-planner-action {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .my-atlas-planner-action {
    grid-column: 1 / -1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .my-atlas-panel {
    transition: none;
  }
}
</style>
<style src="../styles/interactions.css"></style>
