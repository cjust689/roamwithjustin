<template>
  <div class="home">
    <div class="parallax-container valign-wrapper">
      <div class="col s12 container">
        <h4>About</h4>
        <p>
          <span class="yellow-text">Roam with Justin</span> began as a personal
          journey — one that started in college with my first camera and a
          couple of Photoshop classes. What began as a creative outlet quickly
          turned into a passion for storytelling through visuals.
        </p>

        <p>
          I’ve always been driven by curiosity and a love for the way light,
          movement, and people tell stories. Whether it’s a still moment in the
          middle of a rainforest or a fleeting glance in a city street, I’m
          drawn to the awe in the world — and the people who feel it.
        </p>

        <p>
          This platform isn’t about showing off a destination — it’s about
          capturing the soul of a moment and helping others feel like they’re
          part of the story. Through travel guides, photo essays, and cinematic
          reels, I aim to inspire others to explore more intentionally, notice
          more deeply, and feel more connected.
        </p>

        <p>
          <span class="yellow-text">Roam with Justin</span> is where adventure
          meets reflection — one frame at a time.
        </p>

        <h5>
          “It’s not about the destination, it’s about the feeling it leaves
          behind.”
        </h5>
        <p>
          Roam with Justin is a passion project — built on curiosity, love of
          the journey, and a whole lot of caffeine. If you enjoy my work, you
          can support it by exploring some of the gear I actually use. A few
          links on this site are affiliate links, which means I may earn a small
          commission if you buy through them. It costs you nothing extra, but it
          helps keep the wheels turning.
        </p>
      </div>
      <div class="parallax">
        <img :src="aboutImage" alt="Roam With Justin travel photography" />
      </div>
    </div>
  </div>
</template>
<script>
import M from "../../js/materialize"

const aboutImages = [
  "/img/roam/default/1.jpg",
  "/img/roam/default/4.jpg",
  "/img/roam/default/5.jpg",
  "/img/roam/default/6.jpg",
]

export default {
  name: "About",
  data() {
    return {
      aboutImage: aboutImages[Math.floor(Math.random() * aboutImages.length)],
    }
  },
  mounted() {
    M.AutoInit()
  },
}
</script>
<style scoped>
.home {
  display: flex;
  width: 100%;
  min-height: calc(100dvh - 72px);
  flex-direction: column;
  justify-content: flex-start;
  overflow: hidden;
  background: #0b1114;
  color: white;
}
.parallax-container {
  width: 100%;
  min-height: calc(100dvh - 72px);
  height: auto;
  overflow: hidden;
  z-index: 1;
}

.parallax img {
  object-fit: cover;
  width: 100%;
  height: 100%;
  max-height: none;
}
.parallax-container::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.45); /* adjust opacity here */
  z-index: 1;
}
.parallax-container .container,
.parallax-container .row {
  position: relative;
  z-index: 2;
}

.parallax-container .container {
  padding-top: clamp(3rem, 8vw, 7rem);
  padding-bottom: clamp(3rem, 8vw, 7rem);
}

.parallax-container p {
  color: rgba(255, 255, 255, 0.78);
  font-size: 1rem;
  line-height: 1.75;
}

.parallax-container h4,
.parallax-container h5 {
  font-family: Georgia, "Times New Roman", serif;
  line-height: 1.2;
}
</style>
