import axios from "axios"
import config from "../botconfig.js"
import { log } from "./logger.js"
import { JSDOM } from "jsdom"
import db from "./db.js"
import info from '../package.json' assert { type: "json" }
import { getOSUStats, updateOSUStats } from "./online.js"
import { text2img, getOsuToken, uploadToGokapi } from "./utils.js"
import { randomBytes } from "crypto"

/**
 * 处理消息并返回回复消息字符串
 *
 * @remarks
 * 接受接收的消息的字符串，当该消息命中某种规则时，返回回复消息字符串
 *
 * @param msg - 接收消息的字符数组
 * @param qqid - 触发者的 QQ 号，起因是为了某位群主量身定制
 * 
 * @returns Promise<string>，返回值为回复内容或文字错误信息
 * 
 */
export function msgHandler(msg :Array<string>, qqid :number) :Promise<string> {
  return new Promise(async (resolve, reject) => {
    // 定义用于存储回复消息字符的变量
    let reply :string = ''
    switch (msg[0]) {
      case "help":
      case "h":
      case "帮助":
        reply = 
  `狗勾机器人(Kreee bot)主菜单命令：
  （电脑 QQ 建议关闭 “使用快捷键输入表情”功能）\n
  /help                                输出该帮助信息\n
  /ping                                康康机器人有没有在摸鱼\n
  /关于                                关于这个机器人的一切\n
  /在线                                返回 osu! 查询列表里在线玩家\n
  /在线 列表                           返回 osu! 在线查询列表里的所有人\n
  /在线 添加                           添加一项至 osu! 在线查询列表\n
  /在线 更新                           立即请求一次 osu! 在线列表的更新\n
  /吃什么                              不知道今天中午/晚上吃什么？问我！\n
  /星期四                              星期四？想什么呢！\n
  /抽一张                              从 Mono 精选里抽一张（无涩涩），赞美 Mono！\n
  /推 [推特ID]                         返回最新的一条推文（且用且珍惜）\n
  /推图 [推特ID]                       返回最新的一条带图片推文（且用且珍惜）\n
  /img [图片]                          上传图片并生成链接（记得/img后面要加空格）\n
  /re [osu!用户名] :[模式数字(可选)]    猫猫机器人崩了用这个备用（只能返回简单数据）\n
  /pr [osu!用户名] :[模式数字(可选)]    猫猫机器人崩了用这个备用（只能返回简单数据）\n
  /mp [命令]                           自动房主的多人房间，建议先使用"/mp help" 了解更多\n
  `
        resolve(text2img(reply))
        break
      
      case "关于":
      case "about":
        reply = `v${info.version} (${config.debug? 'in dev mode':'in production'}) ${config.description}`
        resolve(reply)
        break
    
      case "ping":
        reply = 'Woof!'
        resolve(reply)
        break

      case "在线":
        switch (msg[1]) {
          case "列表":
            reply = "查询列表（排名不分先后）\n"
            const osuname = await db.read("osu")
            osuname.map((name) => {
              reply = reply + `${name}\n`
            })
            reply = reply + `（共 ${osuname.length} 项）`
            resolve(text2img(reply))
            break

          case "更新":
            // 运行 online.ts 中的 updateOSUStats() 以更新在线列表
            updateOSUStats()
              .then((replytext) => {
                resolve(replytext)
              })
              .catch((replytext) => {
                resolve(replytext.toString())
              })
            break

          case "添加":
            let user :string = msg.slice(2).join(" ")
            user = user.replace(/&#91;/i, '[')
            user = user.replace(/&#93;/i, ']')
            // 检查名字是否格式正确
            if (!user || !user.match(/^[A-Za-z0-9 \[\]_-]+$/)) {
              resolve('请输入有效的用户名！')
            }
            // 在线查询用户名是否存在
            const token :string | void = await getOsuToken()
            if (!token) { resolve("发生非致命错误，已上报给管理员。") }
            axios.get(`https://osu.ppy.sh/api/v2/users/${user}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            })
              .then(async (res) => {
                const username :string = res.data.username
                const currList = await db.read("osu")
                if (username && !currList.includes(username)) {
                  await db.push("osu", username)
                  resolve(`成功添加玩家：${username}`)
                } else if (currList.includes(username)) {
                  resolve(`查询列表中已经存在玩家：${username}`)
                } else {
                  log.error(`add-queryer: when get user: empty username`)
                  resolve("发生非致命错误，已上报给管理员。")
                }
              })
              .catch((error) => {
                if (error.response && error.response.status === 404) {
                  resolve(text2img(`未找到该玩家：${user}`))
                } else {
                  log.error(`add-queryer: when get user-id: ${error.toString()}`)
                  resolve("发生非致命错误，已上报给管理员。")
                }
              })
            break

          default:
            // 运行 online.ts 中的 getOSUStats() 获取回复消息内容
            getOSUStats()
              .then((replytext) => {
                resolve(text2img(replytext))
              })
              .catch((replytext) => {
                resolve(replytext.toString())
              })
        }
        break

      case "吃什么":
        // 随机选取 list/food.ts 中的一项回复
        const food = await db.read("food")
        reply = food[Math.floor(Math.random() * food.length)]
        resolve(reply)
        break

      case "星期四":
        let today :number = new Date().getDay()
        const vw50 = await db.read("vw50")
        // 判断今天是否为星期四，如是则随机选取 list/kfc-vw50.ts 中的一项回复
        if (today === 4) {
          reply = vw50[Math.floor(Math.random() * vw50.length)]
          resolve(reply)
        } else {
          reply = '反正不是星期四'
          resolve(reply)
        } 
        break

      case "推":
      case "推图":
        let twitterId :string = msg.slice(1).join(" ")
        let twitterUrl :string = msg[0] === "推图"? `${config.nitterUrl}${twitterId}/media/rss`:`${config.nitterUrl}${twitterId}/rss`
        // 判断推特ID是否存在
        if (!twitterId || !twitterId.match(/^[A-Za-z0-9_]+$/)) {
          resolve("请输入有效的ID！")
        }
        axios.get(twitterUrl)
          .then(res => {
            const rssDoc = new JSDOM(res.data)
            const item = rssDoc.window.document.querySelectorAll('item').item(0)
            // 一个很奇葩的bug，需要再次声明一次，极其不稳定（被pubDate、RTuser使用）
            const rssDoc2 = new JSDOM(res.data, {contentType: 'application/xml'})
            const item2 = rssDoc2.window.document.querySelectorAll('item').item(0)
            // 准备推文内容
            let user :string = rssDoc.window.document.querySelectorAll('title').item(0).innerHTML
            let content :string = item.querySelector('title')?.innerHTML as string
            // 判断是否为转推，是则加上被转推的对象
            if (/^RT by/g.test(content)) {
              let RTuser :string = item2.querySelector('creator')?.innerHTML as string
              content = `（转推自 ${RTuser}）\n` + content
            }
            // 处理时间，并将 GMT 转换为当前时区
            const pubDateGMT :string = item2.querySelector('pubDate')?.innerHTML as string
            const pubDate :string = new Date(Date.parse(pubDateGMT)).toLocaleString('zh-CN')
            // 组装文字主体（又被风控了捏，用 text2img）
            reply = text2img(`${user}\n>>>>>\n\n${content}\n\n<<<<<\n（发布时间：${pubDate}）`)
            // 检测是否含图片（视频放弃检测）
            if (item.querySelector('description')?.innerHTML.match(/<img[^>]+src="([^">]+)"/gm)) {
              const imgs = item.querySelector('description')?.innerHTML.match(/<img[^>]+src="([^">]+)"/gm)
              for (const img of imgs!) {
                reply = reply + `\n[CQ:image,file=${img.slice(10, -1)}]`
              }
            }
            resolve(reply)
          })
          .catch((error) => {
            if (error.response && error.response.status === 404) {
              resolve(`未找到该账户：@ ${twitterId}`)
            } else {
              log.error(`fetchTweets: ${error.toString()}`)
              resolve("发生非致命错误，已上报给管理员。")
            }
          })
          break

      case "抽一张":
          axios.get("https://desu.life/random_image?type=json")
            .then(res => {
              resolve(`[CQ:image,file=${res.data.url}]\n（来源：${res.data.source}）`)
            })
            .catch((error) => {
              log.error(`fetchRandomImg: ${error.toString()}`)
              resolve("发生非致命错误，已上报给管理员。")
            })
          break

      case "re":
      case "pr":
        // 获取用户最近游玩
        const includeFailed :number = msg[0] === "re"? 1:0
        // 判断是否需要指定查询模式
        let queryMode :string = ""
        if ([":0", ":1", ":2", ":3", "：0", "：1", "：2", "：3"].includes(msg[msg.length - 1])) {
          switch (msg[msg.length - 1]) {
            case ":0":
            case "：0":
              queryMode = "osu"
              break
            case ":1":
            case "：1":
              queryMode = "taiko"
              break
            case ":2":
            case "：2":
              queryMode = "fruits"
              break
            case ":3":
            case "：3":
              queryMode = "mania"
              break
          }
        }
        // 获取用户id，以及替换两个奇葩字符 []
        let user :string = queryMode? msg.slice(1, -1).join(" "):msg.slice(1).join(" ")
        user = user.replace(/&#91;/i, '[')
        user = user.replace(/&#93;/i, ']')
        // 判断是否存在用户名
        if (!user || !user.match(/^[A-Za-z0-9 \[\]_-]+$/)) {
          resolve('请输入有效的用户名！')
        }
        // 获取token
        const token :string | void = await getOsuToken()
        if (!token) { resolve("发生非致命错误，已上报给管理员。") }
        axios.get(`https://osu.ppy.sh/api/v2/users/${user}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
          .then(res => {
            const userid = res.data.id
            axios.get(`https://osu.ppy.sh/api/v2/users/${userid}/scores/recent?include_fails=${includeFailed}&limit=1${queryMode? `&mode=${queryMode}`:""}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            })
              .then (res => {
                if (!(res.data.length === 0)) {
                  const recent = res.data[0]
                  let noteCount :string = ""
                  switch (recent.mode) {
                    case "osu":
                      noteCount = `\t300: ${recent.statistics.count_300}\n\t100: ${recent.statistics.count_100}\n\t50: ${recent.statistics.count_50}\n\tmiss: ${recent.statistics.count_miss}`
                      break
                    case "taiko":
                      noteCount = `\tgreat: ${recent.statistics.count_300}\n\tgood: ${recent.statistics.count_100}\n\tbad: ${recent.statistics.count_50}\n\tmiss: ${recent.statistics.count_100}`
                      break
                    case "fruits":
                      noteCount = `\tfruit: ${recent.statistics.count_300}\n\tdrop: ${recent.statistics.count_100}\n\tdroplet: ${recent.statistics.count_50}\n\tdroplet miss: ${recent.statistics.count_katu}\n\tmiss: ${recent.statistics.count_miss}`
                      break
                    case "mania":
                      noteCount = `\tmax: ${recent.statistics.count_geki}\n\tperfect: ${recent.statistics.count_300}\n\tgreat: ${recent.statistics.count_katu}\n\tgood: ${recent.statistics.count_100}\n\tbad: ${recent.statistics.count_50}\n\tmiss: ${recent.statistics.count_miss}`
                      break
                  }
                  let reply :string = 
  `
  ${recent.user.username} (mode: ${recent.mode})
  \n----------\n
  谱面信息：
      ${recent.beatmapset.title} [${recent.beatmap.status}]
      ${recent.beatmap.version} (${recent.beatmap.difficulty_rating}*)
      (地址：${recent.beatmap.url})
  \n----------\n
  表现信息：
      得分：${recent.score}
      准度：${Math.floor(recent.accuracy * 100000) / 1000}% (Rank: ${recent.rank})
      pp: ${recent.pp? recent.pp:"未 Ranked 或非最佳成绩"}
      Combos: ${recent.max_combo} ${recent.mods.length > 0? `\nmods：${recent.mods.toString()}`:""}
  \n----------\n
  ${noteCount}
  `
                  resolve(text2img(reply))
                } else {
                  resolve(`${user} 最近还没有打过图哦...`)
                }
              })
              .catch((error) => {
                log.error(`osu-score: when get user-score: ${error.toString()}`)
                resolve("发生非致命错误，已上报给管理员。")
              })
            })
            .catch((error) => {
              if (error.response && error.response.status === 404) {
                resolve(text2img(`未找到该账户：${user}`))
              } else {
                log.error(`osu-score: when get user-id: ${error.toString()}`)
                resolve("发生非致命错误，已上报给管理员。")
              }
            })
      break

      case "img":
        if (!msg[1]) {
          reply = "未检测到图片，请在“/img ”命令后附带上图片后再次上传！"
          resolve(reply)
        } else {
          // 依据 “[CQ:” 拆分 CQ code 为 array,且只留下 image 对象
          const CQcodes :Array<string> = msg[1].split("[CQ:").filter(n => n.slice(0, 5) === "image")
          if (CQcodes.length !== 1) {
            reply = "格式不规范（上传了多张图片/上传了非图片内容），请重新确认后再次上传！"
            resolve(reply)
          } else {
            const codeParam = CQcodes[0].split(",")
            const imgUrl :string = codeParam[codeParam.length - 1].slice(4, -1)
            axios.get(imgUrl, { responseType: 'arraybuffer' })
              .then(async res => {
                // 随机一个文件名
                const fileName :string = `kbot-${qqid}-${randomBytes(5).toString('hex')}.${res.headers["content-type"].split("/")[1]}`
                uploadToGokapi(res.data, fileName, 7, 0)
                  .then((gokapiResult) => {
                    if (gokapiResult.hotlinkUrl) {
                      reply = `上传成功！\n链接： ${gokapiResult.hotlinkUrl}\n有效期：${gokapiResult.expirDays} 天`
                      resolve(reply)
                    } else {
                      reply = "出现未知错误：未获取到直链。请通知管理员！"
                      log.error("imgUpload: can't get gokapi.HotlinkUrl")
                      resolve(reply)
                    }
                  })
                  .catch(() => {
                    resolve("发生非致命错误，已上报给管理员。")
                  })
              })
              .catch((error) => {
                log.error(`uploadGokapi: ${error.toString()}`)
                resolve("发生非致命错误，已上报给管理员。")
              })
          }
        }
        break

      case "mp":
        reply = "请在群聊中使用该功能！"
        resolve(reply)
        break

      default: 
        reply = "智商有点低，听不懂（使用 /help 获取命令列表）"
        resolve(reply)
    }
  })
}