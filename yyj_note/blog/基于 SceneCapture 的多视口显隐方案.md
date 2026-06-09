
> **引擎版本**：Unreal Engine 5.6.1

本文将介绍另一种在 Unreal Engine 中实现多视口差异化显示的方案——利用 **SceneCaptureComponent** 的 **Show Only Actors Components** 机制。与上一篇「相机白名单」方案相比：

| 对比项    | Owner-based Visibility（上篇） | SceneCapture 方案（本篇）                      |
| ------ | -------------------------- | ---------------------------------------- |
| 视口数量限制 | 理论上最多只支持三个视角的白名单机制         | **无限制**，可创建任意数量的 Capture                 |
| 实现方式   | 利用 UE 内置的多人分屏 + Owner 机制   | 通过 SceneCapture 渲染到 RenderTarget 再显示到 UI |
| 性能开销   | 较低，直接渲染到视口                 | **较高**，每个 Capture 都需要额外渲染一帧              |
| 适用场景   | 少量视口（2~4 个）的分屏游戏           | 需要大量独立视角（如监控墙、战术地图等）                     |
![[../assets/ue5-scenecapture/Pasted image 20260609095203.png]]
如上图所示：三个独立的 Render Target 各自显示不同的物体组合，最终通过 UI 拼接展示。图中标注的含义：
- **A and B** — 对 Cam A 和 Cam B 都可见
- **Only_A / Only_B / Only_C** — 仅对对应 Cam 可见
- **ABC** — 对所有 Cam 都可见

**核心思路：**
- 创建一个管理 Actor（BP_CineRTCamera），内置 **SceneCaptureComponent2D**，负责将场景渲染到 **RenderTarget 2D**
- 利用 SceneCapture 的 **Show Only Actors Components** 机制，精确控制每个 Cam 看到的内容
- 创建 UI（UserWidget），将多个 RenderTarget 以 Image 组件的形式拼接展示

---

# 一、创建蓝图类 BP_CineRTCamera

## 1.1 蓝图结构与组件配置

新建一个蓝图类 `BP_CineRTCamera`（继承自 **Actor**）。

![[../assets/ue5-scenecapture/Pasted image 20260609092105.png]]

在 Components 面板中可以看到该蓝图的组件结构：
- **CineCamera**（SceneCaptureComponent2D）— 核心组件，负责将场景渲染到纹理
- 在 Variables 中定义了以下变量：

| 变量名 | 类型 | 用途 |
|--------|------|------|
| CameraName | Name | 该相机的标识名称 |
| RenderTarget | Texture Render Target 2D | 渲染输出的目标纹理 |
| WhitelistActors | Actor 数组 | 白名单列表（Show Only Actors） |

## 1.2 自定义事件：InitCapture 与 ApplyWhitelist

### InitCapture 事件 — 初始化��染目标
![[../assets/ue5-scenecapture/Pasted image 20260609113740.png]]

`InitCapture` 是一个 Custom Event，用于初始化 SceneCapture 组件的渲染目标和白名单设置。

流程如下：
1. 接收两个输入参数：`In Render Target`（RenderTarget 2D 引用）和 `In Whitelist Actors`（Actor 数组）
2. 先做 **Is Valid** 检查，确保输入有效
3. 将 `In Render Target` SET 到 `Texture Target` 变量
4. 将 `In Whitelist Actors` SET 到 `WhitelistActors` 变量
5. 调用 **Apply Whitelist** 自定义事件，将白名单应用到 SceneCaptureComponent2D

### ApplyWhitelist 事件 — 应用显隐规则


![[../assets/ue5-scenecapture/Pasted image 20260609113850.png]]
`ApplyWhitelist` 是另一个 Custom Event，负责实际执行显隐控制。

流程如下：
1. 接收 `In Whitelist Actors` 参数
2. SET **Primitive Render Mode** 为 `Use ShowOnly List`（使用仅显示列表模式）
3. 调用 **Clear Show Only Components** 清除之前的白名单设置
4. 使用 **For Each Loop** 遍历白名单数组中的每个 Actor
5. 循环体内调用 **Show Only Actor Components**

> 这一步是关键：当 Primitive Render Mode 设为 `Use ShowOnlyList` 后，SceneCapture 只会渲染白名单中指定的 Actor 组件，其他所有物体都会被忽略。

---

# 二、创建管理器蓝图 BP_CineRTCameraManager

## 2.1 蓝图结构：Child Actor 组件

新建一个蓝图类 `BP_CineRTCameraManager`（继承自 **Actor**），作为白名单的管理中心。
![[../assets/ue5-scenecapture/Pasted image 20260609114037.png]]
在该蓝图中添加 **Child Actor Component**，并将 **Child Actor Class** 设置为 `BP_CineRTCamera`。
![[../assets/ue5-scenecapture/Pasted image 20260609093824.png]]

这样管理器就可以通过 Child Actor 组件来创建和管理多个 CineRTCamera 实例了。

## 2.2 BeginPlay 事件 — 初始化所有相机

![[../assets/ue5-scenecapture/Pasted image 20260609094114.png]]

在 **BeginPlay** 事件中进行初始化：
![[../assets/ue5-scenecapture/Pasted image 20260609114151.png]]

1. 定义三组数据：
   - **Only AActors**、**Only BActors**、**Only CActors** — 分别为三个 Cam 的专属白名单
   - **CommonActors** — 所有 Cam 共同可见的 Actor 列表

