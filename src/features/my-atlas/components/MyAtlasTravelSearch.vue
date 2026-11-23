<template>
  <section
    class="travel-search"
    :aria-label="tool === 'flights' ? 'Flight search' : 'Rental cars'"
  >
    <p class="travel-draft-note">
      <template v-if="persistable">{{
        dirty
          ? "Unsaved travel details. Save them to keep them with this trip."
          : "Travel details are saved with this trip. Review them before opening a provider search."
      }}</template>
      <template v-else>
        These details stay in this view. Copy them before leaving. Saving your
        trip does not save them yet.
      </template>
    </p>
    <p v-if="contextChanged" role="status">
      Your itinerary changed. Review your gateways and rental locations before
      searching. Your entries have been kept.
    </p>
    <template v-if="tool === 'flights'">
      <div class="travel-heading">
        <h4>What flights do you need?</h4>
        <MyAtlasInfo label="About flight gateways"
          >Enter your chosen gateways. Confirm airport codes before preparing a
          search. A round trip searches the same gateways in reverse. Your last
          stop does not choose your return airport or add a ground
          transfer.</MyAtlasInfo
        >
      </div>
      <div
        v-if="
          tripContext.start ||
          tripContext.finish ||
          tripContext.firstDestination
        "
        class="travel-route-context"
      >
        <strong>Your planned locations</strong>
        <span v-if="tripContext.start">Start: {{ tripContext.start }}</span>
        <span v-if="tripContext.firstDestination"
          >First destination: {{ tripContext.firstDestination }}</span
        >
        <span
          v-if="
            tripContext.lastDestination &&
            tripContext.lastDestination !== tripContext.firstDestination
          "
          >Last destination: {{ tripContext.lastDestination }}</span
        >
        <span v-if="tripContext.finish">Finish: {{ tripContext.finish }}</span>
        <small
          >Choose your actual airports below. A city or trail location does not
          choose an airport.</small
        >
      </div>
      <button
        v-if="tripContext.departDate || tripContext.returnDate"
        type="button"
        @click="usePlannedDates"
      >
        Use planned location dates
      </button>
      <label>
        <span>Flight search type</span>
        <select v-model="draft.flights.searchType" @change="clearReview">
          <option value="round-trip">Round trip intention</option>
          <option value="open-jaw">
            Different return airport or multi city
          </option>
          <option value="one-way">One way</option>
          <option value="individual-legs">Build individual flight legs</option>
        </select>
      </label>
      <template v-if="draft.flights.searchType !== 'individual-legs'">
        <div class="travel-fields">
          <label
            ><span>Departure airport code</span
            ><input
              v-model="draft.flights.outboundFrom"
              autocapitalize="characters"
              autocomplete="off"
              maxlength="160"
              placeholder="e.g. ATL"
              @blur="normalizeAirport('outboundFrom')"
              @input="clearReview"
          /></label>
          <label
            ><span>Arrival airport code</span
            ><input
              v-model="draft.flights.outboundTo"
              autocapitalize="characters"
              autocomplete="off"
              maxlength="160"
              placeholder="e.g. SJO"
              @blur="normalizeAirport('outboundTo')"
              @input="clearReview"
          /></label>
          <template v-if="draft.flights.searchType === 'open-jaw'">
            <label
              ><span>Return departure airport code</span
              ><input
                v-model="draft.flights.returnFrom"
                autocapitalize="characters"
                autocomplete="off"
                maxlength="160"
                placeholder="e.g. SJO"
                @blur="normalizeAirport('returnFrom')"
                @input="clearReview"
            /></label>
            <label
              ><span>Return arrival airport code</span
              ><input
                v-model="draft.flights.returnTo"
                autocapitalize="characters"
                autocomplete="off"
                maxlength="160"
                placeholder="e.g. ATL"
                @blur="normalizeAirport('returnTo')"
                @input="clearReview"
            /></label>
          </template>
          <label
            ><span>Departure date, optional</span
            ><input
              v-model="draft.flights.departDate"
              type="date"
              @input="clearReview"
          /></label>
          <label v-if="draft.flights.searchType !== 'one-way'"
            ><span>Return date, optional</span
            ><input
              v-model="draft.flights.returnDate"
              type="date"
              @input="clearReview"
          /></label>
        </div>
        <MyAtlasSwitch v-model="draft.flights.confirmed" @change="clearReview"
          >I reviewed these gateways and airport codes.</MyAtlasSwitch
        >
        <button type="button" @click="reviewFlights">
          Review flight search
        </button>
        <div v-if="flightReview" class="travel-preview">
          <pre>{{ flightReview.details }}</pre>
          <ul v-if="flightReview.readiness?.length" role="status">
            <li v-for="message in flightReview.readiness" :key="message">
              {{ message }}
            </li>
          </ul>
          <div v-if="flightReview.conflicts.length">
            <p role="status">
              An explicit return Fly leg differs from this round trip intention.
              Keep using the individual legs, or confirm a separate main search.
              Neither choice changes your itinerary.
            </p>
            <label class="travel-check"
              ><input
                v-model="draft.flights.conflictChoice"
                type="radio"
                value="main"
                @change="reviewFlights"
              /><span
                >Use this main search and keep all individual legs</span
              ></label
            >
            <button type="button" @click="useIndividualFlights">
              Use individual flight legs
            </button>
          </div>
          <template v-if="flightReview.links.length">
            <a
              v-for="link in flightReview.links"
              :key="link.url"
              :href="link.url"
              target="_blank"
              rel="noopener noreferrer"
              referrerpolicy="no-referrer"
              >{{ link.label }}</a
            >
          </template>
          <template v-else>
            <p>
              For a prefilled search, confirm three letter airport codes and
              dates. Otherwise, copy your details and choose airports on
              Expedia.
            </p>
            <a
              :href="providers.expedia.url"
              target="_blank"
              rel="noopener noreferrer"
              referrerpolicy="no-referrer"
              >Open Expedia flight search</a
            >
          </template>
          <button type="button" @click="copyDetails(flightReview.details)">
            Copy flight details
          </button>
          <small
            >Only reviewed airports and dates are sent when you open a prepared
            link. Prices, availability, and bookings are confirmed by
            Expedia.</small
          >
        </div>
      </template>
      <div class="travel-other-flights">
        <h4>Individual Fly legs {{ explicitFlyPairs.length }}</h4>
        <p v-if="!explicitFlyPairs.length">
          Choose Fly for a leg in Directions to keep it here separately.
        </p>
        <p v-else>
          These selections are kept separately from your main flight search.
        </p>
        <div v-for="pair in explicitFlyPairs" :key="pair.pairKey">
          <strong
            >{{ pair.from.location.name }} to
            {{ pair.to.location.name }}</strong
          >
          <button type="button" @click="useLeg(pair)">
            Use as one way search
          </button>
          <button
            type="button"
            @click="
              copyDetails(
                `${pair.from.location.name} to ${pair.to.location.name}`
              )
            "
          >
            Copy leg details
          </button>
        </div>
        <a
          :href="providers.expedia.url"
          target="_blank"
          rel="noopener noreferrer"
          referrerpolicy="no-referrer"
          >Open Expedia flight search</a
        >
      </div>
    </template>
    <template v-else>
      <h4>Need a rental car?</h4>
      <label
        ><span>Rental preference</span
        ><select v-model="draft.rental.need" @change="clearReview">
          <option value="unsure">Not sure</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select></label
      >
      <template v-if="draft.rental.need !== 'no'">
        <div class="travel-fields">
          <label
            ><span>Pick up at</span
            ><input
              v-model="draft.rental.pickup"
              maxlength="160"
              placeholder="City, airport, or rental location"
              @input="clearReview"
          /></label>
          <label
            ><span>Drop off</span
            ><select v-model="draft.rental.dropoffMode" @change="clearReview">
              <option value="same-as-pickup">Same as pickup</option>
              <option value="different-location">Different location</option>
            </select></label
          >
          <label v-if="draft.rental.dropoffMode === 'different-location'"
            ><span>Drop off at</span
            ><input
              v-model="draft.rental.dropoff"
              maxlength="160"
              @input="clearReview"
          /></label>
          <label
            ><span>Pickup local date and time, optional</span
            ><input
              v-model="draft.rental.pickupAt"
              type="datetime-local"
              @input="clearReview"
          /></label>
          <label
            ><span>Drop off local date and time, optional</span
            ><input
              v-model="draft.rental.dropoffAt"
              type="datetime-local"
              @input="clearReview"
          /></label>
        </div>
        <p v-if="draft.rental.dropoffMode === 'different-location'">
          A different drop off location may have an additional fee. Confirm it
          with the rental provider.
        </p>
        <MyAtlasSwitch v-model="draft.rental.confirmed" @change="clearReview"
          >I reviewed my pickup and drop off choices.</MyAtlasSwitch
        >
        <button type="button" @click="reviewRental">
          Review rental details
        </button>
        <div v-if="rentalReview" class="travel-preview">
          <pre>{{ rentalReview.details }}</pre>
          <button type="button" @click="copyDetails(rentalReview.details)">
            Copy rental details
          </button>
          <a
            v-if="rentalReview.url"
            :href="rentalReview.url"
            target="_blank"
            rel="noopener noreferrer"
            referrerpolicy="no-referrer"
            >Find cars with Avis</a
          >
          <small
            >Avis opens its ordinary rental page. Your locations and dates are
            not sent or prefilled. Confirm the exact rental counter and terms
            there.</small
          >
        </div>
      </template>
      <p v-else>
        No rental car is included. Your travel modes stay as chosen in
        Directions.
      </p>
    </template>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-if="notice" role="status">{{ notice }}</p>
  </section>
