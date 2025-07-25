<template>
  <div class="gear-grid container">
    <h1 class="page-title">🎒 My Gear</h1>
    <p class="subtitle">
      Everything you see in my work was captured using the gear below. These are
      affiliate links — using them helps support my work at no extra cost to
      you.
    </p>

    <h2 class="section-heading">📷 Filmmaking & Photography Gear</h2>
    <div class="gallery-grid">
      <a
        v-for="item in photoGear"
        :key="item.title"
        ref="gearLink"
        :ref-in-for="true"
        :href="item.link"
        class="gallery-card"
        target="_blank"
        rel="noopener noreferrer"
      >
        <div
          class="card-banner"
          :style="{ backgroundImage: `url(${item.image})` }"
        ></div>
        <div class="card-content">
          <h3>{{ item.title }}</h3>
          <p>{{ item.description }}</p>
        </div>
      </a>
    </div>

    <h2 class="section-heading">🧭 Adventure Attire & Travel Gear</h2>
    <div class="gallery-grid">
      <a
        v-for="item in adventureGear"
        :key="item.title"
        ref="gearLink"
        :ref-in-for="true"
        :href="item.link"
        class="gallery-card"
        target="_blank"
        rel="noopener noreferrer"
      >
        <div
          class="card-banner"
          :style="{ backgroundImage: `url(${item.image})` }"
        ></div>
        <div class="card-content">
          <h3>{{ item.title }}</h3>
          <p>{{ item.description }}</p>
        </div>
      </a>
    </div>
  </div>
</template>

<script>
import { trackClickEvent } from "@/utils/tracking"

