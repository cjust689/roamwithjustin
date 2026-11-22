<template>
  <section
    v-if="open"
    id="my-atlas-trips-content"
    class="atlas-trips"
    aria-label="Your trips"
    :aria-busy="String(pending)"
  >
    <button
      v-if="selected"
      type="button"
      class="trip-back"
      :disabled="pending"
      @click="showCollection"
    >
      ‹ {{ scope === "planned" ? "Planning" : "Past trips" }}
    </button>
    <header v-else class="trip-workspace-heading">
      <h2>
        {{
          scope === "planned"
            ? "Planned trips"
            : scope === "past"
              ? "Past trips"
              : "Your trips"
        }}
      </h2>
    </header>
    <button
      v-if="loaded && upgraded && !selected"
      class="trip-new-primary"
      type="button"
      :disabled="busy"
      @click="startNew"
    >
      + New trip
    </button>
    <p v-if="error && !workspace" role="alert">{{ error }}</p>
    <button
      v-if="!loaded || refreshNeeded"
      type="button"
      :disabled="pending"
      @click="load"
    >
      Refresh trips
    </button>
    <p v-if="loaded && !writesEnabled" role="status">
      Trip saving is unavailable on this server. Your destinations are
      unchanged.
    </p>
    <button
      v-if="loaded && !upgraded"
      type="button"
      :disabled="pending"
      @click="
        openWorkspace('upgrade')
        previewUpgrade()
      "
    >
      Review destinations and plans
    </button>
    <template v-if="loaded && upgraded">
      <div
        v-if="
          !selected &&
          (scope === 'all' ||
            (scope !== 'planned' &&
              (ungroupedVisits.length || count('past') > 1)))
        "
        class="trip-controls"
      >
        <label v-if="scope === 'all'"
          >Show<select v-model="filter">
            <option value="all">All trips ({{ trips.length }})</option>
            <option value="planned">Planned ({{ count("planned") }})</option>
            <option value="past">Past ({{ count("past") }})</option>
          </select></label
        >
        <button
          v-if="scope !== 'planned' && ungroupedVisits.length"
          type="button"
          :disabled="busy"
          @click="openWorkspace('ungrouped')"
        >
          Ungrouped visits ({{ ungroupedVisits.length }})
        </button>
        <button
          v-if="scope !== 'planned' && count('past') > 1"
          type="button"
          :disabled="busy"
          @click="openWorkspace('combine')"
        >
          Combine trips
        </button>
      </div>
      <p v-if="!selected && !filteredTrips.length">
        No {{ scope === "planned" ? "planned" : "past" }} trips yet.
      </p>
      <ul v-if="!selected" class="trip-list">
        <li v-for="trip in filteredTrips" :key="trip.tripId">
          <button
            type="button"
            :aria-pressed="String(selectedId === trip.tripId)"
            @click="select(trip)"
          >
            <span class="trip-status-badge">{{
              trip.lifecycle === "past" ? "Past journey" : "Planned"
            }}</span>
            <strong>{{ trip.title }}</strong>
            <small
              >{{
                trip.stops
                  .slice(0, 3)
                  .map(stop => stop.place.name)
                  .join(" → ")
              }}<span v-if="trip.stops.length"> · </span
              >{{ trip.stops.length }}
              {{
                trip.stops.length === 1 ? "destination" : "destinations"
              }}</small
            >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m9 5 7 7-7 7" />
            </svg>
          </button>
        </li>
      </ul>
      <aside v-if="!selected && scope === 'planned'" class="trip-guidance">
        <strong>No itinerary needed to get started.</strong>
        <p>Add dates, stops and travel tools as you go.</p>
      </aside>
      <article v-if="selected" class="trip-form trip-summary">
        <p class="trip-journey-label">
          {{
            selected.lifecycle === "past" ? "Past journey" : "Planned journey"
          }}
        </p>
        <h3>
          <button
            class="trip-editable-title"
            type="button"
            :disabled="busy"
            :aria-label="`Edit ${selected.title}`"
            @click="openWorkspace('metadata')"
          >
            <span>{{ selected.title }}</span
            ><svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15z" />
            </svg>
          </button>
        </h3>
        <p class="trip-journey-meta">
          {{ selected.stops.length }}
          {{ selected.stops.length === 1 ? "destination" : "destinations"
          }}<span> · {{ selectedDate || "Dates not set" }}</span>
        </p>
        <div
          class="trip-journey-badges"
          aria-label="Journey status and visibility"
        >
          <span
            class="trip-status-badge"
            :class="{ 'is-past': selected.lifecycle === 'past' }"
            >{{ selected.lifecycle === "past" ? "Traveled" : "Planned" }}</span
          >
          <button
            type="button"
            class="trip-visibility-badge"
            @click="
              openWorkspace('metadata')
              workspaceTab = 'settings'
            "
          >
            {{
              selected.sharing.publicAtlas
                ? profilePublic
                  ? "Visible on profile"
                  : "Profile hidden"
                : "Private"
            }}
          </button>
          <MyAtlasInfo label="About journey visibility"
            >{{
              selected.sharing.publicAtlas
                ? profilePublic
                  ? "This journey appears on your shared profile."
                  : "This journey is included on your profile, but your profile is currently private."
                : "This journey is not included on your profile."
            }}
            Change visibility in Edit journey. Direct read only links are shared
            separately.</MyAtlasInfo
          >
        </div>
        <p v-if="selected.description" class="trip-journey-description">
          {{ selected.description }}
        </p>
        <p v-if="!selected.stops.length">
          This trip has no visits. Its saved details are kept.
        </p>
        <div class="trip-itinerary-heading">
          <div class="trip-itinerary-title">
            <h4>Destinations</h4>
            <MyAtlasInfo label="How to reorder destinations"
              >Drag a destination's dotted handle to change the order. You can
              also focus a handle and use the up and down arrow keys. Changes
              save when you release it.</MyAtlasInfo
            >
          </div>
          <button type="button" :disabled="busy" @click="openWorkspace('add')">
            Add stop
          </button>
        </div>
        <MyAtlasTripDestinations
          :stops="selected.stops"
          :lifecycle="selected.lifecycle"
          reorderable
          :pending="pending"
          :reorder-disabled="busy"
          :show-reorder-help="false"
          @open="editStop"
          @reorder="reorderStops"
        />
        <button
          class="trip-view-map"
          type="button"
          :disabled="!selected.stops.length"
          @click="$emit('view-on-map', selected.tripId)"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zM9 3v16M15 5v16" />
          </svg>
          View journey on map
        </button>
        <button
          class="trip-travel-action"
          type="button"
          :disabled="busy || !selected.stops.length"
          @click="openWorkspace('travel')"
        >
          Travel tools
        </button>
        <button
          class="trip-manage-action"
          type="button"
          :disabled="busy"
          @click="openWorkspace('metadata')"
        >
          Manage journey <span>Rename · Destinations · Status · Sharing</span>
        </button>
        <aside v-if="selected.lifecycle === 'planned'" class="trip-guidance">
          <strong>Keep planning simple.</strong>
          <p>
            Add a destination without setting a home address or return journey.
          </p>
        </aside>
      </article>
      <button
        v-if="rollbackAvailable"
        type="button"
        :disabled="busy"
        @click="rollback"
      >
        Undo trip upgrade
      </button>
    </template>
    <button
      v-if="placementWorkspace"
      type="button"
      @click="resumePlacementEditor"
    >
      Return to destination editor
    </button>
    <MyAtlasDialog
      v-if="workspace"
      :class="{
        'trip-visit-dialog': workspace === 'visit' || workspace === 'remove',
      }"
      :title="dialogTitle"
      :status-visible="Boolean(error || workspaceStatus || refreshNeeded)"
      :pending="pending"
      @close="closeWorkspace"
    >
      <template #tabs>
        <div v-if="workspace === 'visit'" class="trip-visit-toolbar">
          <label :for="'trip-visit-section-' + _uid">Edit</label>
          <select
            :id="'trip-visit-section-' + _uid"
            v-model="workspaceTab"
            :disabled="pending"
            aria-label="Destination section"
          >
            <option
              v-for="section in visitSections"
              :key="section.key"
              :value="section.key"
            >
              {{ section.label }}
            </option>
          </select>
          <MyAtlasInfo label="About destination details"
            >Memories record what happened. Planning notes keep ideas separate.
            Dates are optional, and experiences stay private. Reorder or remove
            a destination under More actions.</MyAtlasInfo
          >
        </div>
        <nav
          v-if="dialogTabs.length"
          class="trip-dialog-tabs"
          role="tablist"
          :aria-label="dialogTitle"
        >
          <button
            v-for="tab in dialogTabs"
            :id="'trip-dialog-tab-' + tab.key"
            :key="tab.key"
            type="button"
            role="tab"
            :aria-selected="String(workspaceTab === tab.key)"
            :aria-controls="'trip-dialog-panel'"
            :tabindex="workspaceTab === tab.key ? 0 : -1"
            @click="workspaceTab = tab.key"
            @keydown="handleDialogTabKey($event, tab.key)"
          >
            {{ tab.label }}
          </button>
        </nav>
      </template>
      <template v-if="error || workspaceStatus || refreshNeeded" #status
        ><p v-if="error" role="alert">{{ error }}</p>
        <p
          v-else-if="workspaceStatus"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {{ workspaceStatus }}
        </p>
        <button
          v-if="refreshNeeded"
          type="button"
          :disabled="pending"
          @click="load"
        >
          Refresh trips
        </button>
      </template>
      <div
        id="trip-dialog-panel"
        :role="dialogTabs.length ? 'tabpanel' : undefined"
        :aria-labelledby="
          dialogTabs.length ? 'trip-dialog-tab-' + workspaceTab : undefined
        "
      >
        <section
          v-if="workspace === 'group'"
          class="trip-form"
          aria-label="Organize selected destinations"
        >
          <h3>Organize destinations</h3>
          <p>
            These are visited destinations, not separate trips. Choose a name to
            create a trip, or add them to an existing trip.
          </p>
          <ol>
            <li v-for="place in groupDestinations" :key="place.pinId">
              {{ place.name }}
            </li>
          </ol>
          <label v-if="upgraded && groupTargets.length"
            >Add to
            <select v-model="groupTargetId">
              <option value="">A new trip</option>
              <option
                v-for="trip in groupTargets"
                :key="trip.tripId"
                :value="trip.tripId"
              >
                {{ trip.title }}
              </option>
            </select>
          </label>
          <label v-if="!groupTargetId"
            >Trip name<input
              v-model="groupTitle"
              maxlength="80"
              autocomplete="off"
          /></label>
          <p>
            Destinations are added in the order shown. Their memories and visit
            dates stay attached. Other destinations remain ungrouped.
          </p>
          <p>
            Grouping keeps the destinations' current Visited Atlas sharing
            choice.
          </p>
          <template v-if="!upgraded && preview">
            <p>
              {{ preview.counts.ungroupedDestinations }} ungrouped destinations
              and {{ preview.counts.sourcePlans }} existing planned trips.
              Existing plans and your Atlas image are preserved.
            </p>
            <MyAtlasSwitch v-model="retentionAcknowledged" :disabled="busy"
              >I understand that organized trips remain until I delete
              them.</MyAtlasSwitch
            >
          </template>
          <button
            v-if="writesEnabled"
            type="button"
            :disabled="!canSaveDestinationGroup"
            :aria-busy="String(groupSavePending)"
            @click="saveDestinationGroup"
          >
            {{ groupTargetId ? "Add destinations to trip" : "Create trip" }}
          </button>
        </section>
        <template v-if="workspace === 'upgrade'">
          <p>
            Your visited destinations stay ungrouped until you choose to add
            them to a named trip. A trip can have one or more stops.
          </p>
          <button type="button" :disabled="pending" @click="previewUpgrade">
            Review destinations and plans
          </button>
          <div v-if="preview">
            <p>
              {{ preview.counts.ungroupedDestinations }} ungrouped destinations
              and {{ preview.counts.sourcePlans }} existing planned trips.
            </p>
            <ul>
              <li
                v-for="destination in preview.destinations"
                :key="destination.pinId"
              >
                {{ destination.name }}
              </li>
            </ul>
            <ul>
              <li v-for="group in preview.groups" :key="group.tripId">
                {{ group.title }} · {{ group.stops.length }}
                {{ group.stops.length === 1 ? "stop" : "stops" }}
              </li>
            </ul>
            <p v-if="!preview.ready">
              Some destinations need review before organizing.
            </p>
            <template v-if="writesEnabled">
              <MyAtlasSwitch v-model="retentionAcknowledged" :disabled="busy"
                >I understand that organized trips remain until I delete
                them.</MyAtlasSwitch
              >
              <button
                type="button"
                :disabled="pending || !preview.ready || !retentionAcknowledged"
                @click="enableTripOrganizing"
              >
                Enable trip organizing
              </button>
            </template>
          </div>
        </template>
        <div
          v-if="workspace === 'create'"
          v-show="workspaceTab === 'details'"
          class="trip-form"
        >
          <p>Give it a name. The rest can come later.</p>
          <label
            >Trip name<input
              v-model="draftTitle"
              maxlength="80"
              placeholder="e.g. Costa Rica Adventure"
          /></label>
          <div class="trip-create-status">
            <span>Status</span
            ><strong class="trip-status-badge">{{
              draftLifecycle === "past" ? "Past" : "Planned"
            }}</strong
            ><small
              >Created from
              {{ draftLifecycle === "past" ? "Past" : "Planning" }}. Change
              status later.</small
            >
          </div>
          <div class="trip-create-destination">
            <strong>First destination</strong>
            <p>
              {{
                capabilities.emptyTripDrafts
                  ? "Optional. You can add stops later."
                  : "Add a first destination to create this trip."
              }}
            </p>
            <button type="button" @click="workspaceTab = 'destinations'">
              + Add destination
            </button>
          </div>
          <ol>
            <li v-for="(stop, index) in draftStops" :key="index">
              {{ stop.name }}
              <button type="button" @click="draftStops.splice(index, 1)">
                Remove
              </button>
            </li>
          </ol>
          <button
            type="button"
            :disabled="!canCreateTrip"
            :aria-busy="String(pendingAction === 'create')"
            @click="
              mutate('create', {
                title: draftTitle,
                lifecycle: draftLifecycle,
                stops: draftStops.map(stop => stop.selection),
              })
            "
          >
            Create trip
          </button>
        </div>
        <div
          v-if="workspace === 'create' || workspace === 'add'"
          v-show="workspace !== 'create' || workspaceTab === 'destinations'"
          class="trip-form"
        >
          <div class="trip-itinerary-heading">
            <strong>Choose a destination</strong
            ><MyAtlasInfo label="How destination entry works"
              >Click a search result to add it directly to your trip draft and
              fill the preview below. You do not need to complete the manual
              fields. Manual entry is an alternative for places you cannot find;
              enter a name and paste a map link, Plus Code or coordinate pair,
              then choose Add custom stop.</MyAtlasInfo
            >
          </div>
          <div v-show="destinationEntryMode === 'search'" class="trip-form">
            <label
              >Find a destination<input
                ref="search"
                v-model="query"
                autocomplete="off"
                @input="queueSearch"
            /></label>
            <p v-if="searchPending" role="status">Searching places</p>
            <p v-if="searchError" role="alert">{{ searchError }}</p>
            <ul
              v-if="searchResults.length"
              class="trip-search-results"
              aria-label="Destination search results"
              tabindex="0"
            >
              <li v-for="place in searchResults" :key="place.placeId">
                <button
                  class="trip-search-result"
                  type="button"
                  :disabled="busy || (creating && draftStops.length >= 50)"
                  :data-added="draftPlaceCount(place.placeId) > 0"
                  @click="selectSearchResult(place)"
                >
                  <span class="trip-result-heading"
                    ><strong>{{ place.name }}</strong
                    ><span class="trip-result-action">{{
                      draftPlaceCount(place.placeId)
                        ? `${draftPlaceCount(place.placeId)} added · Add another visit`
                        : "Add to trip"
                    }}</span></span
                  >
                  <span class="trip-result-location">{{
                    resultLocation(place)
                  }}</span>
                  <small>{{ resultDescription(place) }}</small>
                </button>
              </li>
            </ul>
          </div>
          <section
            v-if="creating && draftStops.length"
            class="trip-draft-selection"
            aria-label="Destinations in this trip draft"
          >
            <div class="trip-itinerary-heading">
              <strong>In this trip ({{ draftStops.length }})</strong
              ><button type="button" @click="workspaceTab = 'details'">
                Review trip details
              </button>
            </div>
            <ol>
              <li v-for="(stop, index) in draftStops" :key="index">
                <span
                  ><strong>{{ stop.name }}</strong
                  ><small v-if="stop.context">{{ stop.context }}</small></span
                ><button
                  type="button"
                  :aria-label="`Remove ${stop.name} from this draft`"
                  @click="draftStops.splice(index, 1)"
                >
                  Remove
                </button>
              </li>
            </ol>
          </section>
          <section
            v-if="
              destinationEntryMode === 'search' &&
              selectedSearchPlace &&
              (!creating || draftPlaceCount(selectedSearchPlace.placeId) > 0)
            "
            class="trip-search-preview"
            aria-label="Selected destination preview"
          >
            <strong>{{
              creating ? "Added from search" : "Selected from search"
            }}</strong>
            <label
              >Place name<input :value="selectedSearchPlace.name" readonly
            /></label>
            <small>{{ resultLocation(selectedSearchPlace) }}</small>
            <small v-if="selectedSearchPlace.coordinates"
              >{{ selectedSearchPlace.coordinates[1].toFixed(6) }},
              {{ selectedSearchPlace.coordinates[0].toFixed(6) }}</small
            >
          </section>
          <button
            type="button"
            :disabled="busy"
            @click="
              destinationEntryMode =
                destinationEntryMode === 'search' ? 'manual' : 'search'
            "
          >
            {{
              destinationEntryMode === "search"
                ? draftStops.length
                  ? "Add another place manually"
                  : "Enter a place manually instead"
                : "Back to search"
            }}
          </button>
          <section
            v-show="destinationEntryMode === 'manual'"
            class="trip-form"
            aria-label="Optional manual destination entry"
          >
            <strong>Manual entry (optional)</strong>
            <MyAtlasLocationPicker
              :name="customName"
              :latitude="latitude"
              :longitude="longitude"
              :pending="busy"
              :resolve-link="resolveLink"
              :allow-search="false"
              @update:name="customName = $event"
              @update:latitude="latitude = $event"
              @update:longitude="longitude = $event"
              @coordinates-change="syncPlacement"
              @choose-map="beginPlacement"
              @search="$refs.search.focus()"
            />
            <button
              type="button"
              :disabled="busy || !customPlace"
              @click="choose({ customPlace }, customPlace.name)"
            >
              Add custom stop
            </button>
            <button v-if="placementActive" type="button" @click="stopPlacement">
              Stop placing pin
            </button>
          </section>
        </div>

        <section
          v-if="workspace === 'metadata' && selected"
          v-show="workspaceTab === 'details'"
          class="trip-form"
        >
          <label>Trip name<input v-model="titleDraft" maxlength="80" /></label>
          <label
            >Overview<textarea v-model="descriptionDraft" maxlength="500" />
          </label>
          <button
            type="button"
            :disabled="busy || !titleDraft.trim()"
            :aria-busy="String(pendingAction === 'metadata')"
            @click="
              mutate(
                'metadata',
                { title: titleDraft, description: descriptionDraft },
                selected.tripId
              )
            "
          >
            Save trip details
          </button>
          <div class="trip-controls">
            <button
              type="button"
              :disabled="busy"
              @click="openWorkspace('visits')"
            >
              Manage destinations
            </button>
            <button
              type="button"
              :disabled="busy"
              @click="openWorkspace('travel')"
            >
              Travel tools
            </button>
            <button
              type="button"
              :disabled="!selected.stops.length"
              @click="openWorkspace('share')"
            >
              Share journey
            </button>
          </div>
        </section>
        <section
          v-if="workspace === 'metadata' && selected"
          v-show="workspaceTab === 'settings'"
          class="trip-form"
        >
          <div class="trip-setting">
            <strong>{{
              selected.lifecycle === "past" ? "Past journey" : "Planned journey"
            }}</strong>
            <MyAtlasInfo label="About trip status"
              >Moving this journey changes which tab it appears in. All
              destinations, memories and experiences stay attached.</MyAtlasInfo
            >
          </div>
          <button
            type="button"
            :disabled="busy"
            :aria-busy="String(pendingAction === 'lifecycle')"
            @click="
              mutate(
                'lifecycle',
                {
                  lifecycle: selected.lifecycle === 'past' ? 'planned' : 'past',
                },
                selected.tripId
              )
            "
          >
            {{
              selected.lifecycle === "past"
                ? "Move to Planned"
                : "Mark as Traveled"
            }}
          </button>
          <div class="trip-setting">
            <MyAtlasSwitch
              :value="selected.sharing.publicAtlas"
              :disabled="busy"
              :pending="pendingAction === 'sharing'"
              @input="
                mutate('sharing', { publicAtlas: $event }, selected.tripId)
              "
              >Include on my profile</MyAtlasSwitch
            >
            <MyAtlasInfo label="About including trips on your profile"
              >Include this journey's name, status and destinations when your
              profile is listed in Explore Atlases. Your profile must also be
              listed for others to see it. Private notes, experiences, flights
              and rentals stay private. Direct trip links work
              separately.</MyAtlasInfo
            >
          </div>
          <button
            class="trip-danger-link"
            type="button"
            :disabled="busy"
            @click="deleteTrip"
          >
            Delete trip
          </button>
        </section>
        <section v-if="workspace === 'share' && selected" class="trip-form">
          <h3>{{ selected.title }}</h3>
          <p>
            Anyone with this read only link can see the journey's name, status
            and ordered destinations. It works while your profile is private.
          </p>
          <p>
            Memories, experiences and travel details stay private. This does not
            list your profile in Explore Atlases.
          </p>
          <button type="button" @click="shareTrip">
            Copy read only journey link
          </button>
          <MyAtlasInfo label="About saved journey links"
            >The link contains a snapshot. Future edits and visibility changes
            do not change or revoke links you have already shared.</MyAtlasInfo
          >
        </section>
        <section v-if="workspace === 'delete' && selected" class="trip-form">
          <p>
            Delete {{ selected.title }} and its stops and memories? This cannot
            be undone.
          </p>
          <div class="trip-controls">
            <button
              type="button"
              :disabled="busy"
              @click="openWorkspace('metadata')"
            >
              Keep trip</button
            ><button
              type="button"
              :disabled="busy"
              :aria-busy="String(pendingAction === 'delete')"
              @click="
                mutate(
                  'delete',
                  { confirmation: 'DELETE TRIP' },
                  selected.tripId
                )
              "
            >
              Delete trip permanently
            </button>
          </div>
        </section>
        <section
          v-if="workspace === 'visits' && selected"
          v-show="workspaceTab === 'order'"
          class="trip-form"
        >
          <div class="trip-itinerary-heading">
            <h3>Destinations</h3>
            <button
              type="button"
              :disabled="busy"
              @click="openWorkspace('add')"
            >
              Add stop
            </button>
          </div>
          <MyAtlasTripDestinations
            :stops="selected.stops"
            :lifecycle="selected.lifecycle"
            :pending="busy"
            reorderable
            @open="openStopActions"
            @reorder="reorderStops"
          />
        </section>
        <MyAtlasVisitManager
          v-if="
            (workspace === 'visits' && selected) || workspace === 'ungrouped'
          "
          v-show="workspace !== 'visits' || workspaceTab === 'move'"
          :key="workspace === 'visits' ? selected.tripId : 'ungrouped'"
          :source-trip="workspace === 'visits' ? selected : null"
          :visits="ungroupedVisits"
          :trips="trips"
          :pending="busy"
          :saved-sequence="savedSequence"
          @transfer="mutate('transfer', $event)"
          @edit-visit="
            mutate('editVisit', $event.patch, undefined, $event.stopId)
          "
        />
        <section
          v-if="
            workspace === 'visits' && selected && selected.lifecycle === 'past'
          "
          v-show="workspaceTab === 'existing'"
          class="trip-form"
        >
          <h3>Add existing destinations</h3>
          <MyAtlasVisitManager
            v-if="ungroupedVisits.length"
            :key="'existing-' + selected.tripId"
            :visits="ungroupedVisits"
            :trips="[selected]"
            :initial-target-id="selected.tripId"
            :pending="busy"
            :saved-sequence="savedSequence"
            @transfer="mutate('transfer', $event)"
            @edit-visit="
              mutate('editVisit', $event.patch, undefined, $event.stopId)
            "
          />
          <template v-if="destinations.length">
            <p v-if="!canAddExistingDestinations">
              Your standalone destinations follow your Atlas visibility. Match
              this journey's profile inclusion in Settings before adding them.
            </p>
            <template v-else>
              <MyAtlasSwitch
                v-for="place in existingDestinations"
                :key="place.pinId"
                :value="existingPinIds.includes(place.pinId)"
                :disabled="busy || !place.name"
                @input="toggleExistingDestination(place.pinId, $event)"
                >{{
                  place.name || "Location details unavailable"
                }}</MyAtlasSwitch
              >
              <button
                type="button"
                :disabled="busy || !existingPinIds.length"
                @click="
                  mutate('groupDestinations', {
                    pinIds: existingPinIds,
                    tripId: selected.tripId,
                  })
                "
              >
                Add selected destinations
              </button>
            </template>
          </template>
          <p v-if="!ungroupedVisits.length && !destinations.length">
            All your visited destinations are already grouped. Use the Move
            between journeys tab in another journey to bring them here.
          </p>
        </section>
        <section v-if="workspace === 'combine'" class="trip-form">
          <p>Choose trips in the order you want their visits combined.</p>
          <MyAtlasSwitch
            v-for="trip in trips.filter(item => item.lifecycle === 'past')"
            :key="trip.tripId"
            :value="combineIds.includes(trip.tripId)"
            :disabled="busy"
            @input="toggleCombinedTrip(trip.tripId, $event)"
            >{{ trip.title }}</MyAtlasSwitch
          >
          <label
            >Combined trip name<input v-model="combineTitle" maxlength="80"
          /></label>
          <button
            type="button"
            :disabled="busy || combineIds.length < 2 || !combineTitle.trim()"
            :aria-busy="String(pendingAction === 'combine')"
            @click="
              mutate('combine', { tripIds: combineIds, title: combineTitle })
            "
          >
            Combine into trip
          </button>
        </section>
        <section v-if="workspace === 'visit' && editingStop" class="trip-form">
          <p
            v-if="stopLocation(editingStop) || stopDate(editingStop)"
            class="trip-visit-context"
          >
            {{ stopLocation(editingStop)
            }}<span v-if="stopLocation(editingStop) && stopDate(editingStop)">
              · </span
            >{{ stopDate(editingStop) }}
          </p>
          <div v-show="workspaceTab === 'planning'" class="trip-form">
            <p>A stop in {{ selected.title }}</p>
            <label
              >Planning notes<textarea
                v-model="planNoteDraft"
                maxlength="2000"
                rows="4"
                placeholder="Things to see, places to stay, reminders…"
                :disabled="busy || !capabilities.planningNotes"
              />
            </label>
            <p v-if="!capabilities.planningNotes">
              Planning-note saving is not available yet. Your existing trip is
              unchanged.
            </p>
            <button
              type="button"
              class="trip-new-primary"
              :disabled="busy || !capabilities.planningNotes"
              :aria-busy="String(pendingAction === 'editStop')"
              @click="
                mutate(
                  'editStop',
                  { planNote: planNoteDraft },
                  selected.tripId,
                  editingStop.stopId
                )
              "
            >
              Save planning notes
            </button>
          </div>
          <div v-show="workspaceTab === 'memory'" class="trip-form">
            <label
              >Favorite memory<textarea
                v-model="memoryDraft"
                rows="3"
                maxlength="500"
                placeholder="What made this place memorable?"
              />
            </label>
          </div>
          <div v-show="workspaceTab === 'dates'" class="trip-date-fields">
            <label
              >Planned arrival<input
                v-model="dates.plannedArrival"
                type="date" /></label
            ><label
              >Planned departure<input
                v-model="dates.plannedDeparture"
                type="date"
            /></label>
            <label
              >Actual arrival<input
                v-model="dates.actualArrival"
                type="date" /></label
            ><label
              >Actual departure<input
                v-model="dates.actualDeparture"
                type="date"
            /></label>
          </div>
          <button
            v-show="['memory', 'dates'].includes(workspaceTab)"
            type="button"
            :disabled="busy"
            :aria-busy="String(pendingAction === 'editStop')"
            @click="
              mutate(
                'editStop',
                {
                  memory: memoryDraft,
                  plannedDates: {
                    arrival: dates.plannedArrival || null,
                    departure: dates.plannedDeparture || null,
                  },
                  actualDates: {
                    arrival: dates.actualArrival || null,
                    departure: dates.actualDeparture || null,
                  },
                },
                selected.tripId,
                editingStop.stopId
              )
            "
          >
            Save changes
          </button>
          <MyAtlasExperiences
            v-show="workspaceTab === 'experiences'"
            :experiences="editingStop.experiences"
            :pending="busy"
            :saved-sequence="savedSequence"
            @change="
              mutate(
                'editStop',
                { experienceChange: $event },
                selected.tripId,
                editingStop.stopId
              )
            "
          />
          <div v-show="workspaceTab === 'actions'" class="trip-form">
            <h3>{{ editingStop.place.name }}</h3>
            <div class="trip-controls">
              <button
                type="button"
                :disabled="busy || editingStopIndex === 0"
                @click="moveStop(editingStopIndex, -1)"
              >
                Move earlier
              </button>
              <button
                type="button"
                :disabled="
                  busy || editingStopIndex === selected.stops.length - 1
                "
                @click="moveStop(editingStopIndex, 1)"
              >
                Move later
              </button>
            </div>
            <button
              type="button"
              :disabled="busy"
              @click="
                openWorkspace('visits')
                workspaceTab = 'move'
              "
            >
              {{
                selected.lifecycle === "past"
                  ? "Move to another journey or ungroup"
                  : "Move to another planned journey"
              }}
            </button>
            <button
              class="trip-danger-link"
              type="button"
              :disabled="busy || selected.stops.length === 1"
              @click="confirmRemoveStop"
            >
              Remove destination permanently
            </button>
          </div>
        </section>
        <section v-if="workspace === 'remove' && editingStop" class="trip-form">
          <p>
            Remove {{ editingStop.place.name }} and its saved memories and
            experiences? This cannot be undone. To keep the visit, move it to
            another journey or ungroup it instead.
          </p>
          <div class="trip-controls">
            <button
              type="button"
              :disabled="busy"
              @click="openStopActions(editingStop)"
            >
              Keep destination</button
            ><button
              type="button"
              :disabled="busy"
              @click="removeStop(editingStop)"
            >
              Remove permanently
            </button>
          </div>
        </section>
        <section v-if="workspace === 'travel'" class="trip-form">
          <p>Private travel details.</p>
          <MyAtlasTravelSearch
            v-show="workspaceTab !== 'directions'"
            v-model="selectedTravelDraft"
            :tool="workspaceTab === 'rental' ? 'rental' : 'flights'"
            :context-changed="travelContextChanged"
            :persistable="true"
            :dirty="travelDetailsDirty"
          />
          <button
            v-show="workspaceTab !== 'directions'"
            type="button"
            :disabled="busy || !travelDetailsDirty"
            :aria-busy="String(pendingAction === 'logistics')"
            @click="saveTravelDetails"
          >
            Save travel details
          </button>
          <div v-show="workspaceTab === 'directions'" class="trip-form">
            <label
              >Directions mode<select v-model="directionsMode">
                <option value="driving">Driving</option>
                <option value="walking">Walking</option>
                <option value="bicycling">Cycling</option>
                <option value="transit">Transit</option>
              </select></label
            ><MyAtlasSwitch v-model="routeReviewed"
              >I reviewed road access for custom coordinates.</MyAtlasSwitch
            ><button type="button" @click="prepareDirections">
              Prepare directions</button
            ><a
              v-for="(action, index) in directions"
              v-show="action.url"
              :key="index"
              :href="action.url"
              target="_blank"
              rel="noopener noreferrer"
              referrerpolicy="no-referrer"
              >{{ action.label || `Open route ${index + 1}` }}</a
            ><button type="button" @click="copyPrompt">
              Copy planning prompt
            </button>
          </div>
        </section>
      </div>
    </MyAtlasDialog>
  </section>
