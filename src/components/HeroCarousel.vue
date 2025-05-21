<template>
  <div class="hero-carousel">
    <div class="carousel-container">
      <div
        class="carousel-slide"
        :style="{ transform: `translateX(-${currentSlide * 100}%)` }"
      >
        <div
          v-for="(img, index) in allImages"
          :key="index"
          class="carousel-item"
        >
          <img :src="img" />
        </div>
      </div>
    </div>
    <div class="carousel-dots">
      <span
        v-for="(img, index) in allImages"
        :key="index"
        class="dot"
        :class="{ active: index === currentSlide }"
        @click="goToSlide(index)"
      ></span>
    </div>
  </div>
</template>

<script>
export default {
  name: "HeroCarousel",
  props: {
    images: Array,
    cover: String,
  },
  data() {
    return {
      currentSlide: 0,
      interval: null,
    }
  },
  computed: {
    allImages() {
      return [this.cover, ...(this.images || [])]
    },
  },
  mounted() {
    this.startAutoSlide()
  },
  beforeUnmount() {
    clearInterval(this.interval)
  },
  methods: {
    startAutoSlide() {
      this.interval = setInterval(() => {
        this.currentSlide = (this.currentSlide + 1) % this.allImages.length
      }, 5000)
    },
    goToSlide(index) {
      this.currentSlide = index
    },
  },
}
</script>

<style scoped>
.hero-carousel {
  position: relative;
  width: 100%;
  overflow: hidden;
  height: 500px; /* ← Add this */
  max-height: 500px;
}
.carousel-container {
  width: 100%;
  height: 100%; /* ← Add this */
  overflow: hidden;
}
.carousel-slide {
  display: flex;
  transition: transform 0.6s ease-in-out;
  width: 100%;
  height: 500px; /* ← Add this */
}
.carousel-item {
  min-width: 100%;
  height: 500px;
  overflow: hidden;
}
.carousel-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.carousel-dots {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: background-color 0.3s;
}
.dot.active {
  background-color: #ffffff;
}
</style>
