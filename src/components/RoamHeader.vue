<template>
  <div>
    <nav style="position: fixed; width: 100%; z-index: 1000">
      <div class="container nav-wrapper">
        <router-link
          class="logo black-text"
          to="/roam"
          exact
          :class="$route.path === '/roam' ? 'no-active-style' : ''"
        >
          ROAM
        </router-link>

        <!-- Desktop Links -->
        <ul class="right hide-on-med-and-down">
          <li><router-link class="black-text" to="/roam">Home</router-link></li>
          <li>
            <router-link class="black-text" to="/roam/trips"
              >Travel Guides</router-link
            >
          </li>
          <li>
            <router-link class="black-text" to="/roam/gear">Gear</router-link>
          </li>
          <li>
            <router-link class="black-text" to="/roam/about">About</router-link>
          </li>
          <li>
            <router-link class="black-text" to="/roam/affiliates"
              >Affiliates</router-link
            >
          </li>
        </ul>

        <!-- Burger Icon -->
        <a
          class="sidenav-trigger hide-on-large-only"
          @click="menuOpen = !menuOpen"
        >
          <i class="material-icons black-text">menu</i>
        </a>
      </div>
    </nav>

    <!-- Mobile Nav -->
    <ul v-if="menuOpen" class="mobile-nav">
      <li>
        <router-link class="black-text" to="/roam" @click="closeMenu"
          >Home</router-link
        >
      </li>
      <li>
        <router-link class="black-text" to="/roam/trips" @click="closeMenu"
          >Blog</router-link
        >
      </li>
      <li>
        <router-link class="black-text" to="/roam/gear" @click="closeMenu"
          >Gear</router-link
        >
      </li>
      <li>
        <router-link class="black-text" to="/roam/about" @click="closeMenu"
          >About</router-link
        >
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  name: "RoamHeader",
  data() {
    return {
      menuOpen: false,
    }
  },

  methods: {
    closeMenu() {
      this.menuOpen = false
    },
  },
}
</script>

<style scoped>
.mobile-nav {
  position: absolute;
  top: 60px;
  width: 100%;
  background-color: #fff;
  padding: 1rem;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  z-index: 999;
}
.mobile-nav li {
  margin-bottom: 1rem;
}
.sidenav-trigger {
  display: none;
}
@media screen and (max-width: 992px) {
  .sidenav-trigger {
    display: block;
    float: right;
    margin-top: 10px;
  }
}
body {
  padding-top: 60px;
}
</style>
