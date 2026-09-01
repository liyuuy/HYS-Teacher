# 教师工作台 (Teacher Workbench)

一个供教师个人使用的 Web 工作台：今日概览、每日计划、待办事项、课表、教学进度、班级日志。PC 与手机浏览器一套响应式代码，支持 PWA 安装到主屏。

- **前端**：Vue 3（Composition API + `<script setup>`）+ Vite + Vant 4 + Pinia + Vue Router（hash 模式）
- **数据**：Supabase 免费版（PostgreSQL + Auth + PostgREST），前端直连，RLS 行级安全保证数据仅本人可见
- **部署**：GitHub Actions 自动构建并部署到 GitHub Pages

---

## 一、本地运行

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量（复制示例文件并填写）
#    复制 .env.example 为 .env，填入你的 Supabase 配置
copy .env.example .env

# 3. 启动开发服务器
npm run dev
```

浏览器访问 `http://localhost:5173`。

> 注意：未配置 Supabase 时应用仍可打开，但登录/数据功能不可用，请先完成下文 Supabase 配置。

---

## 二、Supabase 后端配置（一次配置，之后免费使用）

### 2.1 注册并创建项目

1. 打开 [supabase.com](https://supabase.com) 注册账号，点击 **New project** 创建新项目。
2. 选择区域（如 `Southeast Asia (Singapore)` 离国内较近）、设置数据库密码。
3. 等待项目初始化完成。

### 2.2 执行建表 SQL

1. 进入项目控制台 → 左侧 **SQL Editor**。
2. 点击 **New query**，把仓库中 [`supabase/schema.sql`](supabase/schema.sql) 的全部内容粘贴进去。
3. 点击 **Run** 执行。脚本会：开启 pgcrypto 扩展、创建 6 张表（profiles / daily_plans / todos / schedule / teaching_progress / class_logs）、为每张表启用 RLS 并创建「仅本人可读写」策略，同时注册新用户自动建资料记录的触发器。

执行成功后，左侧 **Table Editor** 应能看到这 6 张表。

### 2.3 开启邮箱认证

1. 左侧 **Authentication → Providers → Email**，确认 **Enable Sign up** 已开启。
2. 开发阶段可到 **Authentication → Sign In / Up → Email** 关闭「Confirm email」以便注册后直接登录（正式使用建议保留邮箱确认）。

### 2.4 获取 URL 与 anon key

1. 进入 **Project Settings → API**。
2. 复制 `Project URL` 和 `anon public` 的 key。
3. 填入本地 `.env`：

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

> anon key 本身是公开的（浏览器端必须暴露），数据安全由 RLS 保证。**切勿**把 service_role key 填进前端。

---

## 三、部署到 GitHub Pages

### 3.1 创建仓库并推送代码

1. 在 GitHub 新建仓库，例如 `teacher-workbench`（**仓库名需与 vite.config.js 中的 `base` 一致**，详见 3.4）。
2. 把本项目代码推送到 `main` 分支。

### 3.2 配置 Secrets

1. 仓库 → **Settings → Secrets and variables → Actions → New repository secret**。
2. 依次添加两个 Secret（值来自 Supabase Project Settings → API）：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

工作流会在构建时把这两个值写入 `.env`，不会泄露到代码库。

### 3.3 开启 GitHub Pages

1. 仓库 → **Settings → Pages**。
2. **Build and deployment** → **Source** 选择 `Deploy from a branch`。
3. **Branch** 选择 `gh-pages` 与 `/ (root)`，点击 **Save**。

> 首次没有 gh-pages 分支时，先推送一次代码让 Action 生成该分支；也可以在 Pages 设置里 Source 选 `GitHub Actions`（两者皆可）。

### 3.4 调整路由 base（重要）

`vite.config.js` 中：

```js
base: '/',   // 部署在域名根目录（如 user.github.io）时用 '/'
             // 部署在项目子路径（如 https://user.github.io/teacher-workbench/）时改为 '/teacher-workbench/'
```

将 `base` 改为 `/<你的仓库名>/`，否则静态资源 404。

### 3.5 推送触发自动部署

推送 `main` 分支后，**Actions** 页会自动执行 `Deploy to GitHub Pages`，构建产物部署到 `gh-pages` 分支。之后访问 `https://<用户名>.github.io/<仓库名>/` 即可使用。

---

## 四、项目结构

```
教师工作台/
├── .env.example              # 环境变量模板
├── .github/workflows/deploy.yml  # GitHub Actions 自动部署
├── index.html
├── package.json
├── vite.config.js            # Vite + PWA 配置（含 base）
├── supabase/
│   └── schema.sql            # 建表 + RLS SQL（在 Supabase SQL Editor 执行）
├── public/                   # PWA 图标等静态资源
└── src/
    ├── api/supabase.js       # Supabase 客户端封装
    ├── components/           # 公共组件（EmptyState 等）
    ├── router/index.js       # hash 路由 + 登录守卫
    ├── stores/auth.js        # Pinia 登录态
    ├── styles/global.css     # 全局样式（教育蓝主题）
    ├── utils/index.js        # 日期 / 状态等工具函数
    ├── views/                # 8 个页面视图
    │   ├── LoginView.vue
    │   ├── DashboardView.vue   # 今日概览
    │   ├── PlansView.vue       # 每日计划
    │   ├── TodosView.vue       # 待办事项
    │   ├── ScheduleView.vue    # 课表
    │   ├── ProgressView.vue    # 教学进度
    │   ├── LogsView.vue        # 班级日志
    │   └── SettingsView.vue    # 设置
    ├── App.vue               # 布局（PC 左菜单 / 移动端底部 TabBar）
    └── main.js
```

---

## 五、功能一览

| 模块 | 路由 | 说明 |
|---|---|---|
| 登录 / 注册 | `/login` | 邮箱 + 密码，Supabase Auth，刷新不掉线 |
| 今日概览 | `/` | 问候语、今日课表、今日计划快速勾选、未完成/逾期待办 |
| 每日计划 | `/plans` | 日期条切换、增删改、优先级、复制到明天 |
| 待办事项 | `/todos` | 教学/班主任/其他分类、视图切换、逾期标红、完成置灰划线 |
| 课表 | `/schedule` | 学期切换、12 节 × 7 天周视图、点击增删改、只看今天 |
| 教学进度 | `/progress` | 按课程分组、章节状态流转、总体进度百分比 |
| 班级日志 | `/logs` | 时间线、类型筛选、增删改 |
| 设置 | `/settings` | 账号信息、JSON 导出/导入备份、登出 |

## 六、验收自检清单

- [ ] 注册新账号 → 自动登录或跳转登录，可正常登录
- [ ] 5 个业务模块（计划/待办/课表/进度/日志）增删改查正常
- [ ] 课表周视图 12 节 × 7 天渲染正确，点击空格新增、点击课程编辑/删除
- [ ] 今日概览正确聚合当日课表、当日计划、未完成/逾期待办，勾选快速完成
- [ ] 手机（<768px）显示底部 TabBar，PC（≥768px）显示左侧固定菜单
- [ ] PWA 可安装（Android Chrome / 桌面浏览器提示“添加到主屏”），离线打开缓存壳
- [ ] 数据仅本人可见（用两个账号分别登录互不可见）
- [ ] `npm run build` 无报错
