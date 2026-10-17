import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './editor/App.vue'
import { router } from './editor/router'
import './style.css'

const app = document.querySelector('#app')
if (!app) throw new Error('Missing #app')

createApp(App).use(createPinia()).use(router).mount(app)