</template>

<script>
import MyAtlasDialog from "./MyAtlasDialog.vue"
import MyAtlasInfo from "./MyAtlasInfo.vue"
import MyAtlasSwitch from "./MyAtlasSwitch.vue"
import MyAtlasExperiences from "./MyAtlasExperiences.vue"
import { formatPlaceTypeLabel } from "../catalog/placeTypes.mjs"
import MyAtlasLocationPicker from "./MyAtlasLocationPicker.vue"
import MyAtlasTravelSearch from "./MyAtlasTravelSearch.vue"
import MyAtlasVisitManager from "./MyAtlasVisitManager.vue"
import MyAtlasTripDestinations from "./MyAtlasTripDestinations.vue"
import { journeyCardDate } from "../planning/journeyCards.mjs"
import {
  normalizeTripTravelDraft,
  savedTripTravelDraft,
} from "../../../../shared/my-atlas-trip-logistics.mjs"
import { emptyTravelSearchDraft } from "../planning/travelSearch.mjs"
import {
  buildGoogleMapsRouteHandoffs,
  buildAiPlanningPrompt,
} from "../planning/handoffs.mjs"
import { getMyAtlasApiAccessToken } from "../auth/auth0"
import { requestMyAtlasTrips } from "../planning/tripClient.mjs"
import {
  normalizeMyAtlasCustomPlace,
  normalizeMyAtlasCustomCoordinates,
} from "../catalog/customPlace.mjs"
import { buildCanonicalTripMapRoute } from "../../../../shared/my-atlas-trips.mjs"
import { myAtlasStopMapPlace } from "../catalog/mapMemory.mjs"
import { searchMyAtlasPlaces } from "../catalog/placeSearchClient.mjs"
import { getMyAtlasPlaceSearchEndpoint } from "../config/placeSearch.mjs"
import { buildSharedTripUrl } from "../planning/sharedTrip.mjs"

