/* eslint-disable */
<template>
  <div class="webworks-home">
    <!-- Gallery Popup -->
    <div id="overlay" class="overlay"></div>
    <div id="popup" class="popup">
      <form id="galleryForm">
        <label for="galleryUrl">Enter your gallery URL:</label><br />
        <input
          id="galleryUrl"
          type="url"
          placeholder="https://example.com"
          required
          style="width: 100%; padding: 8px; margin: 10px 0"
        />
        <button type="submit" style="padding: 10px 20px">Submit</button>
      </form>
    </div>

    <!-- Fixed Gallery Button -->
    <div class="">
      <li style="list-style-type: none; position: fixed; top: 10px; left: 10px">
        <a id="openPopup" class="pulse btn-large white black-text"
          >view Your Gallery</a
        >
      </li>
    </div>

    <!-- Floating Email Icon -->
    <li>
      <a
        class="contactBTN pulse btn-floating btn-large section"
        href="mailto:justin@webworksmedia.club?subject=WebWorksMediaInquiry&body=Message"
      >
        <i class="large material-icons black-text">email</i>
      </a>
    </li>

    <!-- Hero Banner -->
    <div class="parallax-container header-img">
      <div class="parallax">
        <img src="/img/Asset 17.svg" />
      </div>
    </div>

    <!-- Intro Section -->
    <div class="section black darken-1">
      <div class="row container valign-wrapper">
        <div class="col s8 center">
          <h1 class="header black-text">WebWorks Media</h1>
          <div class="social-media">
            <a
              href="https://instagram.com/webworks.media"
              style="color: white; font-size: 24px"
              target="_blank"
            >
              <i class="mdi mdi-instagram white-text"></i>
              Follow on Instagram
            </a>
          </div>
        </div>
        <div class="col s4">
          <h5 class="black-text">
            Welcome to our site! <br />We are here for all your Photography,
            Videography and Web Design needs. <br /><br />Feel free to contact
            us
            <a
              class="white-text"
              href="mailto:webworksmedia.club@webworksmedia.club?subject=WebWorksMediaInquiry&body=Message"
            >
              here</a
            >
            for any questions or booking.
          </h5>
        </div>
      </div>
    </div>

    <!-- What We Do Icons -->
    <div class="row container" style="height: 15%">
      <div class="valign-wrapper" style="height: 100%">
        <div class="col s8 center">
          <h2 class="header">What We Do</h2>
        </div>
        <div class="col s4" style="margin: 2em">
          <div class="col s4">
            <a class="btn-floating btn-large waves-effect waves-light section">
              <i class="center grey-text material-icons">videocam</i>
            </a>
          </div>
          <div class="col s4">
            <a class="btn-floating btn-large waves-effect waves-light section">
              <i class="center grey-text material-icons">camera_alt</i>
            </a>
          </div>
          <div class="col s4">
            <a class="btn-floating btn-large waves-effect waves-light section">
              <i class="center grey-text material-icons">code</i>
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- Logo Divider -->
    <div class="row center-align">
      <div class="col s12">
        <img
          style="
            max-height: 100%;
            max-width: 100%;
            height: auto;
            width: auto;
            display: inline-block;
          "
          src="/img/Asset 6.png"
        />
      </div>
    </div>

    <!-- Carousel -->
    <div class="carouselPhoto carousel">
      <a
        v-for="(img, index) in carouselImages"
        :key="index"
        class="carousel-item"
      >
        <img :src="img" />
      </a>
    </div>

    <!-- Static Video & Showcase Sections (example only) -->
    <div
      v-for="project in featuredProjects"
      :key="project.id"
      class="parallax-container"
    >
      <div class="row" style="position: relative; top: 0%">
        <div class="center col s3 yellow darken-3 z-depth-3">
          <img :src="project.logo" style="padding: 2em; width: 70%" />
        </div>
      </div>
      <div class="parallax">
        <iframe
          class="embed-responsive-item"
          width="1920"
          height="1080"
          :src="project.video"
          frameborder="0"
        ></iframe>
      </div>
    </div>

    <!-- Footer -->
    <footer class="page-footer grey darken-4">
      <div class="container">
        <div class="row">
          <div class="col l6 s12">
            <h5 class="white-text">WebWorks Media</h5>
          </div>
        </div>
      </div>
      <div class="footer-copyright">
        <div class="container">
          © {{ new Date().getFullYear() }} WebWorks Media
        </div>
      </div>
    </footer>
  </div>