</template>

<script>
import MyAtlasSwitch from "./MyAtlasSwitch.vue"
import MyAtlasInfo from "./MyAtlasInfo.vue"
import { normalizedFlightAirportCode } from "../planning/handoffs.mjs"
import { seedTravelDates } from "../planning/tripTravelContext.mjs"
import {
  emptyTravelSearchDraft,
  reviewFlightSearch,
  reviewRentalSearch,
  TRAVEL_SEARCH_PROVIDERS,
} from "../planning/travelSearch.mjs"

export default {
  name: "MyAtlasTravelSearch",
  components: { MyAtlasSwitch, MyAtlasInfo },
  props: {
    tool: { type: String, required: true },
    value: { type: Object, required: true },
    explicitFlyPairs: { type: Array, default: () => [] },
    contextChanged: { type: Boolean, default: false },
    persistable: { type: Boolean, default: false },
    dirty: { type: Boolean, default: true },
    tripContext: { type: Object, default: () => ({}) },
  },
  emits: ["input"],
  data() {
    return {
      draft: JSON.parse(JSON.stringify(this.value || emptyTravelSearchDraft())),
      flightReview: null,
      rentalReview: null,
      error: "",
      notice: "",
      providers: TRAVEL_SEARCH_PROVIDERS,
    }
  },
  watch: {
    value: {
      deep: true,
      handler(value) {
        if (JSON.stringify(value) !== JSON.stringify(this.draft)) {
          this.draft = JSON.parse(
            JSON.stringify(value || emptyTravelSearchDraft())
          )
          this.clearReview()
        }
      },
    },
    draft: {
      deep: true,
      handler(value) {
        this.$emit("input", JSON.parse(JSON.stringify(value)))
      },
    },
    explicitFlyPairs: {
      deep: true,
      handler() {
        this.clearReview()
      },
    },
    contextChanged: {
      // Changed trip context requires a fresh airport review, never new guesses.
      immediate: true,
      handler(changed) {
        if (!changed) return
        this.draft.flights.confirmed = false
        this.draft.flights.conflictChoice = ""
        this.draft.rental.confirmed = false
        this.clearReview()
      },
    },
    tool() {
      this.error = ""
      this.notice = ""
    },
  },
  methods: {
    normalizeAirport(field) {
      const code = normalizedFlightAirportCode(this.draft.flights[field])
      if (code && code !== this.draft.flights[field]) {
        this.draft.flights[field] = code
        this.draft.flights.confirmed = false
        this.clearReview()
      }
    },
    usePlannedDates() {
      this.draft = seedTravelDates(this.draft, this.tripContext, {
        replace: true,
      })
      this.clearReview()
      this.notice =
        "Planned dates copied. Review your flight dates and airports before searching."
    },

    useLeg(pair) {
      this.draft.flights = {
        ...this.draft.flights,
        searchType: "one-way",
        outboundFrom: normalizedFlightAirportCode(pair.from.location.name),
        outboundTo: normalizedFlightAirportCode(pair.to.location.name),
        departDate: "",
        confirmed: false,
        conflictChoice: "",
      }
      this.clearReview()
    },
    clearReview() {
      this.flightReview = null
      this.rentalReview = null
      this.error = ""
      this.notice = ""
    },
    reviewFlights() {
      this.error = ""
      try {
        this.flightReview = reviewFlightSearch(
          this.draft.flights,
          this.explicitFlyPairs
        )
      } catch (error) {
        this.flightReview = null
        this.error = error.message
      }
    },
    useIndividualFlights() {
      this.draft.flights.searchType = "individual-legs"
      this.clearReview()
    },
    reviewRental() {
      this.error = ""
      try {
        this.rentalReview = reviewRentalSearch(this.draft.rental)
      } catch (error) {
        this.rentalReview = null
        this.error = error.message
      }
    },
    async copyDetails(details) {
      try {
        await navigator.clipboard.writeText(details)
        this.notice = "Travel details copied."
      } catch {
        this.notice = "Select the visible details to copy them."
      }
    },
  },
}
</script>