export default {
  name: "MyAtlasTrips",
  components: {
    MyAtlasDialog,
    MyAtlasInfo,
    MyAtlasSwitch,
    MyAtlasExperiences,
    MyAtlasLocationPicker,
    MyAtlasTravelSearch,
    MyAtlasVisitManager,
    MyAtlasTripDestinations,
  },
  props: {
    apiBaseUrl: { type: String, required: true },
    revision: { type: Number, required: true },
    resolveLink: { type: Function, default: null },
    profilePublic: { type: Boolean, default: false },
    knownPlaces: { type: Array, default: () => [] },
    scope: { type: String, default: "all" },
  },
  emits: [
    "changed",
    "action-feedback",
    "route-change",
    "location-placement-change",
    "open-change",
    "collection-change",
    "view-on-map",
    "detail-change",
  ],
  data: () => ({
    open: false,
    workspace: "",
    workspaceStatus: "",
    workspaceTab: "",
    placementWorkspace: "",
    loaded: false,
    pending: false,
    pendingAction: "",
    refreshNeeded: false,
    error: "",
    trips: [],
    upgraded: false,
    writesEnabled: false,
    capabilities: { emptyTripDrafts: false, planningNotes: false },
    rollbackAvailable: false,
    preview: null,
    confirmation: "",
    retentionAcknowledged: false,
    filter: "all",
    selectedId: "",
    creating: false,
    adding: false,
    draftTitle: "",
    draftLifecycle: "planned",
    draftStops: [],
    combineIds: [],
    combineTitle: "",
    groupDestinations: [],
    groupTitle: "",
    groupTargetId: "",
    destinations: [],
    ungroupedVisits: [],
    publicAtlasDraft: false,
    existingPinIds: [],
    destinationGroupResolved: false,
    editingStopId: "",
    memoryDraft: "",
    planNoteDraft: "",
    titleDraft: "",
    descriptionDraft: "",
    travelTool: "",
    travelDrafts: {},
    travelContexts: {},
    directionsMode: "driving",
    routeReviewed: false,
    directions: [],
    dates: {
      plannedArrival: "",
      plannedDeparture: "",
      actualArrival: "",
      actualDeparture: "",
    },
    savedSequence: 0,
    attempt: null,
    currentRevision: 0,
    query: "",
    destinationEntryMode: "search",
    selectedSearchPlace: null,
    results: [],
    searchError: "",
    searchPending: false,
    searchTimer: null,
    searchSequence: 0,
    customName: "",
    latitude: "",
    longitude: "",
    placementActive: false,
  }),
  computed: {
    visitSections() {
      return [
        { key: "memory", label: "Memory" },
        { key: "planning", label: "Planning notes" },
        { key: "dates", label: "Dates" },
        { key: "experiences", label: "Experiences" },
        { key: "actions", label: "More actions" },
      ]
    },
    canCreateTrip() {
      return (
        !this.busy &&
        Boolean(this.draftTitle.trim()) &&
        (this.capabilities.emptyTripDrafts || this.draftStops.length > 0)
      )
    },
    selectedDate() {
      return this.selected
        ? journeyCardDate({ trip: this.selected, legacy: false })
        : ""
    },
    editingStopIndex() {
      return (
        this.selected?.stops.findIndex(
          stop => stop.stopId === this.editingStopId
        ) ?? -1
      )
    },
    canAddExistingDestinations() {
      return this.selected?.sharing.publicAtlas === this.profilePublic
    },
    existingDestinations() {
      const places = new Map(
        (this.knownPlaces || []).map(place => [place.placeId, place])
      )
      return this.destinations.map(pin => ({
        ...places.get(pin.placeId),
        ...pin,
      }))
    },
    searchResults() {
      return [
        ...new Map(this.results.map(place => [place.placeId, place])).values(),
      ]
    },
    editingStop() {
      return (
        this.selected?.stops.find(stop => stop.stopId === this.editingStopId) ||
        null
      )
    },
    dialogTitle() {
      return this.workspace === "visit"
        ? this.editingStop?.place.name || "Visit details"
        : {
            create: "New trip",
            add: "Add a stop",
            metadata: "Edit journey",
            delete: "Delete trip?",
            remove: "Remove destination?",
            share: "Share journey",
            visits: "Manage destinations",
            ungrouped: "Ungrouped visits",
            travel: "Travel tools",
            combine: "Combine trips",
            group: "Organize destinations",
            upgrade: "Review destinations and plans",
          }[this.workspace] || "Trip details"
    },
    dialogTabs() {
      if (this.workspace === "metadata")
        return [
          { key: "details", label: "Details" },
          { key: "settings", label: "Settings" },
        ]
      if (this.workspace === "visits")
        return [
          { key: "order", label: "Order" },
          { key: "move", label: "Move between journeys" },
          ...(this.selected?.lifecycle === "past"
            ? [{ key: "existing", label: "Add existing" }]
            : []),
        ]
      if (this.workspace === "create")
        return [
          {
            key: "details",
            label: this.draftStops.length
              ? `Trip details (${this.draftStops.length})`
              : "Trip details",
          },
          { key: "destinations", label: "Destinations" },
        ]
      if (this.workspace === "travel")
        return [
          { key: "flights", label: "Flights" },
          { key: "rental", label: "Rental cars" },
          ...(this.selected?.stops.length > 1
            ? [{ key: "directions", label: "Directions" }]
            : []),
        ]
      return []
    },
    groupSavePending() {
      return (
        this.pending &&
        ["upgrade", "groupDestinations"].includes(this.pendingAction)
      )
    },
    groupTargets() {
      return this.trips.filter(
        trip =>
          trip.lifecycle === "past" &&
          trip.workflow === "saved" &&
          trip.sharing.publicAtlas === this.profilePublic
      )
    },
    canSaveDestinationGroup() {
      return (
        !this.busy &&
        this.groupDestinations.length > 0 &&
        this.groupDestinations.every(place =>
          /^pin_[a-f0-9]{24}$/.test(place.pinId || "")
        ) &&
        Boolean(this.groupTargetId || this.groupTitle.trim()) &&
        (this.upgraded || (this.preview?.ready && this.retentionAcknowledged))
      )
    },
    selectedTravelDraft: {
      get() {
        return (
          this.travelDrafts[this.selectedId] ||
          savedTripTravelDraft(this.selected) ||
          emptyTravelSearchDraft()
        )
      },
      set(value) {
        this.$set(this.travelDrafts, this.selectedId, value)
        this.$set(
          this.travelContexts,
          this.selectedId,
          this.selected.stops.map(stop => stop.stopId).join(",")
        )
      },
    },
    travelDetailsDirty() {
      const saved = savedTripTravelDraft(this.selected)
      return (
        !saved ||
        JSON.stringify(this.selectedTravelDraft) !== JSON.stringify(saved)
      )
    },
    travelContextChanged() {
      return Boolean(
        this.travelContexts[this.selectedId] &&
          this.travelContexts[this.selectedId] !==
            this.selected?.stops.map(stop => stop.stopId).join(",")
      )
    },
    selected() {
      return this.trips.find(trip => trip.tripId === this.selectedId) || null
    },
    filteredTrips() {
      return this.trips.filter(
        trip => this.filter === "all" || trip.lifecycle === this.filter
      )
    },
    busy() {
      return this.pending || this.refreshNeeded || !this.writesEnabled
    },
    customPlace() {
      const values = [this.longitude, this.latitude]
      return normalizeMyAtlasCustomPlace({
        name: this.customName,
        coordinates: values.every(value => String(value).trim() !== "")
          ? values.map(Number)
          : null,
      })
    },
  },
  watch: {
    selectedId(value) {
      this.$emit("detail-change", Boolean(value))
    },
    scope: {
      immediate: true,
      handler(value) {
        this.filter = ["planned", "past"].includes(value) ? value : "all"
        if (
          this.selected &&
          this.filter !== "all" &&
          this.selected.lifecycle !== this.filter
        ) {
          this.selectedId = ""
          this.$emit("route-change", { active: false, route: [] })
        }
      },
    },
  },
  // Vue 2 owns this lifecycle.
  // eslint-disable-next-line vue/no-deprecated-destroyed-lifecycle
  beforeDestroy() {
    clearTimeout(this.searchTimer)
    this.searchSequence++
    this.stopPlacement()
  },
  methods: {
    readCapabilities(state) {
      this.capabilities = {
        emptyTripDrafts: state.capabilities?.emptyTripDrafts === true,
        planningNotes: state.capabilities?.planningNotes === true,
      }
    },
    selectSearchResult(place) {
      if (this.busy || (this.creating && this.draftStops.length >= 50)) return
      this.destinationEntryMode = "search"
      this.selectedSearchPlace = {
        ...place,
        coordinates: Array.isArray(place.coordinates)
          ? [...place.coordinates]
          : null,
      }
      this.choose(
        { placeId: place.placeId },
        place.name,
        this.resultLocation(place)
      )
    },
    resultLocation(place) {
      return [
        ...new Set(
          [
            place.admin2Name,
            place.admin1Name,
            place.countryName || place.countryCode,
          ].filter(Boolean)
        ),
      ].join(", ")
    },
    resultDescription(place) {
      const coordinates = place.coordinates
      return [
        formatPlaceTypeLabel(place),
        Array.isArray(coordinates) &&
        coordinates.length === 2 &&
        coordinates.every(Number.isFinite)
          ? `${coordinates[1].toFixed(4)}, ${coordinates[0].toFixed(4)}`
          : "",
      ]
        .filter(Boolean)
        .join(" · ")
    },
    draftPlaceCount(id) {
      return this.creating
        ? this.draftStops.filter(stop => stop.selection.placeId === id).length
        : 0
    },
    openWorkspace(value) {
      if (this.pending) return
      if (value === "create" || value === "add") {
        this.destinationEntryMode = "search"
        this.selectedSearchPlace = null
      }
      this.workspaceStatus = ""
      this.workspace = value
      this.workspaceTab =
        {
          create: "details",
          metadata: "details",
          visits: "order",
          visit: "memory",
          travel: "flights",
        }[value] || ""
      if (value === "add") this.adding = true
      if (value === "visit" && this.selected?.lifecycle === "planned")
        this.workspaceTab = "planning"
    },
    closeWorkspace() {
      if (this.pending) return
      this.workspace = ""
      this.creating = false
      this.adding = false
      this.stopPlacement()
    },
    toggleCombinedTrip(id, value) {
      this.combineIds = value
        ? [...this.combineIds, id]
        : this.combineIds.filter(item => item !== id)
    },
    handleDialogTabKey(event, key) {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
        return
      event.preventDefault()
      const tabs = this.dialogTabs,
        index = tabs.findIndex(tab => tab.key === key)
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? tabs.length - 1
            : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) %
              tabs.length
      this.workspaceTab = tabs[next].key
      event.currentTarget.parentElement
        .querySelectorAll('[role="tab"]')
        [next].focus()
    },
    resumePlacementEditor() {
      const workspace = this.placementWorkspace
      this.placementWorkspace = ""
      this.stopPlacement()
      this.workspace = workspace
    },
    async prepareDestinationGroup(places) {
      this.openWorkspace("group")
      this.destinationGroupResolved = false
      this.groupDestinations = places.map(place => ({
        pinId: place.pinId,
        placeId: place.placeId,
        name: place.name,
      }))
      this.combineIds = []
      this.combineTitle = ""
      this.groupTitle = ""
      this.groupTargetId = ""
      if (!this.loaded) return
      if (this.upgraded) this.applyDestinationGroup()
      else await this.previewUpgrade()
    },
    applyDestinationGroup() {
      if (!this.groupDestinations.length) return
      this.filter = "past"
      this.selectedId = ""
      this.creating = false
      this.adding = false
      this.$emit("route-change", { active: false, route: [] })
    },
    async enableTripOrganizing() {
      if (!this.preview?.ready || !this.retentionAcknowledged || this.busy)
        return
      await this.mutate("upgrade", {
        fingerprint: this.preview.fingerprint,
        confirmation: "ORGANIZE MY ATLAS",
        destinationModelVersion: 2,
        retentionAcknowledged: true,
      })
    },
    async saveDestinationGroup() {
      if (!this.canSaveDestinationGroup) return
      if (!this.upgraded) await this.enableTripOrganizing()
      if (!this.upgraded || this.refreshNeeded) return
      await this.mutate("groupDestinations", {
        pinIds: this.groupDestinations.map(place => place.pinId),
        ...(this.groupTargetId
          ? { tripId: this.groupTargetId }
          : { title: this.groupTitle.trim() }),
      })
    },
    token() {
      return getMyAtlasApiAccessToken()
    },
    count(status) {
      return this.trips.filter(trip => trip.lifecycle === status).length
    },
    async shareTrip() {
      try {
        await navigator.clipboard.writeText(buildSharedTripUrl(this.selected))
        this.announce("Read only trip link copied.")
      } catch {
        this.announce("The trip link could not be copied.", "error")
      }
    },
    announce(message, tone = "success") {
      if (this.workspace) {
        this.workspaceStatus = message
        return
      }
      this.$emit("action-feedback", { message, tone })
    },
    async reveal() {
      this.open = true
      this.$emit("open-change", true)
      if (!this.loaded) await this.load()
    },
    showCollection() {
      if (this.pending) return
      this.closeWorkspace()
      this.selectedId = ""
      this.$emit("route-change", { active: false, route: [] })
      this.$nextTick(() =>
        this.$el
          .querySelector(".trip-new-primary")
          ?.focus({ preventScroll: true })
      )
    },
    close() {
      this.closeWorkspace()
      this.open = false
      this.$emit("open-change", false)
      this.stopPlacement()
      this.groupDestinations = []
      this.destinationGroupResolved = false
      this.$emit("route-change", { active: false, route: [] })
    },
    async call(options) {
      return requestMyAtlasTrips({
        apiBaseUrl: this.apiBaseUrl,
        accessToken: await this.token(),
        ...options,
      })
    },
    async load() {
      this.pending = true
      try {
        const state = await this.call({ action: "list" })
        this.destinations = state.destinations || []
        this.ungroupedVisits = state.ungroupedVisits || []
        this.trips = state.trips
        this.upgraded = state.upgraded
        this.writesEnabled = state.writesEnabled === true
        this.readCapabilities(state)
        this.rollbackAvailable = state.rollbackAvailable
        this.currentRevision = state.profile.revision
        this.loaded = true
        this.refreshNeeded = false
        this.error = ""
        this.$emit("changed", state)
        this.$emit("collection-change", state)
        this.applyDestinationGroup()
        if (this.selected) this.select(this.selected, true)
        else this.$emit("route-change", { active: false, route: [] })
      } catch (error) {
        this.error =
          error.status === 404
            ? "This server does not yet support trips. Your existing Atlas is unchanged."
            : error.status === 401
              ? "Sign in again to load your trips. Your existing Atlas is unchanged."
              : "Trips could not be loaded. Refresh to retry. Your existing Atlas is unchanged."
      } finally {
        this.pending = false
      }
    },
    async previewUpgrade() {
      this.pending = true
      try {
        this.preview = await this.call({ action: "preview" })
        this.currentRevision = this.preview.revision
        this.error = ""
      } catch {
        this.error =
          "The trip upgrade preview could not be loaded. Your Atlas is unchanged."
      } finally {
        this.pending = false
      }
    },
    select(trip, keepEditor = false) {
      if (
        ["planned", "past"].includes(this.scope) &&
        trip.lifecycle !== this.scope
      ) {
        this.selectedId = ""
        this.$emit("route-change", { active: false, route: [] })
        return
      }
      this.selectedId = trip.tripId
      this.creating = false
      this.adding = false
      if (!keepEditor) {
        this.editingStopId = ""
        this.titleDraft = trip.title
        this.publicAtlasDraft = trip.sharing.publicAtlas
        this.descriptionDraft = trip.description
        this.travelTool = ""
        this.existingPinIds = []
      }
      if (
        this.editingStopId &&
        !trip.stops.some(stop => stop.stopId === this.editingStopId)
      )
        this.editingStopId = ""
      this.directions = []
      this.routeReviewed = false
      this.stopPlacement()
      this.$emit("route-change", {
        active: true,
        route: buildCanonicalTripMapRoute(trip).map((node, index) => ({
          ...node,
          location: myAtlasStopMapPlace(trip.stops[index]),
        })),
        lifecycle: trip.lifecycle,
      })
    },
    startNew() {
      this.openWorkspace("create")
      this.creating = true
      this.adding = false
      this.selectedId = ""
      this.draftTitle = ""
      this.draftLifecycle = this.scope === "past" ? "past" : "planned"
      this.draftStops = []
      this.$emit("route-change", { active: false, route: [] })
    },
    async mutate(action, body, tripId, stopId) {
      if (this.pending || this.refreshNeeded || !this.writesEnabled) return
      const fingerprint = JSON.stringify({ action, body, tripId, stopId })
      if (this.attempt?.fingerprint !== fingerprint)
        this.attempt = {
          fingerprint,
          revision: this.currentRevision || this.revision,
          key: crypto.randomUUID(),
        }
      this.pending = true
      this.error = ""
      this.announce("Saving trip changes.", "busy")
      this.pendingAction = action
      try {
        const result = await this.call({
          action,
          body,
          tripId,
          stopId,
          revision: this.attempt.revision,
          idempotencyKey: this.attempt.key,
        })
        this.currentRevision = result.profile.revision
        this.attempt = null
        this.savedSequence++
        if (action === "upgrade" && this.workspace === "upgrade")
          this.workspace = ""
        if (
          [
            "create",
            "metadata",
            "groupDestinations",
            "combine",
            "addStop",
            "delete",
            "removeStop",
            "lifecycle",
          ].includes(action)
        )
          this.workspace = ""
        this.creating = false
        this.adding = false
        this.stopPlacement()
        this.combineIds = []
        this.combineTitle = ""
        if (result.trip) {
          this.trips = this.trips.filter(
            trip =>
              trip.tripId !== result.trip.tripId &&
              !(action === "combine" && body.tripIds.includes(trip.tripId))
          )
          this.trips.push(result.trip)
          this.selectedId = result.trip.tripId
        }
        if (action === "delete") {
          this.trips = this.trips.filter(trip => trip.tripId !== tripId)
          this.selectedId = ""
        }
        this.upgraded = result.upgraded
        if (action === "logistics") this.$delete(this.travelDrafts, tripId)
        if (action === "groupDestinations") {
          this.existingPinIds = []
          this.groupDestinations = []
          this.groupTitle = ""
          this.groupTargetId = ""
        }
        if (action === "rollback") {
          this.preview = null
          this.confirmation = ""
          this.retentionAcknowledged = false
        }
        this.$emit("changed", { ...result, action })
        this.announce(
          action === "sharing"
            ? body.publicAtlas
              ? "Public Atlas visibility enabled for this trip."
              : "Trip destinations hidden from your public Atlas."
            : action === "lifecycle"
              ? `Trip moved to ${body.lifecycle === "past" ? "Past" : "Planning"}.`
              : "Trip changes saved."
        )
        try {
          const state = await this.call({ action: "list" })
          this.destinations = state.destinations || []
          this.ungroupedVisits = state.ungroupedVisits || []
          this.trips = state.trips
          this.rollbackAvailable = state.rollbackAvailable
          this.currentRevision = state.profile.revision
          this.writesEnabled = state.writesEnabled === true
          this.readCapabilities(state)
          this.$emit("collection-change", state)
          if (action === "upgrade") this.applyDestinationGroup()
          if (["combine", "groupDestinations"].includes(action)) {
            this.groupDestinations = []
            this.groupTitle = ""
            this.groupTargetId = ""
          }
          if (this.selected)
            this.select(
              this.selected,
              !["create", "combine", "groupDestinations", "transfer"].includes(
                action
              )
            )
          else this.$emit("route-change", { active: false, route: [] })
        } catch {
          this.refreshNeeded = true
          this.announce(
            "Your change was saved. Refresh trips before making another change.",
            "warning"
          )
        }
      } catch (error) {
        if (
          error.code === "revision_conflict" ||
          error.code === "upgrade_source_changed"
        ) {
          this.attempt = null
          this.refreshNeeded = true
          this.error =
            "Your Atlas changed. Refresh trips, review your draft and retry."
        } else
          this.error =
            error.code === "trip_writes_disabled"
              ? "The trip upgrade is disabled on this server."
              : "The change could not be confirmed. Your draft is still here. Retry or refresh trips."
        this.announce(this.error, "error")
      } finally {
        this.pending = false
        this.pendingAction = ""
      }
    },
    editStop(stop) {
      this.openWorkspace("visit")
      if (this.editingStopId === stop.stopId) return
      this.editingStopId = stop.stopId
      this.memoryDraft =
        stop.memories.find(memory => memory.kind === "note")?.text || ""
      this.planNoteDraft = stop.planNote || ""
      this.dates = {
        plannedArrival: stop.plannedDates.arrival || "",
        plannedDeparture: stop.plannedDates.departure || "",
        actualArrival: stop.actualDates.arrival || "",
        actualDeparture: stop.actualDates.departure || "",
      }
    },
    stopLocation(stop) {
      return [
        ...new Set(
          [stop.place.admin1Name, stop.place.countryName].filter(Boolean)
        ),
      ].join(", ")
    },
    stopDate(stop) {
      return journeyCardDate({
        trip: { ...this.selected, stops: [stop] },
        legacy: false,
      })
    },
    openStopActions(stop) {
      this.editStop(stop)
      this.workspaceTab = "actions"
    },
    toggleExistingDestination(id, value) {
      this.existingPinIds = value
        ? [...new Set([...this.existingPinIds, id])]
        : this.existingPinIds.filter(item => item !== id)
    },
    reorderStops(stopIds) {
      if (
        !this.selected ||
        this.busy ||
        stopIds.length !== this.selected.stops.length ||
        new Set(stopIds).size !== stopIds.length ||
        stopIds.some(
          id => !this.selected.stops.some(stop => stop.stopId === id)
        )
      )
        return
      return this.mutate("reorder", { stopIds }, this.selected.tripId)
    },
    confirmRemoveStop() {
      if (this.busy || !this.editingStop || this.selected.stops.length < 2)
        return
      this.openWorkspace("remove")
    },
    openTrip(id) {
      const trip = this.trips.find(item => item.tripId === id)
      if (trip) this.select(trip)
    },
    async saveTravelDetails() {
      try {
        await this.mutate(
          "logistics",
          { draft: normalizeTripTravelDraft(this.selectedTravelDraft) },
          this.selected.tripId
        )
      } catch {
        this.announce(
          "Check your travel details and date order before saving.",
          "error"
        )
      }
    },
    toolPlan() {
      return {
        start: this.selected.stops[0].place,
        stops: this.selected.stops.slice(1).map(stop => stop.place),
        endMode: "last-stop",
        end: null,
      }
    },
    prepareDirections() {
      try {
        this.directions = buildGoogleMapsRouteHandoffs(this.toolPlan(), {
          defaultMode: this.directionsMode,
          confirmedCoordinatePlaceIds: this.routeReviewed
            ? this.selected.stops
                .filter(stop => stop.place.placeType === "custom")
                .map(stop => stop.place.placeId)
            : [],
        }).actions
        this.error = ""
      } catch (error) {
        this.error = error.message
      }
    },
    async copyPrompt() {
      try {
        await navigator.clipboard.writeText(
          buildAiPlanningPrompt(this.toolPlan())
        )
        this.announce("Planning prompt copied.")
      } catch {
        this.announce("The planning prompt could not be copied.", "error")
      }
    },
    moveStop(index, direction) {
      if (
        !this.selected ||
        index < 0 ||
        index >= this.selected.stops.length ||
        ![-1, 1].includes(direction) ||
        index + direction < 0 ||
        index + direction >= this.selected.stops.length
      )
        return
      const stopIds = this.selected.stops.map(stop => stop.stopId)
      ;[stopIds[index], stopIds[index + direction]] = [
        stopIds[index + direction],
        stopIds[index],
      ]
      return this.reorderStops(stopIds)
    },
    removeStop(stop) {
      if (
        !this.selected ||
        this.workspace !== "remove" ||
        this.editingStopId !== stop.stopId ||
        this.selected.stops.length < 2
      )
        return
      const content =
        stop.memories.length ||
        stop.experiences.length ||
        stop.visitedDates.length ||
        stop.planNote
      this.mutate(
        "removeStop",
        { discardContent: Boolean(content) },
        this.selected.tripId,
        stop.stopId
      )
    },
    deleteTrip() {
      this.openWorkspace("delete")
    },
    rollback() {
      if (
        window.confirm(
          "Undo trip organization and restore your original Atlas records?"
        )
      )
        this.mutate("rollback", {})
    },
    choose(selection, name, context = "") {
      if (this.creating) {
        if (this.draftStops.length >= 50) {
          this.announce("A trip can have up to 50 destinations.", "warning")
          return
        }
        this.draftStops.push({ selection, name, context })
        this.announce(
          `${name} added to this trip draft. Save the trip to keep it.`,
          "draft"
        )
        this.stopPlacement()
      } else if (this.selected)
        this.mutate("addStop", selection, this.selected.tripId)
    },
    queueSearch() {
      clearTimeout(this.searchTimer)
      const sequence = ++this.searchSequence
      this.results = []
      this.searchError = ""
      this.searchPending = false
      if (this.query.trim().length < 4) return
      this.searchPending = true
      this.searchTimer = setTimeout(async () => {
        try {
          const result = await searchMyAtlasPlaces({
            query: this.query,
            endpoint: getMyAtlasPlaceSearchEndpoint(
              process.env,
              window.location.origin
            ),
          })
          if (sequence === this.searchSequence)
            this.results = result.places || result
        } catch {
          if (sequence === this.searchSequence)
            this.searchError =
              "Search is unavailable. You can still add a custom stop."
        } finally {
          if (sequence === this.searchSequence) this.searchPending = false
        }
      }, 300)
    },
    syncPlacement() {
      const values = [this.longitude, this.latitude]
      this.$emit("location-placement-change", {
        active: this.placementActive,
        coordinates: values.every(value => String(value).trim() !== "")
          ? normalizeMyAtlasCustomCoordinates(values.map(Number))
          : null,
      })
    },
    beginPlacement() {
      this.placementWorkspace = this.workspace
      this.workspace = ""
      this.placementActive = true
      if (!this.customName) this.customName = this.query
      this.syncPlacement()
    },
    stopPlacement() {
      this.placementActive = false
      this.$emit("location-placement-change", {
        active: false,
        coordinates: null,
      })
    },
    setCoordinates(value) {
      const coordinates = normalizeMyAtlasCustomCoordinates(value)
      if (!coordinates || !this.placementActive) return
      this.longitude = String(coordinates[0])
      this.latitude = String(coordinates[1])
      this.syncPlacement()
      if (this.placementWorkspace) this.resumePlacementEditor()
    },
  },
}
</script>