2. 用三次 **APPEND** 操作，分别构建各 Cam 的完整白名单：
   - Cam A = CommonActors + Only AActors
   - Cam B = CommonActors + Only BActors
   - Cam C = CommonActors + Only CActors

3. 延迟 **0.2 秒**（Delay 节点），确保关卡中的 Actor 已完全初始化


![[../assets/ue5-scenecapture/Pasted image 20260609114318.png]]
4. 延迟结束后，对三个 Child Actor 分别执行：
   - **Cast To BP_CineRTCamera** — 将 Child Actor 转换为目标类型
   - 调用 **InitCapture** — 传入对应的 RenderTarget 和白名单数组

> 注意延迟 0.2 秒的原因：如果在 BeginPlay 立即初始化 SceneCapture，可能部分 Actor 还未完成 Spawn，导致 Get All Actors with Tag 无法获取到完整列表。短暂延迟可以避免这个问题。

---

# 三、配置参数与放入关卡

## 3.1 配置管理器的参数

将 `BP_CineRTCameraManager` 拖入关卡后，在 Details 面板中配置参数：

![[../assets/ue5-scenecapture/Pasted image 20260609094114.png]]

> 上图为管理器的变量配置面板，需要为 RT_A、RT_B、RT_C 三个 Child Actor 分别选择对应的 RenderTarget，并设置各自的显隐白名单：
> - **CommonActors**：7 个元素（所有视口共有的物体）
> - **Only AActors**：2 个元素（仅 Cam A 可见）
> - **Only BActors**：2 个元素（如 `Cube_Only_B`、`Sphere_A_B`）
> - **Only CActors**：1 个元素（如 `Cube_Only_A`）

---

# 四、创建 UI 显示多视口画面

## 4.1 创建 UserWidget

创建一个 **UserWidget**（如命名为 `WBP_MultiCamPreview`），用于展示多个 RenderTarget 的画面。

![[../assets/ue5-scenecapture/Pasted image 20260609094158.png]]

在 UMG 编辑器中：
- 放入多个 **Image** 组件作为预览窗口
- 每个 Image 对应一个 Cam 的 RenderTarget
- 如上图所示，可以设计一个如图所示的布局

## 4.2 创建材质连接 RenderTarget

为了让 Image 组件正确显示 SceneCapture 渲染的内容，需要创建材质。

![[../assets/ue5-scenecapture/Pasted image 20260609094518.png]]

创建三个材质实例（或使用同一个材质的不同实例）：
- **M_RT_Cam_A**
- **M_RT_Cam_B**
- **M_RT_Cam_C**

## 4.3 材质节点设置

![[../assets/ue5-scenecapture/Pasted image 20260609094605.png]]

材质的核心结构非常简单：

1. 添加一个 **Texture Sample** 节点
2. 将 Texture 属性设置为对应的 RenderTarget（如 `RT_Cam_C`）
3. 将 **RGB** 输出连接到 **Base Color**
4. 将输出连接到 **Final Color**

> 关键点：确保 **Sampler Source** 设置为 `From texture asset`，并且勾选 **Apply View MipBias**，以保证渲染质量。

---

# 五、运行效果

![[../assets/ue5-scenecapture/Pasted image 20260609095203.png]]

运行游戏后的效果如上图所示：

- **顶部大窗口（Cam A）**：显示了 `A and B`、`Only_A`、`ABC` 等标记的物体
- **左下窗口（Cam B）**：显示了 `A and B`、`Only_B`、`ABC` 等
- **右下窗口（Cam C）**：显示了 `ABC` 以及 `Only_C` 标记的物体

每个视口中物体的显隐性完全独立，互不影响。

---

# 六、总结

| 步骤 | 说明 |
|------|------|
| 创建 BP_CineRTCamera | 继承 Actor，添加 SceneCaptureComponent2D，定义 CameraName/RenderTarget/WhelistActors 变量 |
| 实现 InitCapture 事件 | 接收 RenderTarget 和白名单数组，调用 ApplyWhitelist 应用 |
| 实现 ApplyWhitelist 事件 | 设置 PrimitiveRenderMode = UseShowOnlyList，遍历白名单调用 Show Only Actor Components |
| 创建 BP_CineRTCameraManager | 添加 Child Actor Component（Class = BP_CineRTCamera），管理多个 Cam 实例 |
| BeginPlay 初始化 | 构建各组白名单（Common + OnlyX），延迟 0.2s 后调用各 Cam 的 InitCapture |
| 创建 UI (UserWidget) | 放置 Image 组件作为视口预览窗口 |
| 创建材质 | Texture Sample 连接 RenderTarget → Base Color → Final Color |
| 绑定材质到 UI | 将各 Cam 的材质赋给对应 Image 组件的 Image 属性 |

### 优缺点总结

**优点：**
- 视口数量不受 Player 限制，理论上可以创建任意数量的独立视角
- 显隐控制灵活，每个 Cam 可以有完全不同的白名单

**缺点：**
- 每个 SceneCapture 都需要额外渲染一次场景，**性能开销较大**
- 视口数量越多，GPU 负担越重，需要注意性能优化

> **建议**：如果只需要 2~4 个视口的分屏游戏，优先使用上一篇的 Owner-based Visibility 方案；如果需要大量独立视角（如 6 个以上），再考虑本方案的 SceneCapture 方式。