// src/editor/main.ts — thin entry point, delegates to embed composables
import { createApp } from 'vue'
import { createVuetify } from 'vuetify'
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import App from './App.vue'

const vuetify = createVuetify({
  icons: { defaultSet: 'mdi' },
})

createApp(App).use(vuetify).mount('#app')
