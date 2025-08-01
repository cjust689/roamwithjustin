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
          link: "https://amzn.to/46EHiXS",
        },
        {
          title: "Sony A6700",
          image: "https://www.50mm.vn/wp-content/uploads/2023/06/sonya6700.jpg",
          description:
            "My main photography camera for both commercial and travel shoots.",
          link: "https://amzn.to/3UIcApi",
        },

        {
          title: "Sony A6500",
          image:
            "https://shotkit.com/wp-content/uploads/2018/12/Sony_a6500_review_18.jpg",
          description:
            "My main underwater camera for both commercial and travel shoots.",
          link: "https://amzn.to/45gTVpw",
        },
        {
          title: "Tamron 17-70mm f/2.8",
          image:
            "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6392/6392524_sd.jpg;maxHeight=1080;maxWidth=900?format=webp",
          description: "My go-to ultra-wide lens for landscapes and vlogging.",
          link: "https://amzn.to/4fi2TYn",
        },
        {
          title: "Tamron 35-150mm f/2.0 - f/2.8",
          image:
            "https://cloudfront.slrlounge.com/wp-content/uploads/2023/02/tamron-35-150mm-f2-2.8-review-04.jpg",
          description: "My go-to portrait and telephoto lens.",
          link: "https://amzn.to/46yuhyX",
        },
        {
          title: "Sony 24mm f/1.4 GM",
          image:
            "https://d1ncau8tqf99kp.cloudfront.net/converted/101549_original_local_1200x1050_v3_converted.webp",
          description:
            "Love this for gimbal cineamtic work and low light shots",
          link: "https://amzn.to/4fjplQS",
        },
        {
          title: "Sony 200-600mm f/5.6-6.3 G OSS",
          image: "https://i.ytimg.com/vi/T0PQ73J6Dmc/maxresdefault.jpg",
          description:
            "Amazing for wildlife and sports photography, and airshows.",
          link: "https://amzn.to/4lWEwSk",
        },
        {
          title: "SeaFrogs Salted Line for Sony A6xxx",
          image:
            "https://www.saltedline.com/cdn/shop/files/Salted-Line-waterproof-housing-f_492efdda-8462-4c56-89e7-08db26a7e5c3_550x.jpg?v=1738037419",
          description:
            'SeaFrogs UW housing for Sony A6xxx series Salted Line with 6" Dry dome port (Orange) / GEN 3',
          link: "https://amzn.to/3IV93l0",
        },
        {
          title: "PeakDesign Carbon Fiber Tripod",
          image:
            "https://cdn.shopify.com/s/files/1/0014/6262/0920/products/PeakDesign-Carbon-Fiber-Travel-Tripod-Black-1_1200x.jpg?v=1670528856",
          description:
            "My go-to tripod for both commercial and travel shoots, lightweight and easy to travel with.",
          link: "https://amzn.to/4l9YBUi",
        },
        {
          title: "Atomos Shinobi II",
          image:
            "https://www.televisual.com/wp-content/uploads/atomos-shinobi-2-5-640x360.jpg",
          description: "My primary monitor with full camera control.",
          link: "https://amzn.to/3IXN252",
        },
        {
          title: "DJI Air 3",
          image:
            "https://www.cined.com/content/uploads/2023/07/DJI-Air-3-review-cameras.jpg",
          description: "My go-to drone for dynamic aerial storytelling.",
          link: "https://amzn.to/45fmWSG",
        },
        {
          title: "DJI Avata 2",
          image:
            "https://cdn.mos.cms.futurecdn.net/m29yaaAj4S8mjLiMuvaZGU-1920-80.jpg.webp",
          description: "My go-to drone for FPV cinematic flying.",
          link: "https://amzn.to/3GQyNhW",
        },
        {
          title: "Neewer Affiliate",
          image:
            "data:image/png;base64,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",
          description: "NEEWER Photography Gear",
          link: "http://www.awin1.com/cread.php?awinmid=117019&awinaffid=1950515",
        },
      ],
      adventureGear: [
        {
          title: "Wife's Adventure Swimsuit",
          image: "/img/roam/DSC00311.jpg",
          description: "Featured in many of our snorkeling reels.",
          link: "https://amzn.to/3Uar8xY",
        },
        {
          title: "Wife's Adventure Swimsuit - Rogue Season Leto",
          image: "/img/locations/puerto-rico/shack-4.jpg",
          description: "Featured in many of our tropical reels — linked here.",
          link: "https://rogueseason.com/collections/leto",
        },
        {
          title: "Solamon Techphibian 5",
          image:
            "https://cdn.shopify.com/s/files/1/0014/6262/0920/products/Solamon-Techphibian-5-Black-1_1200x.jpg?v=1670528856",
          description: "My got to water and hiking shoes for all adventures.",
          link: "https://www.salomon.com/en-us/product/techamphibian-5-li3107",
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
          link: "https://ketlmtn.com/?ref=otxbzshy",
        },
        {
          title: "PGYTECH Camera Strap",
          image: "",
          description: "",
          link: "https://amzn.to/4fmeUvR",
        },
        {
          title: "PGYTECH OneMo Travel Backpack",
          image: "https://i.ytimg.com/vi/zIzIbWenL0Q/maxresdefault.jpg",
          description:
            "BodBrella Rain Jacket Packs Into Pocket | Stretchy | Lightweight | 10k Waterproof",
          link: "https://amzn.to/4fetYvg",
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
