<template>
  <main class="not-found">
    <img
      class="not-found-background"
      src="/img/roam/default/4.jpg"
      alt=""
      aria-hidden="true"
    />
    <div class="not-found-glow" aria-hidden="true"></div>
    <section>
      <span>404 / Route not found</span>
      <h1>This trail ends here.</h1>
      <p>
        The page may have moved, but the journey is still waiting. Return to the
        stories or pick the route back up in the Atlas.
      </p>
      <div>
        <router-link to="/trips">Browse travel stories</router-link>
        <router-link to="/atlas">Open the Travel Atlas</router-link>
      </div>
    </section>
  </main>
</template>

<script>
export default {
  name: "PageNotFound",
}
</script>

<style scoped>
.not-found {
  position: relative;
  display: grid;
  width: 100%;
  min-height: calc(100dvh - 72px);
  overflow: hidden;
  place-items: center;
  padding: 2rem 1rem;
  background: #0b1114;
  color: #fff;
  font-family: "Poppins", system-ui, sans-serif;
}

.not-found::after,
.not-found-background {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.not-found-background {
  object-fit: cover;
}

.not-found::after {
  content: "";
  background: linear-gradient(135deg, rgba(4, 7, 9, 0.52), #0b1114);
}

.not-found-glow {
  position: absolute;
  z-index: 1;
  width: 30rem;
  height: 30rem;
  border-radius: 50%;
  background: rgba(246, 189, 96, 0.1);
  filter: blur(80px);
}

.not-found section {
  position: relative;
  z-index: 2;
  width: min(760px, 100%);
  text-align: center;
}

.not-found section > span {
  color: #f6bd60;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.not-found h1 {
  margin: 0.7rem 0 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(3.4rem, 10vw, 7rem);
  font-weight: 500;
  letter-spacing: -0.06em;
  line-height: 0.92;
}

.not-found p {
  max-width: 600px;
  margin: 1.2rem auto 0;
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.96rem;
  line-height: 1.7;
}

.not-found section > div {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.7rem;
  margin-top: 1.6rem;
}

.not-found a {
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  padding: 0.8rem 1rem;
  background: rgba(7, 11, 14, 0.56);
  color: #fff;
  font-size: 0.76rem;
  font-weight: 800;
  text-decoration: none;
  backdrop-filter: blur(10px);
}

.not-found a:first-child {
  border-color: #f6bd60;
  background: #f6bd60;
  color: #111719;
}
</style>