export default {
  name: "GearGrid",
  data() {
    return {
      photoGear: [
        {
          title: "Sony FX30",
          image:
            "https://mms.businesswire.com/media/20220928005841/en/1585923/4/Sony_FX30.jpg?download=1",
          description:
            "My main cinema camera for both commercial and travel shoots.",
          link: "#",
        },
        {
          title: "Sony A6700",
          image: "https://www.50mm.vn/wp-content/uploads/2023/06/sonya6700.jpg",
          description:
            "My main photography camera for both commercial and travel shoots.",
          link: "#",
        },

        {
          title: "Sony A6500",
          image:
            "https://shotkit.com/wp-content/uploads/2018/12/Sony_a6500_review_18.jpg",
          description:
            "My main underwater camera for both commercial and travel shoots.",
          link: "#",
        },
        {
          title: "Tamron 17-70mm f/2.8",
          image:
            "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6392/6392524_sd.jpg;maxHeight=1080;maxWidth=900?format=webp",
          description: "My go-to ultra-wide lens for landscapes and vlogging.",
          link: "#",
        },
        {
          title: "Tamron 35-150mm f/2.0 - f/2.8",
          image:
            "https://cloudfront.slrlounge.com/wp-content/uploads/2023/02/tamron-35-150mm-f2-2.8-review-04.jpg",
          description: "My go-to portrait and telephoto lens.",
          link: "#",
        },
        {
          title: "Sony 24mm f/1.4 GM",
          image:
            "https://d1ncau8tqf99kp.cloudfront.net/converted/101549_original_local_1200x1050_v3_converted.webp",
          description:
            "Love this for gimbal cineamtic work and low light shots",
          link: "#",
        },
        {
          title: "Sony 200-600mm f/5.6-6.3 G OSS",
          image: "https://i.ytimg.com/vi/T0PQ73J6Dmc/maxresdefault.jpg",
          description:
            "Amazing for wildlife and sports photography, and airshows.",
          link: "#",
        },
        {
          title: "SeaFrogs Salted Line for Sony A6xxx",
          image:
            "https://www.saltedline.com/cdn/shop/files/Salted-Line-waterproof-housing-f_492efdda-8462-4c56-89e7-08db26a7e5c3_550x.jpg?v=1738037419",
          description:
            'SeaFrogs UW housing for Sony A6xxx series Salted Line with 6" Dry dome port (Orange) / GEN 3',
          link: "#",
        },
        {
          title: "PeakDesign Carbon Fiber Tripod",
          image:
            "https://cdn.shopify.com/s/files/1/0014/6262/0920/products/PeakDesign-Carbon-Fiber-Travel-Tripod-Black-1_1200x.jpg?v=1670528856",
          description:
            "My go-to tripod for both commercial and travel shoots, lightweight and easy to travel with.",
          link: "#",
        },
        {
          title: "Atomos Shinobi II",
          image:
            "https://www.televisual.com/wp-content/uploads/atomos-shinobi-2-5-640x360.jpg",
          description: "My primary monitor with full camera control.",
          link: "#",
        },
        {
          title: "DJI Air 3",
          image:
            "https://www.cined.com/content/uploads/2023/07/DJI-Air-3-review-cameras.jpg",
          description: "My go-to drone for dynamic aerial storytelling.",
          link: "#",
        },
        {
          title: "DJI Avata 2",
          image:
            "https://cdn.mos.cms.futurecdn.net/m29yaaAj4S8mjLiMuvaZGU-1920-80.jpg.webp",
          description: "My go-to drone for FPV cinematic flying.",
          link: "#",
        },
      ],
      adventureGear: [
        {
          title: "Wife's Adventure Swimsuit",
          image: "/img/roam/DSC00311.jpg",
          description: "Featured in many of our snorkeling reels.",
          link: "#",
        },
        {
          title: "Wife's Adventure Swimsuit - Rogue Season Leto",
          image: "",
          description: "Featured in many of our tropical reels — linked here.",
          link: "#",
        },
        {
          title: "Solamon Techphibian 5",
          image:
            "https://cdn.shopify.com/s/files/1/0014/6262/0920/products/Solamon-Techphibian-5-Black-1_1200x.jpg?v=1670528856",
          description: "My got to water and hiking shoes for all adventures.",
          link: "#",
        },
        {
          title: "Cressi Snorkel Set",
          image:
            "https://store.cressi.com/cdn/shop/files/juswgnerobvgss8yiswv.jpg?v=1747403208&width=1200",
          description:
            "Reliable, affordable, and a great fit — we use this often.",
          link: "#",
        },
        {
          title: "Ketl Mtn Jacket",
          image:
            "https://ketlmtn.com/cdn/shop/files/KETL-BodBrella-Rain-Shell-Black-4x5-8.jpg?v=1733942878&width=600",
          description:
            "BodBrella Rain Jacket Packs Into Pocket | Stretchy | Lightweight | 10k Waterproof",
          link: "#",
        },
        {
          title: "PGYTECH Camera Strap",
          image: "",
          description: "",
          link: "#",
        },
        {
          title: "PGYTECH OneMo Travel Backpack",
          image: "https://i.ytimg.com/vi/zIzIbWenL0Q/maxresdefault.jpg",
          description:
            "BodBrella Rain Jacket Packs Into Pocket | Stretchy | Lightweight | 10k Waterproof",
          link: "#",
        },
        // Add more clothing, shoes, accessories here
      ],
    }
  },
  mounted() {
    this.$nextTick(() => {
      const links = this.$refs.gearLink || []

      if (!Array.isArray(links)) return

      links.forEach(link => {
        let href = link.getAttribute("href")
        if (!href || href === "#") return

        try {
          const url = new URL(href, window.location.origin)

          // 👇 Add or update utm_source param
          if (!url.searchParams.has("utm_source")) {
            url.searchParams.append("utm_source", "roamwithjustin")
            link.href = url.toString()
          }

          const hostname = url.hostname
          let eventName = "gear_click"
          let category = "affiliate"
          let label = (
            link.querySelector("h3")?.textContent ||
            link.textContent ||
            ""
          ).trim()

          if (hostname.includes("amazon")) {
            eventName = "amazon_click"
            category = "amazon"
          } else if (
            hostname.includes("djiglobal") ||
            hostname.includes("dji")
          ) {
            eventName = "dji_click"
            category = "dji"
          } else if (hostname.includes("sony")) {
            eventName = "sony_click"
            category = "sony"
          }

          link.addEventListener("click", () => {
            console.log("🔍 Tracking click for:", label, url.toString())
            trackClickEvent({
              url: url.toString(),
              label,
              category,
              eventName,
            })
          })
        } catch (err) {
          console.warn("Invalid link skipped:", href)
        }
      })
    })
  },
}
</script>

<style scoped>
.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem 1rem;
  text-align: center;
}

.page-title {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  color: #fff;
}

.subtitle {
  font-size: 1rem;
  color: #aaa;
  margin-bottom: 3rem;
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  padding-bottom: 3rem;
}

.gallery-card {
  background-color: #1c1c1c;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 0 12px rgba(255, 165, 0, 0.15);
  transition:
    transform 0.3s,
    box-shadow 0.3s;
  cursor: pointer;
  text-decoration: none;
  color: #fff;
}

.gallery-card:hover {
  transform: scale(1.02);
  box-shadow: 0 0 24px rgba(255, 165, 0, 0.35);
}

.card-banner {
  background-position: center;
  background-size: cover;
  height: 160px;
}

.card-content {
  padding: 1rem;
}

.card-content h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #ffa500;
}

.card-content p {
  font-size: 0.9rem;
  color: #ccc;
  margin-top: 0.3rem;
}

.section-heading {
  font-size: 1.4rem;
  color: #ffa500;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 3rem 0 1.5rem;
  border-bottom: 1px solid #333;
  padding-bottom: 0.5rem;
}
</style>
