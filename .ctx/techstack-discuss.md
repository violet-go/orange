# PeelPack 技术架构讨论

## 整体架构定位

PeelPack 采用前后端分离的单体架构。前端使用 TanStack Start（底层基于 Vite）配合 React 和 TanStack 生态（Query/Router），后端使用 Bun 运行时搭配 Hono 框架。前后端之间没有 BFF 层，前端直接通过 GraphQL 与后端通信，利用其类型系统作为契约保证，同时使用 Subscription 特性实现生成进度的实时推送。开发环境下前端运行在 TanStack Start dev server (5173)，后端运行在 Bun (3000)，通过 CORS 跨域通信；生产环境下前端构建为静态文件由 Hono 统一服务，所有请求汇聚到单一端口，自然解决跨域问题。

这种架构的核心思想是保持简单。单体部署意味着不需要处理分布式系统的复杂性（服务发现、负载均衡、跨服务事务），所有代码在一个仓库中演进，部署是一个进程的启动。前后端分离则保证了关注点的清晰——前端专注交互体验和 UI 渲染，后端专注业务逻辑（用户认证、Prompt 组装、Job 管理）和第三方集成（图片生成 API）。GraphQL 作为中间的粘合层，既提供了强类型约束，又通过 Subscription 满足了实时通信需求。整个架构中不存在传统企业级架构中的 BFF（Backend For Frontend）层，这是周末项目的务实选择——前端直接调用后端，保持最短的请求链路。

## 前端框架选择：TanStack Start

TanStack Start 是一个全栈 React 框架，类似于 Next.js 或 Remix 的定位，但更贴近 TanStack 生态。准确来说，TanStack Start 是应用框架层，Vite 是它使用的构建工具层——就像 Next.js 可以选择 Webpack 或 Turbopack 一样，TanStack Start 推荐使用 Vite 作为底层构建引擎。

选择 TanStack Start 的核心理由是文件路由和端到端类型安全。文件路由让路由配置从手动编写变成目录结构的自然映射（`app/routes/projects/$id.tsx` 自动对应 `/projects/:id`），类型安全让 loader 返回值自动推导到组件中（不需要手写接口定义）。这种开发体验在快速迭代的周末项目中价值巨大——省下的配置时间可以用来打磨产品细节。

值得说明的是，TanStack Start 目前还处于 Beta 阶段（截至 2025 年初）。对于生产项目这可能是风险，但对于周末项目这恰恰是机会。Beta 阶段意味着 API 可能变动、文档可能不全、某些边缘情况可能有 bug，但这些"风险"在学习场景中都是收益——深入理解框架设计、成为早期贡献者、等技术成熟时已经是专家。更重要的是，TanStack 生态（Router/Query/Table/Form）代表了 React 工具链的未来方向，现在投资学习是值得的。

实际的技术分层是这样的：应用框架层使用 TanStack Start（提供文件路由、数据加载、类型安全），UI 层使用 React + TanStack Query（数据获取和缓存），构建工具层使用 Vite（开发服务器、HMR、生产构建）。这三层各司其职，TanStack Start 负责应用结构，TanStack Query 负责与 GraphQL 通信，Vite 负责构建优化。如果未来遇到 TanStack Start 的不可解决问题，降级到纯 Vite + 手动配置 TanStack Router 的迁移成本也不高——路由逻辑基本不变，只是从文件约定改回手动配置。

## 用户认证与身份管理

用户系统通过 Better Auth 快速集成在 Hono 后端，支持邮箱登录和主流 OAuth 提供商（Google/GitHub 等）。这个选择基于务实考虑：Better Auth 是现代的、类型安全的认证方案，与 Bun/Hono 生态契合良好，提供开箱即用的 session 管理、token 刷新、多因素认证等能力，避免了自己实现认证系统的安全风险和时间成本。

用户身份是持久化的，每个用户拥有独立的 userId，所有生成的 project 和图片都归属于特定用户。这意味着用户可以跨设备登录访问自己的历史作品，也为未来可能的协作、分享功能预留了空间。认证状态通过 HTTP-only cookie 维护，前端通过 GraphQL context 自动获取当前用户信息，不需要手动传递 token。所有认证逻辑都在 Hono 后端处理，前端只负责展示登录界面和处理认证回调。

