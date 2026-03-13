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
    {
      path: '/temp/preprocess',
      name: 'temp-preprocess',
      component: () => import('../views/TempQuickModuleView.vue'),
      meta: { routePrefix: '', hideNav: false, tempModule: 'preprocess' },
    },
    {
      path: '/temp/:uuid/preprocess',
      name: 'temp-preprocess-uuid',
      component: () => import('../views/TempQuickModuleView.vue'),
      meta: { routePrefix: '', hideNav: false, tempModule: 'preprocess' },
      props: true,
    },
    {
      path: '/temp/analysis',
      name: 'temp-analysis',
      component: () => import('../views/TempQuickModuleView.vue'),
      meta: { routePrefix: '', hideNav: false, tempModule: 'analysis' },
    },
    {
      path: '/temp/:uuid/analysis',
      name: 'temp-analysis-uuid',
      component: () => import('../views/TempQuickModuleView.vue'),
      meta: { routePrefix: '', hideNav: false, tempModule: 'analysis' },
      props: true,
    },
    {
      path: '/temp/reconstruction',
      name: 'temp-reconstruction',
      component: () => import('../views/TempQuickModuleView.vue'),
      meta: { routePrefix: '', hideNav: false, tempModule: 'reconstruction' },
    },
    {
      path: '/temp/:uuid/reconstruction',
      name: 'temp-reconstruction-uuid',
      component: () => import('../views/TempQuickModuleView.vue'),
      meta: { routePrefix: '', hideNav: false, tempModule: 'reconstruction' },
      props: true,
    },
    {
      path: '/temp/consult',
      name: 'temp-consult',
      component: () => import('../views/TempQuickModuleView.vue'),
      meta: { routePrefix: '', hideNav: false, tempModule: 'consult' },
    },
    {
      path: '/temp/:uuid/consult',
      name: 'temp-consult-uuid',
      component: () => import('../views/TempQuickModuleView.vue'),
      meta: { routePrefix: '', hideNav: false, tempModule: 'consult' },
      props: true,
    },
    {
      path: '/client/temp/preprocess',
      name: 'client-temp-preprocess',
      component: () => import('../views/TempQuickModuleView.vue'),
      meta: { routePrefix: '/client', hideNav: true, tempModule: 'preprocess' },
    },
    {
      path: '/client/temp/:uuid/preprocess',
      name: 'client-temp-preprocess-uuid',
      component: () => import('../views/TempQuickModuleView.vue'),
      meta: { routePrefix: '/client', hideNav: true, tempModule: 'preprocess' },
      props: true,
    },
    {
      path: '/client/temp/analysis',
      name: 'client-temp-analysis',
      component: () => import('../views/TempQuickModuleView.vue'),
      meta: { routePrefix: '/client', hideNav: true, tempModule: 'analysis' },
    },
    {
      path: '/client/temp/:uuid/analysis',
      name: 'client-temp-analysis-uuid',
      component: () => import('../views/TempQuickModuleView.vue'),
      meta: { routePrefix: '/client', hideNav: true, tempModule: 'analysis' },
      props: true,
    },
    {
      path: '/client/temp/reconstruction',
      name: 'client-temp-reconstruction',
      component: () => import('../views/TempQuickModuleView.vue'),
      meta: { routePrefix: '/client', hideNav: true, tempModule: 'reconstruction' },
    },
    {
      path: '/client/temp/:uuid/reconstruction',
      name: 'client-temp-reconstruction-uuid',
      component: () => import('../views/TempQuickModuleView.vue'),
      meta: { routePrefix: '/client', hideNav: true, tempModule: 'reconstruction' },
      props: true,
    },
    {
      path: '/client/temp/consult',
      name: 'client-temp-consult',
      component: () => import('../views/TempQuickModuleView.vue'),
      meta: { routePrefix: '/client', hideNav: true, tempModule: 'consult' },
    },
    {
      path: '/client/temp/:uuid/consult',
      name: 'client-temp-consult-uuid',
      component: () => import('../views/TempQuickModuleView.vue'),
      meta: { routePrefix: '/client', hideNav: true, tempModule: 'consult' },
      props: true,
    },
  ],
})

export default router
