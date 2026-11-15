<template>
  <main class="privacy-page">
    <article>
      <header>
        <span>Site information</span>
        <h1>Privacy and advertising</h1>
        <p>Effective November 15, 2026</p>
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
          Atlas favorites and recent places are stored in your browser. They are
          used to restore your Atlas experience and are not presented as
          advertising activity.
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

.privacy-page header span {
  color: #f6bd60;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.privacy-page h1 {
  margin: 0.65rem 0 0;
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
