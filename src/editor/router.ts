import { createRouter, createWebHistory } from 'vue-router'
import EditorPage from './pages/EditorPage.vue'
import ScenePage from './pages/ScenePage.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'scene', component: ScenePage },
    { path: '/editor', name: 'editor', component: EditorPage },
  ],
})
