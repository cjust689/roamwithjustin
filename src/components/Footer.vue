<template>
  <div class="grey darken-4 footer">
    <div class="grey darken-4 center-align valign-wrapper footerBanner">
      <div class="row">
        <div class="col s12">
          <h5 class="grey-text darken-4">{{ randomQuote() }}</h5>
        </div>
      </div>
    </div>
    <div class="">
      <h6 class="black-text center-align yellow darken-2">
        &copy; {{ new Date().getFullYear() }} Roam with Justin
      </h6>
    </div>
  </div>
</template>
<script>
import { randomQuote } from "../js/functions"
import M from "../js/materialize"
export default {
  name: "VueFooter",
  mounted() {
    M.AutoInit()
  },
  methods: {
    randomQuote,
  },
}
</script>
<style scoped>
.footer {
  background-color: #f2b632;
  text-align: center;
  padding: 1rem 0;
  flex-shrink: 0;
  width: 100%;
}
</style>
