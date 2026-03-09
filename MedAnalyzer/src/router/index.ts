import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { routePrefix: '', hideNav: false },
    },
    {
      path: '/project/:uuid',
      name: 'project',
      component: () => import('../views/ProjectView.vue'),
      props: true,
      meta: { routePrefix: '', hideNav: false },
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue'),
      meta: { routePrefix: '', hideNav: false },
    },
    {
      path: '/client',
      name: 'client-home',
      component: HomeView,
      meta: { routePrefix: '/client', hideNav: true },
    },
    {
      path: '/client/project/:uuid',
      name: 'client-project',
      component: () => import('../views/ProjectView.vue'),
      props: true,
      meta: { routePrefix: '/client', hideNav: true },
    },
    {
      path: '/client/about',
      name: 'client-about',
      component: () => import('../views/AboutView.vue'),
      meta: { routePrefix: '/client', hideNav: true },
    },
  ],
})

export default router