## 数据模型与存储策略

核心数据模型围绕三个实体展开：User（用户）、Project（项目，即一套贴纸）、Image（单张图片）。User 包含认证信息和基本资料，由 Better Auth 管理；Project 记录一次生成任务的元数据——输入内容（文字描述或图片引用）、选择的风格、生成时间、当前状态；Image 记录单张图片的详细信息——所属的 project、情绪类型（九宫格中的具体位置或意外标记）、生成时使用的 Prompt、文件存储路径、生成状态（pending/success/failed）。

这些元数据存储在 SQLite 数据库中，采用直接 SQL 而非 ORM 的方式操作。这个选择基于 YAGNI 原则：当前的查询需求简单（按用户查询 project 列表、按 project 查询图片列表），不需要 ORM 的复杂关联和懒加载能力。直接 SQL 代码更直观、性能更可控、依赖更少。等到真正需要迁移到 PostgreSQL 时（比如需要多实例部署或复杂的全文搜索），再考虑引入 Drizzle 或 Prisma 来降低迁移成本。

图片文件本身存储在 data/ 目录下，按照 `{userId}/{projectId}/{imageId}.png` 的路径式结构组织。这种结构的好处是清晰的逻辑隔离——每个用户的数据在文件系统层面就是独立的，每个 project 的图片聚合在一个文件夹中，方便打包下载。对象存储抽象层提供统一的 put/get/delete/list/getUrl 接口，当前实现基于本地文件系统，未来可以无缝切换到 S3 或其他云存储。getUrl 方法在开发环境返回指向后端静态文件服务的 URL，生产环境返回相对路径（因为前后端同源）。

## 业务逻辑的组织

gen 和 edit 两个核心模块在前端呈现为不同的交互入口，但在后端共享相同的图片生成抽象层。gen 模块接收用户输入（文字、图片或混合），结合选择的风格，生成一套完整的贴纸（9 张预设情绪 + 7 张随机卡池抽取）；edit 模块接收已有图片，应用新的风格转换，输出单张或多张风格化图片。两者的区别在于业务逻辑层——gen 需要根据情绪类型和意外池构造 16 个不同的 Prompt，edit 只需要构造风格转换的 Prompt。

业务逻辑集中在后端而非前端。当用户点击"生成"按钮时，前端通过 GraphQL Mutation 发送请求，携带输入内容和风格选择，后端接收后创建一个 Project 记录和 16 个 Image 记录（初始状态为 pending），返回 jobId。后端随即启动异步任务，并发调用第三方图片生成 API 16 次，每完成一张就更新对应的 Image 状态，并通过 GraphQL Subscription 推送进度更新给前端。如果某张图片生成失败，后端自动重试一次；如果重试仍然失败，标记该 Image 为 failed 状态，但不阻塞其他图片的生成。最终无论成功多少张，都返回部分结果。

这种设计的核心是容错和用户体验。90 秒内生成 16 张图片，即使某张失败，用户依然能拿到 15 张可用的贴纸。前端通过 Subscription 实时看到进度条更新（"正在生成第 3 张..."），而不是傻等 90 秒。如果用户中途刷新页面或关闭浏览器，Job 依然在后端执行，因为状态持久化在 SQLite 中。用户重新登录后，前端先通过 Query 获取该 Job 的当前状态，如果还在进行中，重新 Subscribe 接收后续更新。

## Prompt 模板的配置化

九宫格情绪、意外池、风格预设都采用配置文件管理，而非硬编码在代码中。九宫格的 9 种情绪（happy, sad, angry, surprised, thinking, shy, proud, tired, love）对应 9 个 Prompt 模板片段，存储在 `config/emotions.json` 中，每个片段描述该情绪的视觉表现（"happy expression with bright eyes and smile"）。意外池是一个包含 50+ 种有趣动作或场景的列表，存储在 `config/surprises.json`，每次生成时后端随机抽取 7 个（"waving hand", "eating snack", "reading book", "wearing sunglasses"...）。