<style scoped>
.travel-route-context {
  display: grid;
  gap: 6px;
  padding: 12px;
  border: 1px solid var(--color-control-border, #71848d);
  border-radius: 10px;
  font-size: 0.75rem;
}

.travel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.travel-heading h4 {
  margin: 0;
}
.travel-search {
  display: grid;
  min-width: 0;
  gap: 0.85rem;
  padding: 1rem;
  border: 1px solid rgba(var(--color-accent-rgb, 230, 186, 104), 0.3);
  border-radius: 1rem;
  color: var(--color-text, #edf7f2);
}
.travel-search p,
.travel-search h4 {
  margin: 0;
}
.travel-search h4 {
  font: inherit;
  font-size: 0.9rem;
  font-weight: 700;
}
.travel-search p,
.travel-search small,
.travel-search label {
  font-size: 0.72rem;
  line-height: 1.6;
}
.travel-search p,
.travel-search small {
  color: var(--color-text-muted, #a7b9b3);
}
.travel-search label {
  display: grid;
  gap: 0.35rem;
}
.travel-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
}
.travel-search input:not([type="checkbox"]):not([type="radio"]),
.travel-search select {
  display: block;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  height: auto;
  margin: 0;
  padding: 0.65rem;
  border: 1px solid var(--color-border, #52625b);
  border-radius: 0.55rem;
  color: var(--color-text, #edf7f2);
  background: var(--color-surface, #0d1719);
  font: inherit;
  box-shadow: none;
}
.travel-search .travel-check {
  display: flex;
  align-items: start;
  gap: 0.6rem;
}
.travel-check input {
  position: static;
  opacity: 1;
  pointer-events: auto;
  flex: 0 0 auto;
  margin-top: 0.3rem;
  width: 1rem;
  height: 1rem;
  appearance: auto;
}
.travel-search .travel-check > span {
  display: block;
  position: static;
  height: auto;
  padding: 0;
  font-size: inherit;
  line-height: 1.6;
}
.travel-search .travel-check > span::before,
.travel-search .travel-check > span::after {
  display: none;
  content: none;
}
.travel-search button,
.travel-search a {
  display: inline-block;
  justify-self: start;
  min-height: 44px;
  padding: 0.65rem 0.85rem;
  border: 1px solid #8b7446;
  border-radius: 0.6rem;
  color: var(--color-accent-soft, #f4d38f);
  background: transparent;
  font: inherit;
  font-size: 0.72rem;
  cursor: pointer;
  text-decoration: none;
}
.travel-search :focus-visible {
  outline: 2px solid var(--color-focus, #e6ba68);
  outline-offset: 3px;
}
.travel-preview,
.travel-other-flights {
  display: grid;
  gap: 0.75rem;
}
.travel-preview pre {
  margin: 0;
  padding: 0.75rem;
  border-radius: 0.6rem;
  background: var(--color-page, #081315);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font: inherit;
  font-size: 0.75rem;
}
.travel-other-flights > div {
  display: grid;
  gap: 0.5rem;
  font-size: 0.75rem;
}
@media (max-width: 600px) {
  .travel-fields {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