</template>

<script>
import M from "@/js/materialize"

export default {
  name: "WebHome",
  data() {
    return {
      carouselImages: [
        "/img/photos/DSC01114-2.jpg",
        "/img/photos/DSC00057.jpg",
        "/img/photos/DSC00302.jpg",
        "/img/photos/DSC00567.jpg",
        "/img/photos/DSC03229.jpg",
      ],
      featuredProjects: [
        {
          id: "dominican",
          logo: "/img/dominican.png",
          video:
            "https://www.youtube.com/embed/DcpR9L8i_NU?playlist=DcpR9L8i_NU&loop=1&autoplay=1&controls=1&mute=1",
        },
        {
          id: "attributes",
          logo: "/img/anamoly.png",
          video:
            "https://www.youtube.com/embed/1rdBf1mUV4s?playlist=1rdBf1mUV4s&loop=1&autoplay=1&controls=1&mute=1",
        },
        {
          id: "bas",
          logo: "/img/bas.png",
          video:
            "https://www.youtube.com/embed/vG2tOkPM6dM?playlist=vG2tOkPM6dM&loop=1&autoplay=1&controls=1&mute=1",
        },
        {
          id: "clubfro",
          logo: "/img/clubfro.png",
          video:
            "https://www.youtube.com/embed/vzL4ANrqG8Y?playlist=vzL4ANrqG8Y&loop=1&autoplay=1&controls=1&mute=1",
        },
        {
          id: "eferfc",
          logo: "/img/eferfc.png",
          video:
            "https://www.youtube.com/embed/FgCuT1aBX0s?playlist=FgCuT1aBX0s&loop=1&autoplay=1&controls=1&mute=1",
        },
      ],
    }
  },
  mounted() {
    const carousel = document.querySelectorAll(".carouselPhoto")
    M.Carousel.init(carousel, {
      fullWidth: true,
      indicators: false,
      duration: 200,
    })

    const instance = M.Carousel.getInstance(carousel[0])
    if (instance) {
      setInterval(() => instance.next(), 2500)
    }

    const elems = document.querySelectorAll(".parallax")
    M.Parallax.init(elems)

    // Gallery Popup Logic
    const openPopupBtn = document.getElementById("openPopup")
    const popup = document.getElementById("popup")
    const overlay = document.getElementById("overlay")
    const galleryForm = document.getElementById("galleryForm")

    if (openPopupBtn && popup && overlay && galleryForm) {
      openPopupBtn.addEventListener("click", () => {
        popup.style.display = "block"
        overlay.style.display = "block"
      })

      overlay.addEventListener("click", () => {
        popup.style.display = "none"
        overlay.style.display = "none"
      })
      /* eslint-disable-next-line */
      galleryForm.addEventListener("submit", (e) => {
        e.preventDefault()
        const galleryUrl = document.getElementById("galleryUrl").value
        const allowedDomains = [
          "www.evlaa.com",
          "evlaa.com",
          "webworksmedia.club",
          "www.webworksmedia.club",
        ]
        try {
          const url = new URL(galleryUrl)
          /* eslint-disable-next-line */
          if (!allowedDomains.some((domain) => url.hostname.endsWith(domain))) {
            alert("Invalid URL. Please enter a URL from a trusted domain.")
            return
          }
          window.open(galleryUrl, "_blank")
        } catch (error) {
          alert("Invalid URL format.")
        }
        popup.style.display = "none"
        overlay.style.display = "none"
      })
      /* prettier-ignore-end */
    }
  },
}
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Rubik&family=Ubuntu&display=swap");
@import url("https://fonts.googleapis.com/css2?family=Hurricane&display=swap");
</style>
<style scoped src="@/styles/webHome/materialize.min.css"></style>
<style scoped src="@/styles/webHome/webhome.videoparallax.css"></style>
<style scoped src="@/styles/webHome/webhome.style.css"></style>
