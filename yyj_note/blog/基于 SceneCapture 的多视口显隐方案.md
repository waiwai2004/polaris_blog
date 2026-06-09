优点，可以实现任意视口的差异化显示，不想上一种方法只能实现三种。
缺点：需要渲染多次，性能开销较大

核心原理：略

步骤一：![[Pasted image 20260609092105.png]]
创建一个这个actor，在里面放入一下处理显隐性的函数。
![[Pasted image 20260609092538.png]]
蓝图连接方法是如上。


再创建一个actor，其中的camA，camB,camC都是子部件，注意这里的类一定要选则cinertcamera这个actor。![[Pasted image 20260609093718.png]]
![[Pasted image 20260609093824.png]]

蓝图逻辑是这样的，

![[Pasted image 20260609092951.png]]

然后把这个actor拖入场景，配置好这些参数。
![[Pasted image 20260609094114.png]]
然后再创建一个ui![[Pasted image 20260609094158.png]]
创建三个材质
![[Pasted image 20260609094518.png]]

主要需要这个![[Pasted image 20260609094605.png]]
然后把这些材质和ui上的image组件绑定一下。
运行游戏即可
效果如图![[Pasted image 20260609095203.png]]

