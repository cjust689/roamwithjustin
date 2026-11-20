<template>
  <main class="privacy-page">
    <article>
      <header>
        <h1>Privacy and advertising</h1>
        <p>Effective November 19, 2026</p>
      </header>

      <section>
        <h2>What this site uses</h2>
        <p>
          Roam With Justin uses Google Analytics 4 to understand visits and how
          people move through the site. Google may receive information such as
          pages viewed, browser and device details, referring pages, and
          approximate location derived from an internet address.
        </p>
        <p>
          Public Atlas browsing preferences may be stored in your browser. My
          Atlas sign in and saved account data are described separately below.
        </p>
      </section>

      <section id="my-atlas">
        <h2>My Atlas accounts</h2>
        <p>
          My Atlas uses Auth0 and Google for sign in. Roam With Justin stores an
          internal account identifier, your chosen handle and display name,
          policy acceptance records, and the places, optional visit years,
          favorite memories, private wishlist entries, and trip plans that you
          choose to save. You may also upload one favorite travel image for use
          in Atlas Story images. You choose whether it may also appear on your
          public Visited Atlas profile. Custom pins and private plans may
          include coordinates. Access tokens are kept in browser memory rather
          than permanent browser storage.
        </p>
        <p>
          My Atlas accounts begin private. If you publish your Visited Atlas,
          your handle, display name, visited places, optional visit years,
          favorite memories, and custom pin names and positions become available
          through your public profile link. Your favorite travel image becomes
          visible only when you also allow public profile use. You can keep the
          image private, make the Atlas private, or remove the image at any
          time. Wishlist entries, future trip plans, private notes, desired
          years, and plan retention details are never included in that public
          profile.
        </p>
        <p>
          Auth0 supports authentication. Cloudflare hosts the application data,
          account services, private image storage, image processing, and human
          verification. Uploaded images are resized to a square WebP image and
          stripped of invisible metadata before private storage. The original
          upload is not retained. GeoNames supplies geographic catalog data.
          Google receives a request only when you sign in through Google or
          choose to open a prepared Google Maps link. My Atlas account screens
          are excluded from the site's Google Analytics page and event tracking.
        </p>
      </section>

      <section>
        <h2>Future trip retention</h2>
        <p>
          Creating a trip plan, making a substantive edit, or selecting Keep
          starts a new six calendar month retention period. Signing in, viewing
          the plan, exporting account data, opening Maps links, or copying a
          planning prompt does not restart that period.
        </p>
        <p>
          After six months without an explicit save or Keep action, the trip is
          marked for deletion and the account shows a 30 day review period. You
          can keep or delete it during that period. When the review period ends,
          the trip and its saved location snapshots are deleted automatically.
          Wishlist entries and visited places are not removed by trip expiry.
        </p>
      </section>

      <section>
        <h2>My Atlas deletion and export</h2>
        <p>
          A signed in account owner can download private account data and can
          permanently delete the My Atlas application account. Deletion removes
          the profile, visited pins, memories, wishlist, trip plan, policy
          records, favorite travel image, and active application registration.
          It does not delete the owner's Google or Auth0 identity.
        </p>
        <p>
          A minimal record is retained to make an interrupted deletion safe to
          retry. A separate record reserves the former public handle and its
          deletion time so it cannot be reassigned accidentally. Those records
          do not retain the deleted profile, travel content, Google identity, or
          Auth0 subject.
        </p>
      </section>

      <section>
        <h2>Advertising</h2>
        <p>
          Google AdSense is limited to selected long travel stories. The home
          page, Travel Atlas, galleries, lightboxes, videos, location dialogs,
          and navigation do not contain manual ad placements.
        </p>
        <p>
          When advertising is active, Google and its advertising partners may
          use cookies, local storage, device information, and activity data to
          provide, measure, and protect ads. Ad personalization and consent
          choices depend on location, account settings, and the consent tools
          presented to the visitor.
        </p>
      </section>

      <section>
        <h2>External services and links</h2>
        <p>
          Stories may link to maps, social networks, lodging, operators, and
          retailers. Those services apply their own privacy practices after you
          leave this site. Affiliate or paid relationships are disclosed near
          the relevant recommendation when they apply.
        </p>
        <p>
          A public travel story may offer Expedia travel options. The Expedia
          banner script is not requested until you choose to load those options.
          At that point, Expedia and its affiliate attribution provider may
          receive browser, device, network, referral, and interaction details
          under their own privacy practices. My Atlas private account and plan
          data are not supplied to this travel tool.
        </p>
      </section>

      <section>
        <h2>Your choices</h2>
        <p>
          You can clear site storage and cookies through your browser. You can
          also review advertising choices through
          <a
            href="https://myadcenter.google.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google My Ad Center
          </a>
          and learn how Google uses information on partner sites through
          <a
            href="https://policies.google.com/technologies/partner-sites"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google's partner sites explanation </a
          >.
        </p>
        <p>
          My Atlas owners can keep the account private, unpublish a shared
          Atlas, remove individual places, delete wishlist entries and plans,
          change favorite travel image visibility, replace or remove the image,
          export account data, or permanently delete the application account
          from the signed in My Atlas screen.
        </p>
      </section>

      <section>
        <h2>Questions</h2>
        <p>
          Privacy questions can be sent to Roam With Justin through
          <a
            href="https://www.instagram.com/roam.with.justin/"
            target="_blank"
            rel="noopener noreferrer"
          >
            @roam.with.justin on Instagram </a
          >.
        </p>
      </section>
    </article>
  </main>
</template>

<script>
export default {
  name: "PrivacyPolicy",
}
</script>

<style scoped>
.privacy-page {
  min-height: 100vh;
  padding: clamp(3rem, 8vw, 7rem) 1rem;
  background:
    radial-gradient(
      circle at 88% 8%,
      rgba(246, 189, 96, 0.08),
      transparent 28%
    ),
    #0b1114;
  color: #fff;
  font-family: "Poppins", system-ui, sans-serif;
}

.privacy-page article {
  width: min(820px, 100%);
  margin: 0 auto;
}

.privacy-page header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  padding-bottom: clamp(2rem, 5vw, 3.5rem);
}

.privacy-page h1 {
  margin: 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(3rem, 8vw, 6rem);
  font-weight: 500;
  letter-spacing: -0.055em;
  line-height: 0.94;
}

.privacy-page header p,
.privacy-page section p {
  color: rgba(255, 255, 255, 0.68);
  font-size: 0.9rem !important;
  line-height: 1.75;
}

.privacy-page section {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: clamp(2rem, 5vw, 3.5rem) 0;
}

.privacy-page h2 {
  margin: 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(1.8rem, 4vw, 2.7rem);
  font-weight: 500;
}

.privacy-page section p:last-child {
  margin-bottom: 0;
}

.privacy-page a {
  color: #f8d79f;
  font-weight: 700;
}
</style>
