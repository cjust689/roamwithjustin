<template>
  <div>
    <div class="parallax-container">
      <div class="parallax">
        <iframe
          id="ytplayer"
          class="embed-responsive-item"
          type="text/html"
          width="1920"
          height="1080"
          src="https://www.youtube.com/embed/EQBWmtXlKcM?playlist=EQBWmtXlKcM&loop=1&autoplay=1&controls=1&showinfo=0&mute=1"
          frameborder="0"
        ></iframe>
      </div>
    </div>
  </div>
</template>

<script>
import M from "../js/materialize"
export default {
  name: "VueFooter",
  mounted() {
    M.AutoInit()
  },
}
</script>
<style scoped></style>