风格预设通过后端 GraphQL Query 动态返回，前端根据返回的列表渲染 UI 按钮。每个风格包含 id、displayName、description、promptTemplate 四个字段。promptTemplate 是一段 Prompt 片段（"anime style, soft pastel colors, clean line art"），在实际生成时会与情绪 Prompt 和用户输入组合成完整的 Prompt。这种设计的好处是灵活——产品团队可以快速调整风格库，添加新风格只需要修改配置文件和数据库，不需要改动代码；前端永远展示最新的风格列表，不会出现前后端不一致的问题。

用户可以选择预设风格，也可以在 Prompt 输入框中自己编写。当用户选择预设风格后，输入框自动填充对应的 promptTemplate，用户可以在此基础上修改。这种"预设为主、自定义为辅"的策略平衡了易用性和灵活性。

## 图片生成的抽象层

第三方图片生成 API 千差万别——Google Nano Banana（优先选择）、OpenAI GPT Image、Stability AI、Midjourney API 等——每个都有不同的请求格式、参数结构、返回方式。PeelPack 不应该让业务逻辑耦合到某个特定的 API，而是定义一个统一的抽象接口，由适配器层负责转换。

抽象接口非常简单：`generate(params: GenerateParams): Promise<GenerateResult>`。GenerateParams 包含 prompt（文字描述）、referenceImage（可选的参考图片）、style（风格参数）、seed（随机种子，用于可复现的生成）。GenerateResult 包含 imageUrl（生成的图片 URL 或 base64）、metadata（模型返回的额外信息）。

不同的模型提供商通过适配器实现这个接口。Google Nano Banana 适配器将 GenerateParams 转换为其特定的 API 格式，调用后将返回的结果包装成 GenerateResult。OpenAI、Stability 等其他适配器则各自转换为对应的格式，处理不同的参数命名和响应结构。后端通过配置决定使用哪个适配器，切换模型提供商只需要修改配置，不需要改动业务逻辑代码。MVP 阶段优先使用 Google Nano Banana 作为默认模型。

这个抽象层也是未来支持多模型的基础。可以让用户在生成时选择不同的底层模型（"使用 DALL-E" vs "使用 Stable Diffusion"），或者根据风格自动选择最合适的模型（日系动漫风格用 A 模型，写实风格用 B 模型）。抽象层隔离了这些复杂度，业务逻辑只关心"生成一张符合 Prompt 的图片"，不关心背后是谁在生成。

## GraphQL Schema 与实时通信

GraphQL Schema 定义了前后端的完整契约。核心的 Type 包括 User、Project、Image、Style、Job。Query 提供数据读取能力：`me`（当前用户信息）、`projects`（用户的 project 列表）、`project(id)`（单个 project 详情）、`styles`（可用风格列表）、`job(id)`（生成任务状态）。Mutation 提供数据修改能力：`createProject(input)`（发起生成任务）、`deleteProject(id)`（删除 project）、`retryImage(id)`（重新生成失败的图片）。Subscription 提供实时推送：`jobProgress(jobId)`（订阅生成进度更新）。

Subscription 基于 WebSocket 实现，当用户创建 project 后，前端立即 subscribe `jobProgress(jobId)`，后端每完成一张图片就推送一条消息，包含当前进度（已完成数量、总数量）、最新完成的图片信息、整体状态（generating/completed/partial_failed）。前端根据这些消息更新 UI——进度条前进、新图片逐个显示、失败的位置标记"重试"按钮。

WebSocket 连接的生命周期与页面绑定，刷新或关闭页面会断开连接。但 Job 的状态独立于连接存在，持久化在 SQLite 中。用户重新进入页面时，前端先 Query `job(id)` 获取当前状态，如果 status 还是 generating，重新 Subscribe；如果已经是 completed 或 partial_failed，直接展示结果。这种设计让实时通信成为"锦上添花"而非"必需品"——有 WebSocket 时体验更好，没有时依然能正常工作。

## 异步任务的执行模型

后端接收到 createProject 请求后，立即返回 jobId，不阻塞等待生成完成。真正的生成工作在后台异步执行。Bun 的并发模型基于事件循环和 Promise，非常适合这种 I/O 密集型任务。后端并发发起 16 个图片生成请求，使用 `Promise.allSettled` 而非 `Promise.all`，这样即使某个请求失败也不会影响其他请求。

