# MedImgAiAnalyzer的前端代码仓库

#### **ui库使用NaiveUI**
#### **图标使用NaiveUI配套的xicons**

#### 不开后端运行时dev环境报错是feature, do not fix
---

# 文档


- [前端项目介绍.md](前端项目介绍.md)
- [api文档](https://github.com/Rare-Specie/MedImgAIAnalyzer-cppServer/blob/main/Api.md)

---

## 快速上手vue3来编辑此项目

请见[这个](MedAnalyzer/README.md)文档  
可以通过[这个](https://www.bilibili.com/video/BV13tjqzmEDZ)视频快速上手

---

### vue3 的 基础文件构成
```
your-vue3-project/          # 项目根目录
├── node_modules/           # 项目依赖包（npm install 生成）
├── public/                 # 静态资源目录（不会被 Vite 处理）
│   └── favicon.ico         # 网站图标
├── src/                    # 项目源代码核心目录（90% 开发工作在这里）
│   ├── assets/             # 静态资源（会被 Vite 编译处理，如图片、样式、字体）
│   │   ├── logo.svg
│   │   └── main.css
│   ├── components/         # 通用组件目录（可复用的 Vue 组件）
│   │   └── HelloWorld.vue
│   ├── router/             # 路由配置目录（Vue Router）
│   │   └── index.js        # 路由核心配置文件
│   ├── stores/             # 状态管理目录（Pinia，Vue3 推荐替代 Vuex）
│   │   └── counter.js      # 示例 Pinia store
│   ├── views/              # 页面级组件目录（对应路由的页面）
│   │   ├── AboutView.vue
│   │   └── HomeView.vue
│   ├── App.vue             # 根组件（所有页面/组件的父容器）
│   └── main.js             # 项目入口文件（创建、挂载 Vue 实例）
├── .gitignore              # Git 忽略文件配置（如 node_modules、dist 等）注：被我放到根目录了
├── index.html              # 项目入口 HTML（Vite 特有，替代 Vue2 的 public/index.html 核心作用）
├── package.json            # 项目配置文件（依赖、脚本命令、项目信息）
├── package-lock.json       # 依赖版本锁定文件（确保多人开发依赖版本一致）
├── README.md               # 项目说明文档
├── vite.config.js          # Vite 构建配置文件（如代理、别名、插件等）
└── tsconfig.json           # TypeScript 配置文件（如果启用了 TS）
```

## vue3 的 基本写法
```
<template>
  <!-- 1. 模板区：HTML 结构，Vue 模板语法 -->
  <div class="demo-component">
    <h1>{{ title }}</h1>
    <button @click="handleClick">点击计数</button>
    <p>计数：{{ count }}</p>
  </div>
</template>

<script setup lang="ts">
  // 2. 脚本区：逻辑代码（Vue3 推荐 <script setup> 语法）
  // lang="ts" 可选，开启 TypeScript 支持
  
  // 1. 导入依赖（按需导入）
  import { ref, computed, onMounted } from 'vue'
  // 导入其他组件/工具函数
  import ChildComponent from './ChildComponent.vue'
  import { formatTime } from '@/utils/format'

  // 2. 定义 Props（类型约束）
  const props = defineProps({
    title: {
      type: String,
      default: '默认标题'
    }
  })

  // 3. 定义 Emits（事件派发）
  const emit = defineEmits(['change', 'confirm'])

  // 4. 响应式数据（Composition API）
  const count = ref(0)

  // 5. 计算属性
  const doubleCount = computed(() => count.value * 2)

  // 6. 方法/事件处理函数
  const handleClick = () => {
    count.value++
    // 派发事件给父组件
    emit('change', count.value)
  }

  // 7. 生命周期钩子
  onMounted(() => {
    console.log('组件挂载完成', doubleCount.value)
  })

  // 8. 暴露给模板/父组件的内容（可选）
  defineExpose({
    count,
    handleClick
  })
</script>

<style scoped lang="scss">
  /* 3. 样式区：组件样式 */
  // scoped：样式仅作用于当前组件
  // lang="scss"：可选，支持 SCSS/SASS 预处理器
  .demo-component {
    padding: 20px;
    h1 {
      color: #42b983;
    }
    button {
      margin: 10px 0;
      padding: 6px 12px;
      cursor: pointer;
    }
  }
</style>
```