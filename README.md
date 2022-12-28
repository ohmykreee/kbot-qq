# 这是什么
一个自用的群机器人，通过 cqhttp 的 ws 服务器工作，功能高度定制化。

此项目仍然在早期开发阶段，许多功能可能会发生很大的变更。如果发现该日志出现未及时更新/错误的内容，请及时提交 issue。

# 如何部署
0. 前提
- Node `v18.12.1` 或更高
- cqhttp 实例（开启了一个 ws 服务器）
- osu! 账号（最好无人使用）
  - osu Bancho IRC 的账号与密码（[可在这里获取，需要账号拥有 100 次游玩记录](https://osu.ppy.sh/p/irc)）
  - osu!api 的客户端 ID 与 token（[可在这里获取](https://osu.ppy.sh/home/account/edit#new-oauth-application)）
- gokapi 实例（[项目地址](https://github.com/Forceu/Gokapi)）
- 一个 nitter 实例（[可在这里找一个](https://github.com/zedeus/nitter/wiki/Instances)）
- 较好的网络环境（能够顺畅访问 osu!、nitter以及一些国内服务）


1. 克隆整个项目（包括 submodule）
```bash
git clone --recurse-submodules git@github.com:ohmykreee/kbot-qq.git
```

2. 安装依赖
```bash
cd kbot-qq
npm install
```

3. 复制一份 `botconfig.example.ts` 为 `botconfig.ts`，并修改相关设置
```typescript
  debug: boolean  // 是否为开发环境，如是则会输出 Debug 日志与一些测试行为
  cqhttpUrl: string  // cqhttp 的连接地址
  cqhttpToken?: string  // （可选）cqhttp 连接时所需的 token
  adminQQ: Array<number>  // 管理员QQ，可多个，私聊通知上线、错误消息，与管理员相关命令权限
  description: string  // 出现在 `/关于` 命令中的描述性文字
  gokapiUrl: string  // gokapi 实例的 API 地址
  gokapiToken: string  // gokapi 实例的 API 访问地址
  osuIrcUsername: string  // osu! Bancho IRC 用户名
  osuIrcPassword: string  // osu! Bancho IRC 密码
  osuIrcIntervalMin :number  // osu 在线查询最小随机间隔时间（单位：分钟）
  osuIrcIntervalMax :number  // osu 在线查询最大随机间隔时间（单位：分钟）
  osuClientId :number  // osu!api 客户端 ID
  osuClientSecret :string  // osu!api 客户端 token
  nitterUrl :string  // nitter 实例的链接
  maxLogHistory :number  // 最大保存的日志项数
  ahrCWD :string  // osu-ahr 的目录（最好为绝对目录）
```
这是一个修改好的 `botconfig.ts` 的例子:
```typescript
// 修改设置时，仅修改以下代码块！
const config :botconf = {
  debug: false,
  cqhttpUrl: "ws://localhost:1234",
  cqhttpToken: "this_is_a_very_long_token_for_cqhttp",
  adminQQ: [123456789, 987654321],
  description: "实用化，固定的命令与简单的触发关键字符。",
  gokapiUrl: "https://gokapi.example.site/api/",
  gokapiToken: "this_is_a_very_long_token_for_gokapi",
  osuIrcUsername: "Kreee",
  osuIrcPassword: "this_is_a_very_long_passwd_for_irc",
  osuIrcIntervalMin: 5,
  osuIrcIntervalMax: 10,
  nitterUrl: "https://nitter.example.site/",
  maxLogHistory: 100,
  osuClientId: 114514,
  osuClientSecret: "this_is_a_very_long_secret_for_osu",
  ahrCWD: "/usr/local/kbot-qq/osuahr"
}

// 以下内容请勿修改！
interface botconf {
  debug: boolean
  cqhttpUrl: string
  cqhttpToken?: string
  adminQQ: Array<number>
  description: string
  gokapiUrl: string
  gokapiToken: string
  osuIrcUsername: string
  osuIrcPassword: string
  osuIrcIntervalMin :number
  osuIrcIntervalMax :number
  osuClientId :number
  osuClientSecret :string
  nitterUrl :string
  maxLogHistory :number
  ahrCWD :string
}
export default config
```

4. 修改 osu-ahr 设置
> 更多内容请参考：[Meowhal/osu-ahr#configuration](https://github.com/Meowhal/osu-ahr#configuration)

复制 `osuahr/config/default.json` 为 `osuahr/config/local.json`，并修改以下项目：
- `irc.nick`：同上 `osuIrcUsername`
- `irc.opt.password`：同上 `osuIrcPassword`
- `WebApi.client_id`：（可选）同上`osuClientId`
- `WebApi.client_secret`：（可选）同上`osuClientSecret`
- 其他设置按需修改

5. 生成可执行 js 文件
```bash
npm run build
```
生成的文件将在 `dist` 目录中，入口文件为 `dist/src/app.js`

或者可以直接使用 nodemon + ts-node 直接运行，跳过 js 文件生成阶段（未经过测试，无可用性保证）：
```bash
npm run server
```

6. （可选，仅适用于使用 `systemd` 的 linux 系统）Deamonlize：

以下是一个仅供参考的 `/etc/systemd/system/kbot-qq.service` 文件
```plaintext
[Unit]
Description=Kbot QQ
# 需要有一个 cqhttp.service 守护进程，否则无法启动
# 如无，可将下面一行改为 network-online.target
After=cqhttp.service
Wants=network-online.target

[Service]
User=ubuntu
Group=ubuntu
Restart=on-failure
RestartSec=3s
WorkingDirectory=/usr/local/kbot-qq/dist
ExecStart=node /usr/local/kbot-qq/dist/src/app.js

[Install]
WantedBy=multi-user.target
```

7. 开发
使用以下命令进行本地开发（使用 ts-node）
```bash
npm run dev
```
同时需要在 `botconfig.ts` 中启用 `debug: true,`

# 插件系统
仍在早期开发中，不保证稳定性。只有未命中 `kbot` 触发规则的命令才会传递给所有插件。

**注意:** 请仅安装来自可信来源的插件！恶意插件可能会造成不可挽回的损失！

1. 初始化插件项目

首先确保完成以上内容，能够在开发环境中成功运行 `kbot-qq`。
```bash
cd plugins
mkdir my-plugin
cd my-plugin
npm init
npx tsc --init
cp ../example-plugin/app.ts ./
```
在 `package.json` 中添加一行：
```json
{
  "type": "module",
}
```
在 `tsconfig.json` 中修改两行：
```json
{
  "compilerOptions": {
    "target": "es2020",
    "module": "ESNext",
  }
}
```

2. 安装依赖

直接在插件的子目录处执行 `npm install --save [package]`。

**注意:** 生成 js 文件时会自动带上插件的 `package.json` `package-lock.json` `tsconfig.json` 文件，在安装插件时需要在插件目录下执行一遍 `npm install`！

3. 编写插件

**注意:** 请勿修改入口文件 `app.ts` 的文件名！

修改 `app.ts` 完成开发。

以下为开发时注意事项：
- 导入第三方包时，会出现路径错误。可以尝试使用：
```typescript
import path from 'path'

const mainDir = path.resolve()
const { ChatGPTAPIBrowser } = await import(`file:///${mainDir}/plugins/chatgpt/node_modules/chatgpt/build/index.js`)
```
- 请勿修改程序关键部分，可能会引发未知错误。
- `stop()` 方法必须使用 `resolve()` 返回，否则程序在退出时会卡住。
- 如果需要主动发送消息，可以导入 `../../src/plugin` 中的 `pluginSendMsg()` 方法，传递值与 `PluginClass.receiver()` 方法返回值类型相同。

4. 编译插件
```bash
cd ../../
npm run build
```
将会同时编译 `kbot-qq` 主体与所有插件为 js 文件于 `dist` 文件夹中。

# 常见问题
1. `text2img()`无法正确渲染中文等字体

> 参考：[Installing Asian Fonts on Ubuntu & Debian - AccuSoft](https://help.accusoft.com/PrizmDoc/v12.1/HTML/Installing_Asian_Fonts_on_Ubuntu_and_Debian.html)

如果使用 Ubuntu server 系统，可以尝试以下命令安装字体：
```bash
sudo apt install language-pack-ja
sudo apt install language-pack-zh
sudo apt install language-pack-ko
sudo apt install fonts-arphic-ukai fonts-arphic-uming fonts-ipafont-mincho fonts-ipafont-gothic fonts-unfonts-core
```

2. `text2img()`无法正确渲染 emoji

如果使用 Ubuntu server 系统，可以尝试以下命令安装字体：
```bash
sudo apt install ttf-ancient-fonts
```
其他系统可以参考：[Any emoji support? - node-canvas](https://github.com/Automattic/node-canvas/issues/760)