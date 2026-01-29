import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import naive from 'naive-ui'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(naive) // register Naive UI globally

// NOTE: xicons is added to dependencies — import individual icons where needed
// Example (do this in the component that uses the icon):
// import { IconName } from '@xicons/vue'

// Temporary — force light theme across the app (easy to remove later)
document.documentElement.setAttribute('data-theme', 'light')
// Hint for the UA (form controls, scrollbars, etc.)
document.documentElement.style.colorScheme = 'light'

app.mount('#app')