每个请求完成后（无论成功或失败），立即更新数据库中对应的 Image 记录，并通过 GraphQL Subscription 推送更新。如果失败，自动触发一次重试——使用相同的 Prompt 但不同的 seed（增加随机性，避免重复失败）。重试后如果还是失败，标记为 failed，记录错误信息，不再尝试。

整个 Job 的状态根据 16 张 Image 的状态聚合计算：如果所有 Image 都是 success，Job 状态为 completed；如果有部分 failed，Job 状态为 partial_failed；如果还有 pending，Job 状态为 generating。前端根据 Job 状态决定如何展示——completed 显示"生成完成"，partial_failed 显示"部分失败，可重试"，generating 显示进度条。

## Project 的 Remix 机制

每次生成都创建新的 Project，而非覆盖旧的。这种设计定义为"Remix"概念——用户可以基于相同的输入，尝试不同的风格，或者生成多次获得不同的随机意外表情，每次 Remix 都是一个独立的 Project。

Project 的元数据记录了这次生成的所有输入参数：inputType（text/image/mixed）、inputContent（文字描述或图片路径）、styleId（选择的风格）、customPrompt（用户自定义的 Prompt，如果有）、seed（随机种子）、createdAt（创建时间）。如果是基于已有 Project 的 Remix，还会记录 remixFromId（源 Project 的 ID），形成 Remix 链条。

这种设计的好处是保留了创作历史。用户可以回顾自己尝试过的所有版本，对比不同风格的效果，挑选最满意的那一套。未来可以在 UI 中展示 Remix 关系图，让用户看到自己的创作演化路径。每个 Project 都是完整独立的，删除某个 Project 不会影响其他 Remix 版本。

## 相框的前端实现

"小贴纸机"的相框效果在前端通过 Canvas 实现，保留原始图片不做修改。当用户浏览生成的贴纸时，前端加载原始 PNG，在 Canvas 上绘制，添加预设的边框效果（白色描边、圆角、阴影等），渲染到页面上。用户下载或分享时，可以选择下载原图（不带边框）或带边框的版本（通过 Canvas.toBlob 导出）。

这种设计的优势是灵活。相框样式可以是多种选择（简约白边、复古胶片、可爱圆角...），用户可以在同一套贴纸上尝试不同相框，实时预览效果，不需要重新生成图片。前端可以提供"相框编辑器"，让用户调整边框宽度、颜色、圆角大小，甚至添加文字或贴纸。所有这些都是非破坏性的——原始图片始终保持完整，相框只是视觉层的装饰。

技术实现上，使用 Canvas API 的 drawImage 绘制原图，再用 strokeRect 或路径 API 绘制边框。性能足够好，即使是 16 张图片同时渲染相框，现代浏览器也能流畅处理。未来如果需要更复杂的效果（滤镜、动画边框），可以考虑引入 Fabric.js 或 Konva.js，但 MVP 阶段原生 Canvas 就足够。

## 对象存储的抽象与实现

对象存储抽象层定义了五个方法：put（上传）、get（下载）、delete（删除）、list（列举）、getUrl（获取访问 URL）。当前实现基于本地文件系统，put 方法将 Buffer 写入 `data/{userId}/{projectId}/{imageId}.png`，get 方法读取文件返回 Buffer，delete 方法删除文件，list 方法扫描目录返回文件名列表，getUrl 方法返回静态文件服务的路径（开发环境是 `http://localhost:3000/data/...`，生产环境是 `/data/...`）。

未来切换到云存储（如 AWS S3、Cloudflare R2）时，只需要实现同样的接口。put 方法调用 S3 SDK 上传，get 方法调用 SDK 下载（或者直接返回 presigned URL 让前端自己下载），delete 调用删除 API，list 调用 listObjects，getUrl 返回 CDN 加速的 URL。业务逻辫不需要改动，只需要在配置中切换使用哪个实现。

