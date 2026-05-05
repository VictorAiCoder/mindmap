// src/main.js
import { createApp } from 'vue'
import App from './app/App.vue'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'
// import 'highlight.js/styles/atom-one-dark.css'
// import 'highlight.js/styles/github.css'
import 'highlight.js/styles/github-dark.css'

const vuetify = createVuetify({
  components,
  directives,
})

createApp(App).use(vuetify).mount('#app')