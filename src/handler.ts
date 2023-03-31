import axios from "axios"
import config from "../botconfig.js"
import { log } from "./logger.js"
import db from "./db.js"
import info from '../package.json' assert { type: "json" }
import { getOSUStats, updateOSUStats } from "./online.js"
import { getOsuToken, uploadToGokapi } from "./utils.js"
import { renderDefault, renderTweets, renderScore } from "./render/_middleware.js"
import { randomBytes } from "crypto"
import { JSDOM } from "jsdom"

/**
 * 处理消息并返回回复消息字符串
 *
 * @remarks
 * 接受接收的消息的字符串，当该消息命中某种规则时，返回回复消息字符串
 *
 * @param msg - 接收消息的字符数组
 * @param qqid - 触发者的 QQ 号
 * 
 * @returns Promise<string | string[] | void>，返回值为回复内容或文字错误信息
 * 如果返回是一个字符串数组，会取第一个作为回复，第二个为发送失败（通常为风控）时备用发送字符
 * 如未命中任何规则，则不回复（返回 void ）
 * 
 */
export function msgHandler(msg :Array<string>, qqid :number) :Promise<string | string[] | void> {
  return new Promise(async (resolve, reject) => {
    // 定义用于存储回复消息字符的变量
    let reply :string = ''
    switch (msg[0]) {
      case "help":
      case "h":
      case "帮助":
      {
        reply = `
                  狗勾机器人(Kreee bot)主菜单命令：<br>
                （电脑 QQ 建议关闭 “使用快捷键输入表情”功能）<br>
                <table>
                  <tr> <td> /help </td> <td> 输出该帮助信息 </td> </tr>
                  <tr> <td> /ping </td> <td> 康康机器人有没有在摸鱼 </td> </tr>
                  <tr> <td> /关于 </td> <td> 关于这个机器人的一切 </td> </tr>
                  <tr> <td> /在线 </td> <td> 返回 osu! 查询列表里在线玩家 </td> </tr>
                  <tr> <td> /在线 列表 </td> <td> 返回 osu! 在线查询列表里的所有人 </td> </tr>
                  <tr> <td> /在线 添加 </td> <td> 添加一项至 osu! 在线查询列表 </td> </tr>
                  <tr> <td> /在线 更新 </td> <td> 立即请求一次 osu! 在线列表的更新 </td> </tr>
                  <tr> <td> /吃什么 </td> <td> 不知道今天中午/晚上吃什么？问我！ </td> </tr>
                  <tr> <td> /星期四 </td> <td> 星期四？想什么呢！ </td> </tr>
                  <tr> <td> /抽一张 [tag(可选)] </td> <td> 抽一张 Pixiv 图（docs.anosu.top） </td> </tr>
                  <tr> <td> /推 [推特ID] </td> <td> 返回最新的一条推文 </td> </tr>
                  <tr> <td> /推图 [推特ID] </td> <td> 返回最新的一条带图片推文 </td> </tr>
                  <tr> <td> /推文[#(可选)] [推特URL] </td> <td> 返回该链接推文内容（仅支持最近几个推文） </td> </tr>
                  <tr> <td> /img [图片] </td> <td> 上传图片并生成链接（记得/img后面要加空格） </td> </tr>
                  <tr> <td> /re [osu!用户名] :[模式数字(可选)] </td> <td> 猫猫机器人崩了用这个备用（只能返回简单数据） </td> </tr>
                  <tr> <td> /pr [osu!用户名] :[模式数字(可选)] </td> <td> 猫猫机器人崩了用这个备用（只能返回简单数据） </td> </tr>
                  <tr> <td> /pick [pick格式命令] </td> <td> 从 pick格式 命令中随机后回复，例如：今天[想,不想]做爱 </td> </tr>
                  <tr> <td> /mp [命令] </td> <td> 自动房主的多人房间，建议先使用"/mp help" 了解更多 </td> </tr>
                </table>
  `
        renderDefault(reply)
          .then((url) => {
            resolve([`[CQ:image,file=${url}]`,`图片消息发送失败了＞﹏＜，请前往 ${url} 查看！（链接有效期 1 天）`])
          })
          .catch((error) => {
            log.error(`renderDefault: ${error.toString()}`)
            resolve("发生致命错误，已上报给管理员。")
          })
        break
      }
      
      case "关于":
      case "about":
      {
        reply = `v${info.version} (${config.debug? 'in dev mode':'in production'}) ${config.description}`
        resolve(reply)
        break
      }

      case "ping":
      {
        reply = 'Woof!'
        resolve(reply)
        break
      }

      case "在线":
      {
        switch (msg[1]) {
          case "列表":
            reply = "查询列表（排名不分先后）<br>"
            const osuname = await db.read("osu")
            for (const name of osuname) {
              reply = reply + `${name}<br>`
            }
            reply = reply + `（共 ${osuname.length} 项）`
            renderDefault(reply)
              .then((url) => {
                resolve([`[CQ:image,file=${url}]`,`图片消息发送失败了＞﹏＜，请前往 ${url} 查看！（链接有效期 1 天）`])
              })
              .catch((error) => {
                log.error(`renderDefault: ${error.toString()}`)
                resolve("发生致命错误，已上报给管理员。")
              })
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
            // 检查名字是否格式正确
            if (!user || !user.match(/^[A-Za-z0-9 \[\]_-]+$/)) {
              resolve('请输入有效的用户名！')
              return
            }
            // 在线查询用户名是否存在
            const token :string | void = await getOsuToken.get()
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
                  renderDefault(`未找到该玩家：${user}`)
                    .then((url) => {
                      resolve([`[CQ:image,file=${url}]`,`图片消息发送失败了＞﹏＜，请前往 ${url} 查看！（链接有效期 1 天）`])
                    })
                    .catch((error) => {
                      log.error(`renderDefault: ${error.toString()}`)
                      resolve("发生致命错误，已上报给管理员。")
                    })
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
                renderDefault(replytext)
                  .then((url) => {
                    resolve([`[CQ:image,file=${url}]`,`图片消息发送失败了＞﹏＜，请前往 ${url} 查看！（链接有效期 1 天）`])
                  })
                  .catch((error) => {
                    log.error(`renderDefault: ${error.toString()}`)
                    resolve("发生致命错误，已上报给管理员。")
                  })
              })
              .catch((replytext) => {
                resolve(replytext.toString())
              })
        }
        break
      }

      case "吃什么":
      {
        // 随机选取 list/food.ts 中的一项回复
        const food = await db.read("food")
        reply = food[Math.floor(Math.random() * food.length)]
        resolve(reply)
        break
      }

      case "星期四":
      {
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
      }

      case "推":
      case "推图":
      {
        const twitterId :string = msg.slice(1).join(" ")
        const twitterUrl :string = msg[0] === "推图"? `${config.nitterUrl}${twitterId}/media/rss`:`${config.nitterUrl}${twitterId}/rss`
        // 判断推特ID是否存在
        if (!twitterId || !twitterId.match(/^[A-Za-z0-9_]+$/)) {
          resolve("请输入有效的ID！")
          return
        }
        axios.get(twitterUrl)
          .then( res => {
            const dom = new JSDOM(res.data, {contentType: "application/xml"})
            // 检查是否为空
            if (dom.window.document.getElementsByTagName("item").length === 0) {
              resolve("好像 ta 最近没有发布推文...")
              return
            }
            renderTweets(dom)
              .then((url) => {
                resolve([`[CQ:image,file=${url}]`,`图片消息发送失败了＞﹏＜，请前往 ${url} 查看！（链接有效期 1 天）`])
              })
              .catch((error) => {
                log.error(`renderTweets: ${error.toString()}`)
                resolve("发生致命错误，已上报给管理员。")
              })
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
        }

        case "推文":
        case "推文#":
        {
          let path: string[] = []
          // 判断是否为链接
          try {
            path = new URL(msg[1]).pathname.split("/").filter(n => n)
          } catch(error) {
            resolve("请输入有效的推文链接！")
            return
          }
          // 判断推文链接是否有效，path[0] 为用户名，path[2] 为推文id
          if (!(path[0].match(/^[A-Za-z0-9_]+$/) && path[1] === "status" && path[2])) {
            resolve("请输入有效的推文链接！")
            return
          }
          axios.get(`${config.nitterUrl}${path[0]}/rss`)
            .then( res => {
              const dom = new JSDOM(res.data, {contentType: "application/xml"})
              // 删除不需要的 item，只保留所需要的 item
              const itemsArray = [...dom.window.document.getElementsByTagName("item")]
              for (const item of itemsArray) {
                if (!item.getElementsByTagName("guid")[0].innerHTML.includes(path[2])) {
                  item.parentNode?.removeChild(item)
                } else {
                  break
                }
              }
              if (dom.window.document.getElementsByTagName("item").length === 0) {
                resolve("好像没有找到指定推文，请确认是否为最近发布的推文...")
                return
              }
              renderTweets(dom)
                .then((url) => {
                  resolve([`[CQ:image,file=${url}]${msg[0] === "推文#"? url:""}`,`图片消息发送失败了＞﹏＜，请前往 ${url} 查看！（链接有效期 1 天）`])
                })
                .catch((error) => {
                  log.error(`renderTweets: ${error.toString()}`)
                  resolve("发生致命错误，已上报给管理员。")
                })
            })
            .catch((error) => {
              if (error.response && error.response.status === 404) {
                resolve(`未找到该账户：@ ${path[0]}`)
              } else {
                log.error(`fetchTweets: ${error.toString()}`)
                resolve("发生非致命错误，已上报给管理员。")
              }
            })
            break
          }

      case "抽一张":
      {
        let tag: string = msg.slice(1).filter(key => !key.includes("[CQ:")).join(" ")
        // 遇到违禁词就不传入tag
        if (["r18", "R18", "发情", "色情"].includes(tag)) {
          tag = ""
        }
        if (tag && (tag.includes("&") || tag.includes("%26"))) {
          resolve("请求中包含非法字符！")
          return
        }
        // api 来自 https://docs.anosu.top/
          axios.get(`https://image.anosu.top/pixiv/json?num=1&r18=0&size=original&proxy=i.pixiv.cat&db=0${tag? `&keyword=${tag.replaceAll(" ", "%20")}`:""}`)
            .then(res => {
              if (res.data.length !== 0) {
                const data = res.data[0]
                resolve([`抽一张${tag? `tag包含有 ${tag} 的`:""}图：\n[CQ:image,file=${data.url}]\n（来源：https://www.pixiv.net/artworks/${data.pid}）`,
                        `消息被拦截了＞﹏＜,以下是被抢救的消息：\n\n抽一张${tag? `tag包含有 ${tag} 的`:""}图：\n[图片]\n（来源：https://www.pixiv.net/artworks/${data.pid}）`])
              } else {
                resolve(`未找到tag包含有 ${tag} 的作品，换一个关键词试试？`)
              }
            })
            .catch((error) => {
              if (error.request && error.code === "ETIMEDOUT") {
                log.error(`fetchRandomImg: ${error.toString()}`)
                resolve("连接到api超时，稍会再试试吧...")
              } else {
                log.error(`fetchRandomImg: ${error.toString()}`)
                resolve("发生非致命错误，已上报给管理员。")
              }
            })
          break
        }

      case "re":
      case "pr":
      {
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
        // 获取用户id
        let user :string = queryMode? msg.slice(1, -1).join(" "):msg.slice(1).join(" ")
        // 判断是否存在用户名
        if (!user || !user.match(/^[A-Za-z0-9 \[\]_-]+$/)) {
          resolve('请输入有效的用户名！')
          return
        }
        // 获取token
        const token :string | void = await getOsuToken.get()
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
                  renderScore(res.data)
                    .then((url) => {
                      resolve([`[CQ:image,file=${url}]`,`图片消息发送失败了＞﹏＜，请前往 ${url} 查看！（链接有效期 1 天）`])
                    })
                    .catch((error) => {
                      log.error(`renderScore: ${error.toString()}`)
                      resolve("发生致命错误，已上报给管理员。")
                    })
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
                renderDefault(`未找到该账户：${user}`)
                  .then((url) => {
                    resolve([`[CQ:image,file=${url}]`,`图片消息发送失败了＞﹏＜，请前往 ${url} 查看！（链接有效期 1 天）`])
                  })
                  .catch((error) => {
                    log.error(`renderDefault: ${error.toString()}`)
                    resolve("发生致命错误，已上报给管理员。")
                  })
              } else {
                log.error(`osu-score: when get user-id: ${error.toString()}`)
                resolve("发生非致命错误，已上报给管理员。")
              }
            })
        break
      }

      case "img":
      {
        if (!msg[1]) {
          reply = "未检测到图片，请在“/img ”命令后附带上图片后再次上传！"
          resolve(reply)
          return
        } else {
          // 依据 “[CQ:” 拆分 CQ code 为 array,且只留下 image 对象
          const CQcodes :Array<string> = msg[1].split("[CQ:").filter(n => n.slice(0, 5) === "image")
          if (CQcodes.length !== 1) {
            reply = "格式不规范（上传了多张图片/上传了非图片内容），请重新确认后再次上传！"
            resolve(reply)
            return
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
      }

      case "pick":
      {
        const input: string = msg.slice(1).join(" ")
        let tempString: string = input
        const matches: RegExpMatchArray[] = [...input.matchAll(/\[(.*?)\]/g)]
        const slices: string[] = []
        // 切割字符
        for (const match of matches) {
          const index: number = tempString.indexOf(match[0])
          slices.push(...[tempString.slice(0, index), match[0]])
          tempString = tempString.slice(index + match[0].length)
        }
        // 如果有尾巴将尾巴加上去
        if (tempString.length !== 0) {
          slices.push(tempString)
        }
        // 处理命中规则的字符
        const outputSlice: string[] = []
        for (const slice of slices) {
          if (slice.includes("[CQ:")) {
            outputSlice.push("")
            continue
          }
          if (slice.includes("[")) {
            if (slice.includes(",") || slice.includes("，")){
              const random: string[] = slice.slice(1, -1).split(/,|，/)
              if (random.length > 1) {
                outputSlice.push(random[Math.floor(Math.random() * random.length)])
                continue
              }
            }
            if (slice.includes("~")) {
              const random: string[] = slice.slice(1, -1).split("~")
              if (random.length === 2) {
                const [min, max] = [parseInt(random[0]), parseInt(random[1])]
                if (!isNaN(min) && !isNaN(max)) {
                  outputSlice.push(`${Math.floor(Math.random() * (max - min + 1) + min)}`)
                  continue
                }
              }
            }
          }
          outputSlice.push(slice)
        }
        // 防止构造恶意的 CQ 码
        const output: string = outputSlice.join("").replaceAll("[", "").replaceAll("]", "")
        // 判断是否为空
        if (output.length !== 0) {
          resolve(`“${output}”`)
        } else {
          resolve("[结果为空]")
        }
        break
      }


      case "mp":
      {
        reply = "请在群聊中使用该功能！"
        resolve(reply)
        break
      }

      default: 
        resolve()
    }
  })
}