这个抽象层也支持混合策略。比如开发环境用本地文件系统方便调试，测试环境用 MinIO 模拟 S3，生产环境用真实的 S3。甚至可以根据文件大小或访问频率选择不同的存储后端——热数据放 CDN，冷数据归档到 Glacier。抽象层隔离了这些复杂度，让业务逻辑只关心"存储一张图片"和"获取图片 URL"。

## 导出与下载流程

用户点击"下载"按钮时，前端发起 GraphQL Query 获取该 Project 的所有成功生成的 Image，拿到图片 URL 列表，并发下载所有图片（使用 fetch），将下载的 Blob 打包成 ZIP（使用 JSZip 库），触发浏览器下载。整个过程在前端完成，后端只提供图片文件的静态服务，不需要专门的"打包下载"接口。

这种设计的好处是减轻后端负担。打包 ZIP 是 CPU 密集型操作，放在前端执行可以利用用户的计算资源，后端只需要处理静态文件服务（Hono 通过 `app.use('/data/*', serveStatic({ root: './data' }))` 轻松实现）。前端打包时还可以根据用户选择决定是否包含相框效果——如果包含，就将 Canvas 渲染后的图片打包；如果不包含，直接打包原图。

ZIP 文件的命名和内部结构可以优化用户体验。文件名包含 Project 的创建时间和风格（`peelpack-anime-20250101.zip`），内部按情绪分类组织（`emotions/happy.png`, `surprises/01.png`），方便用户快速找到想要的表情。未来可以在 ZIP 中包含一个 manifest.json，记录每张图片的元数据（Prompt、生成时间），供用户参考或二次创作。

## 部署的最简方案

生产环境下，整个应用是一个 Bun 进程。启动时 Hono 做三件事：在根路径 `/` serve 前端静态文件（TanStack Start 使用 Vite 构建的产物），在 `/data/*` serve 用户生成的图片文件，在 `/graphql` 提供 GraphQL endpoint（HTTP 用于 Query/Mutation，WebSocket 用于 Subscription）。所有请求打到同一个端口（如 3000），通过路径区分。

前端构建时，TanStack Start 使用底层的 Vite 将所有 JS/CSS/HTML 打包到 `dist/` 目录，Hono 通过 `serveStatic({ root: './dist' })` 服务。用户访问 `https://peelpack.com` 时，Hono 返回 `dist/index.html`，浏览器加载 JS 后，前端直接通过 `/graphql` 与 Hono 后端通信，通过 `/data/...` 加载图片。整个流程对用户透明，看起来就像一个传统的单页应用。

数据持久化依赖两个东西：SQLite 数据库文件（`data/peelpack.db`）和图片文件目录（`data/`）。部署时只需要确保这两个路径在容器或服务器上持久化（通过 volume mount 或持久化磁盘），重启服务不会丢失数据。未来如果需要横向扩展（多实例），SQLite 会成为瓶颈，那时再考虑迁移到 PostgreSQL 和云存储，但在用户量不大的阶段，这个方案足够简单可靠。

## 技术选型的内在一致性

回顾整个技术栈，会发现一条贯穿始终的原则：在保持现代性的前提下，选择最简单的方案。Bun 提供极速的启动和执行，Hono 是轻量级的路由框架，GraphQL 用类型系统替代手写 API 文档，SQLite 避免了数据库服务器的运维，本地文件系统避免了云服务的复杂度，Better Auth 避免了自己实现认证，Canvas 避免了服务端图片处理。

每个选择都在问：这个复杂度是现在必须的吗？如果不是，就用更简单的方案，等到真正需要时再升级。这不是偷懒，而是对 YAGNI 原则的忠实实践。过早的抽象、过度的设计、为未来可能永远不会到来的需求买单——这些都是技术债务的来源。PeelPack 的技术架构追求的是"刚刚好"的复杂度：足够支撑产品需求，但不多一分。

从需求到架构，从愿景到代码，整条路径保持了惊人的一致性。产品定位是"小贴纸机"，技术架构也是"小而美"的单体。产品强调速度和可用性，技术选型也强调简单和可靠。这种一致性不是巧合，而是同一个哲学在不同层面的体现：做一件事，把这一件事做到极致，不被无关的复杂度分散注意力。