<style scoped>
.trip-search-preview {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.25);
  border-radius: 10px;
}
.trip-search-preview small {
  color: var(--color-text-muted, #adbcba);
}
.atlas-trips .trip-search-preview input[readonly] {
  background: transparent;
  border-color: rgba(var(--color-highlight-rgb, 255, 255, 255), 0.2);
}
.trip-search-results {
  display: grid;
  gap: 8px;
  max-height: min(300px, 35dvh);
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  list-style: none;
  margin: 0;
  padding: 2px 4px 2px 2px;
}
.atlas-trips .trip-search-result {
  display: grid;
  gap: 5px;
  width: 100%;
  min-height: 76px;
  padding: 12px 14px;
  text-align: left;
  line-height: 1.5;
  white-space: normal;
}
.trip-result-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 4px 12px;
}
.trip-result-action {
  font-size: 0.68rem;
}
.trip-result-location,
.trip-search-result small {
  display: block;
  color: var(--color-text-muted, #adbcba);
  font-size: 0.73rem;
}
.trip-search-result strong {
  font-size: 0.85rem;
}
.trip-search-result[data-added="true"] {
  border-color: var(--color-accent, #e6ba68);
  background: rgba(var(--color-accent-rgb, 230, 186, 104), 0.08);
}
.trip-draft-selection {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.3);
  border-radius: 10px;
}
.trip-draft-selection ol {
  display: grid;
  gap: 8px;
  max-height: 160px;
  overflow-y: auto;
  overscroll-behavior: contain;
  margin: 0;
  padding: 0;
  list-style: none;
}
.trip-draft-selection li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.trip-draft-selection small {
  display: block;
  color: var(--color-text-muted, #adbcba);
}
.atlas-trips,
.trip-form {
  display: grid;
  gap: 12px;
  min-width: 0;
}
.atlas-trips {
  margin: 16px 0;
  padding: 16px;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.35);
  border-radius: 16px;
  align-content: start;
  gap: 10px;
}
.atlas-trips header,
.trip-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.atlas-trips header {
  justify-content: space-between;
}
.trip-workspace-heading {
  gap: 8px;
}
.trip-workspace-heading h2 {
  flex: 0 1 auto;
  line-height: 1.4;
}
.trip-heading-actions {
  display: flex;
  gap: 6px;
  align-items: center;
}
.atlas-trips .trip-workspace-heading {
  margin: 0;
  padding: 0;
  justify-content: flex-start;
  column-gap: 12px;
}
.atlas-trips .trip-editable-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  min-height: 44px;
  padding: 2px 0;
  border: 0;
  border-radius: 4px;
  color: inherit;
  background: transparent;
  text-align: left;
  font: inherit;
}
.trip-editable-title span {
  overflow-wrap: anywhere;
  min-width: 0;
}
.trip-editable-title svg {
  flex: 0 0 16px;
  width: 16px;
  height: 16px;
  fill: none;
  stroke: var(--color-accent-soft, #e6ba68);
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.atlas-trips .trip-editable-title:hover {
  color: var(--color-accent-soft, #e6ba68);
  background: transparent;
  text-decoration: underline;
  text-underline-offset: 4px;
}
.trip-itinerary-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.trip-itinerary-heading h4 {
  margin: 0;
  font-size: 0.8rem;
}
.atlas-trips .trip-danger-link {
  justify-self: start;
  border: 0;
  color: var(--color-error, #eeafa7);
}
.atlas-trips .trip-workspace-heading h2 {
  font-size: 1.05rem;
}
.trip-setting {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.trip-setting > .atlas-switch {
  flex: 1;
}
.trip-summary {
  padding-top: 12px;
  gap: 8px;
  border-top: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.12);
}
.atlas-trips .trip-summary {
  padding: 14px;
  gap: 10px;
}
.atlas-trips .trip-journey-label {
  color: var(--color-accent-soft, #e6ba68);
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.atlas-trips .trip-summary h3 {
  font-size: 1.3rem;
  line-height: 1.3;
}
.atlas-trips .trip-journey-meta {
  color: var(--color-text-muted, #adbcba);
  font-size: 0.75rem;
}
.trip-journey-badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.trip-status-badge,
.trip-visibility-badge {
  padding: 4px 9px;
  border-radius: 20px;
  font-size: 0.68rem;
  font-weight: 600;
  background: rgba(var(--color-highlight-rgb, 255, 255, 255), 0.08);
}
.trip-status-badge.is-past {
  color: var(--color-success, #89c8ae);
  background: rgba(37, 132, 92, 0.14);
}
.trip-journey-description {
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
.trip-summary .trip-itinerary-heading {
  margin-top: 8px;
  padding-top: 14px;
  border-top: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.12);
}
.trip-summary .trip-itinerary-heading h4 {
  font-size: 0.9rem;
}
.atlas-trips .trip-view-map {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  min-height: 48px;
  border-color: var(--color-accent, #e6ba68);
  font-size: 0.84rem;
  font-weight: 600;
}
.trip-view-map svg {
  flex: 0 0 20px;
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linejoin: round;
}
.trip-summary-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.atlas-trips .trip-summary-actions button {
  min-height: 44px;
  border-color: transparent;
  color: var(--color-text, #f3f1e9);
  background: rgba(var(--color-highlight-rgb, 255, 255, 255), 0.06);
}
.trip-dialog-tabs {
  display: flex;
  flex: 0 0 auto;
  gap: 4px;
  padding: 8px 12px;
  height: auto;
  line-height: normal;
  background: transparent;
  box-shadow: none;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  border-bottom: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.12);
}
.trip-dialog-tabs > button {
  flex: 1;
  min-width: max-content;
  min-height: 44px;
  line-height: normal;
  padding: 8px 4px;
  border-color: transparent;
}
.trip-dialog-tabs > button[aria-selected="true"] {
  color: #152024;
  background: var(--color-accent, #e6ba68);
  border-color: var(--color-accent, #e6ba68);
}
.atlas-trips button:not(:disabled):hover {
  background: rgba(var(--color-accent-rgb, 230, 186, 104), 0.12);
  border-color: var(--color-accent, #e6ba68);
}
.atlas-trips button:focus-visible {
  outline: 2px solid var(--color-accent, #e6ba68);
  outline-offset: 3px;
}
.atlas-trips .trip-list button:not(:disabled):hover {
  transform: none;
}
.atlas-trips .trip-dialog-tabs > button[aria-selected="true"]:hover {
  background: var(--color-accent, #e6ba68);
}
.atlas-trips h2,
.atlas-trips h3,
.atlas-trips p {
  margin: 0;
}
.atlas-trips h2 {
  font-size: 1.25rem;
}
.atlas-trips h3 {
  font-size: 1.1rem;
}
.atlas-trips p,
.atlas-trips li,
.atlas-trips label {
  font-size: 0.78rem;
  line-height: 1.6;
}
.atlas-trips label {
  display: grid;
  gap: 5px;
  min-width: 0;
}
.atlas-trips button {
  padding: 9px 11px;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.45);
  border-radius: 9px;
  color: var(--color-accent-soft, #e6ba68);
  background: transparent;
  cursor: pointer;
  font: inherit;
  font-size: 0.72rem;
}
.atlas-trips button:disabled {
  opacity: 0.5;
  cursor: default;
}
.atlas-trips input,
.atlas-trips textarea,
.atlas-trips select {
  display: block;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: 10px;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.3);
  border-radius: 8px;
  color: inherit;
  background: var(--color-surface, #112124);
  font: inherit;
}
.trip-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.trip-list li {
  display: flex;
  align-items: center;
  gap: 12px;
}
.trip-list li > button {
  display: grid;
  gap: 4px;
  flex: 1;
  text-align: left;
}
.trip-list [aria-pressed="true"] {
  background: rgba(var(--color-accent-rgb, 230, 186, 104), 0.1);
}
.trip-form {
  padding: 12px;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.18);
  border-radius: 12px;
}
.atlas-workspace-dialog .trip-form {
  padding: 0;
  border: 0;
  border-radius: 0;
}
.trip-controls button {
  min-height: 34px;
}
.trip-controls > label {
  flex: 1 1 150px;
}
.trip-date-fields {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.atlas-trips {
  padding: 0;
  border: 0;
  margin: 18px 0;
  gap: 16px;
}
.atlas-trips .trip-summary {
  padding: 0;
  border: 0;
  gap: 14px;
}
.atlas-trips .trip-new-primary {
  color: var(--color-on-accent, #112124);
  background: var(--color-accent, #e6ba68);
  border-color: var(--color-accent, #e6ba68);
  min-height: 48px;
  font-weight: 600;
  font-size: 0.9rem;
}
.atlas-trips .trip-new-primary:not(:disabled):hover {
  background: var(--color-accent-soft, #efc777);
}
.atlas-trips .trip-back {
  justify-self: start;
  border: 0;
  padding: 8px 0;
  font-size: 0.8rem;
}
.trip-list li > button {
  position: relative;
  padding: 18px;
  min-height: 112px;
  border-color: var(--color-control-border, #324959);
  background: var(--color-surface-raised, #152629);
  border-radius: 14px;
  gap: 10px;
}
.trip-list strong {
  padding-right: 22px;
  font-size: 1.08rem;
}
.trip-list .trip-status-badge {
  justify-self: start;
}
.trip-list small {
  padding-right: 22px;
  color: var(--color-text-muted, #adbcba);
  font-size: 0.73rem;
}
.trip-list svg {
  position: absolute;
  right: 14px;
  top: calc(50% - 10px);
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
}
.trip-guidance {
  display: grid;
  gap: 7px;
  padding: 14px;
  border-radius: 12px;
  background: var(--color-surface-raised, #152629);
  font-size: 0.8rem;
}
.trip-guidance p {
  color: var(--color-text-muted, #adbcba);
  font-size: 0.75rem;
  line-height: 1.5;
}
.atlas-trips .trip-visibility-badge {
  min-height: 32px;
  padding: 5px 10px;
  border: 0;
  background: rgba(var(--color-highlight-rgb, 255, 255, 255), 0.08);
  font-size: 0.68rem;
}
.atlas-trips .trip-travel-action {
  min-height: 48px;
  background: var(--color-surface-raised, #152629);
  border-color: var(--color-control-border, #324959);
  font-size: 0.86rem;
}
.atlas-trips .trip-manage-action {
  display: grid;
  gap: 7px;
  justify-items: start;
  padding: 14px 0;
  border: 0;
  font-size: 0.85rem;
}
.trip-manage-action span {
  color: var(--color-text-muted, #adbcba);
  font-size: 0.72rem;
  text-align: left;
}
.trip-create-status,
.trip-create-destination {
  display: grid;
  gap: 10px;
  padding: 12px 0;
}
.trip-create-status > strong {
  justify-self: start;
}
.trip-create-status > span,
.trip-create-destination > strong {
  color: var(--color-text-muted, #adbcba);
  font-size: 0.78rem;
}
.trip-create-status small {
  color: var(--color-text-muted, #adbcba);
}
.trip-create-destination {
  border-top: 1px solid var(--color-control-border, #324959);
}
.trip-itinerary-title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.atlas-trips .trip-visit-dialog {
  width: min(480px, calc(100vw - 16px));
  max-height: calc(100dvh - 16px);
}
.trip-visit-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(var(--color-highlight-rgb, 255, 255, 255), 0.12);
  flex: 0 0 auto;
  min-width: 0;
}
.trip-visit-toolbar label {
  font-size: 0.75rem;
  color: var(--color-text-muted, #adbcba);
}
.atlas-trips .trip-visit-toolbar select {
  flex: 1;
  width: auto;
  min-width: 0;
  min-height: 44px;
  padding: 8px 10px;
  font-size: 0.82rem;
}
.trip-visit-context {
  color: var(--color-text-muted, #adbcba);
  font-size: 0.73rem;
}
.atlas-trips .trip-visit-dialog textarea {
  min-height: 84px;
  resize: vertical;
}
@media (max-width: 480px) {
  .trip-visit-dialog .trip-date-fields {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
