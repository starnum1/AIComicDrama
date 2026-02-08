import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/LoginView.vue'),
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/auth/RegisterView.vue'),
  },
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/views/dashboard/DashboardView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/project/:id',
    name: 'Project',
    component: () => import('@/views/project/ProjectView.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: { name: 'ProjectOverview' } },
      {
        path: 'overview',
        name: 'ProjectOverview',
        component: () => import('@/views/project/OverviewPanel.vue'),
      },
      {
        path: 'episodes',
        name: 'ProjectEpisodes',
        component: () => import('@/views/project/EpisodesPanel.vue'),
      },
      {
        path: 'assets',
        name: 'ProjectAssets',
        component: () => import('@/views/project/AssetsPanel.vue'),
      },
      {
        path: 'storyboard/:episodeId',
        name: 'ProjectStoryboard',
        component: () => import('@/views/project/StoryboardPanel.vue'),
      },
      {
        path: 'generation',
        name: 'ProjectGeneration',
        component: () => import('@/views/project/GenerationPanel.vue'),
      },
      {
        path: 'preview',
        name: 'ProjectPreview',
        component: () => import('@/views/project/PreviewPanel.vue'),
      },
    ],
  },
  {
    path: '/billing',
    name: 'Billing',
    component: () => import('@/views/billing/BillingView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/settings/ai-providers',
    name: 'AiProviders',
    component: () => import('@/views/settings/AiProvidersView.vue'),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 路由守卫
router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('token')
  if (to.meta.requiresAuth && !token) {
    next({ name: 'Login' })
  } else {
    next()
  }
})

export default router
