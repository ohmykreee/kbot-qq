# 这是什么
一个自用的群机器人，通过 cqhttp 的 ws 服务器工作，功能高度定制化。

此项目仍然在早期开发阶段，许多功能可能会发生很大的变更。如果发现该日志出现未及时更新/错误的内容，请及时提交 issue。

# 如何部署
0. 前提
- Node `v18.12.1` 或更高
- Rust `v1.18` 或更高（编译 rosu-pp 用）
- cqhttp 实例（开启了一个 ws 服务器，且上报类型为 `array`）
- osu! 账号（最好无人使用）
  - osu Bancho IRC 的账号与密码（[可在这里获取，需要账号拥有 100 次游玩记录](https://osu.ppy.sh/p/irc)）
  - osu!api 的客户端 ID 与 token（[可在这里获取](https://osu.ppy.sh/home/account/edit#new-oauth-application)）
- gokapi 实例（[项目地址](https://github.com/Forceu/Gokapi)）
- nitter 实例（[可在这里找一个](https://github.com/zedeus/nitter/wiki/Instances)）
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
  pixivReverseUrl: string // Pixiv 图片反向代理地址，详情请参考：https://pixiv.cat/reverseproxy.html
  maxLogHistory :number  // 最大保存的日志项数
  ahrCWD :string  // osu-ahr 的目录（最好为绝对目录）
  dbCWD :string // bot 数据库存储的目录（最好为绝对目录）
```
这是一个修改好的 `botconfig.ts` 的例子:
```typescript
// 修改设置时，仅修改以下代码块！
const config :botconf = {
  debug: false,
  cqhttpUrl: "ws://localhost:1234",
  cqhttpToken: "this_is_a_very_long_token_for_cqhttp",
  adminQQ: [123456789, 987654321],
  description: "无维护/继续开发计划，等待重构。",
  gokapiUrl: "https://gokapi.example.site/api/",
  gokapiToken: "this_is_a_very_long_token_for_gokapi",
  osuIrcUsername: "Kreee",
  osuIrcPassword: "this_is_a_very_long_passwd_for_irc",
  osuIrcIntervalMin: 5,
  osuIrcIntervalMax: 10,
  nitterUrl: "https://nitter.example.site/",
  pixivReverseUrl: "pixiv.example.site",
  maxLogHistory: 100,
  osuClientId: 114514,
  osuClientSecret: "this_is_a_very_long_secret_for_osu",
  ahrCWD: "/app/osuahr",
  dbCWD: "/app/botdb"
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
  pixivReverseUrl: string
  maxLogHistory :number
  ahrCWD :string
  dbCWD :string
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
仍在早期开发中，不保证稳定性。只有未命中程序内置触发规则的命令时才会传递给所有插件。

**注意:** 请仅安装来自可信来源的插件！恶意插件可能会造成不可挽回的损失！

**注意:** 在 `v2.6.0` 及以后的版本，使用了新方法运行插件。插件的编写方法也发生了变化。
如需了解老版本插件编写方法，请在历史中参考老版本的 README.md。

1. 初始化插件项目

首先确保完成以上内容，能够在开发环境中成功运行 `kbot-qq`。
```bash
cd plugins
mkdir my-plugin
cd my-plugin
npm init
cp ../example-plugin/app.js ./
```
在 `package.json` 中添加一行：
```json
{
  "type": "module",
}
```

2. 安装依赖

直接在插件的子目录处执行 `npm install --save [package]`。

**注意:** 生成 js 文件时会自动带上插件的 `package.json`、`package-lock.json` 文件，在安装插件时需要在插件目录下执行一遍 `npm install`！

3. 编写插件

**注意:** 请勿修改入口文件 `app.js` 的文件名！

修改 `app.js` 完成开发。

由于使用子进程的方式运行插件，插件的运行和主程序的运行几乎隔离。因此只需要使用常规的独立应用开发方式进行开发，使用指定函数完成与主程序的数据获取与输出。

主程序运行时需要插件文件为 js 文件而非 ts 文件，如有 TypeScript 开发需求，需要将 ts 文件提前转换为 js 文件后再执行主程序。

4. 编译插件
```bash
cd ../../
npm run build
```
将会同时编译 `kbot-qq` 主体与所有插件为 js 文件于 `dist` 文件夹中。

# 常见问题
1. `render`模块无法正确渲染中文等字体

> 参考：[Installing Asian Fonts on Ubuntu & Debian - AccuSoft](https://help.accusoft.com/PrizmDoc/v12.1/HTML/Installing_Asian_Fonts_on_Ubuntu_and_Debian.html)

如果使用 Ubuntu server 系统，可以尝试以下命令安装字体：
```bash
sudo apt install language-pack-ja
sudo apt install language-pack-zh
sudo apt install language-pack-ko
sudo apt install fonts-arphic-ukai fonts-arphic-uming fonts-ipafont-mincho fonts-ipafont-gothic fonts-unfonts-core
```

~~屎山代码预警~~