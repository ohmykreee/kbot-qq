import axios from "axios"
import { config } from "../botconfig"
import { log } from "./logger"
import { JSDOM } from "jsdom"
import { vw50 } from "./list/kfc-vw50"
import { food } from "./list/food"
import { osuname } from "./list/osu"
import { version } from '../package.json'
import { getOSUStats } from "./online"
import { updateOSUStats } from "./online"
import { text2img, getOsuToken } from "./utils"

/**
 * 处理消息并返回回复消息字符串
 *
 * @remarks
 * 接受接收的消息的字符串，当该消息命中某种规则时，返回回复消息字符串
 *
 * @param msg - 接收消息的字符数组
 * @param qqid - 触发者的 QQ 号，起因是为了某位群主量身定制
 * @param callback - 回调函数，返回值为字符串
 * 
 */
export function msgHandler(msg :Array<string>, qqid :number, callback: (reply :string) => void) :void {
  // 定义用于存储回复消息字符的变量，并赋予“没有命中规则的默认回复”值
  let reply :string = '智商有点低，听不懂捏（使用 /help 获取命令列表）'
  switch (msg[0]) {
    case "help":
    case "h":
    case "帮助":
      reply = 
`狗勾机器人(Kreee bot)主菜单命令：
（电脑 QQ 建议关闭 “使用快捷键输入表情”功能）\n
/help               输出该帮助信息\n
/ping               康康机器人有没有在摸鱼\n
/关于               关于这个机器人的一切\n
/在线               返回 osu! 查询列表里在线玩家\n
/在线 列表          返回 osu! 在线查询列表里的所有人\n
/在线 更新          立即请求一次 osu! 在线列表的更新\n
/吃什么             不知道今天中午/晚上吃什么？问我！\n
/星期四             星期四？想什么呢！\n
/抽一张             从盲盒里抽一张，0.05% / 4000井有神秘奖励？\n
/推 [推特ID]        返回最新的一条推文（且用且珍惜）(alpha)\n
/推图 [推特ID]      返回最新的一条带图片推文（且用且珍惜）(alpha)\n
/re [osu!用户名]    猫猫机器人崩了用这个备用（只能返回简单数据）\n
/pr [osu!用户名]    猫猫机器人崩了用这个备用（只能返回简单数据）\n
/mp [命令]          自动房主的多人房间，建议先使用"/mp help" 了解更多(alpha)\n
`
      callback(text2img(reply))
      break
    
    case "关于":
    case "about":
      reply = `${version}(${config.debug? 'in dev mode':'in production'}) ${config.description}`
      callback(reply)
      break
  
    case "ping":
      reply = 'Woof!'
      callback(reply)
      break

    case "在线":
      switch (msg[1]) {
        case "列表":
          let replytext :string = "查询列表（排名不分先后）\n"
          osuname.map((name) => {
            replytext = replytext + `${name}\n`
          })
          replytext = replytext + `（共 ${osuname.length} 项）`
          callback(text2img(replytext))
          break

        case "更新":
          // 运行 online.ts 中的 updateOSUStats() 以更新在线列表
          updateOSUStats(function(replytext) {
            reply = replytext
            callback(reply)
          })
          break

        default:
          // 运行 online.ts 中的 getOSUStats() 获取回复消息内容
          getOSUStats(function(replytext) {
            reply = replytext
            callback(text2img(reply))
          })
      }
      break

    case "吃什么":
      // 随机选取 list/food.ts 中的一项回复
      reply = food[Math.floor(Math.random() * food.length)]
      callback(reply)
      break

    case "星期四":
      let today :number = new Date().getDay()
      // 判断今天是否为星期四，如是则随机选取 list/kfc-vw50.ts 中的一项回复
      if (today === 4) {
        // 一个彩蛋，如果是 4133chen 的话只回复 “v我50”
        if (qqid === 2428813374) {
          reply = "v我50"
        } else {
          reply = vw50[Math.floor(Math.random() * vw50.length)]
        }
        callback(reply)
      } else {
        reply = '反正不是星期四'
        callback(reply)
      } 
      break

    case "推":
    case "推图":
      let twitterId :string = msg.slice(1).join(" ")
      let twitterUrl :string = msg[0] === "推图"? `${config.nitterurl}${twitterId}/media/rss`:`${config.nitterurl}${twitterId}/rss`
      // 判断推特ID是否存在
      if (!twitterId) {
        callback("请输入有效的ID！")
        return
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
          callback(reply)
        })
        .catch(function (error) {
          if (error.response && error.response.status === 404) {
            callback(`未找到该账户：@ ${twitterId}`)
          } else {
            log.error(error)
          }
        })
        break

    case "抽一张":
        axios.get("https://iw233.cn/API/Random.php")
          .then(res => {
            callback(`[CQ:image,file=${res.request.protocol}//${res.request.host}${res.request.path}]`)
          })
          .catch(function (error) {
            log.error(error)
          })
        break

    case "re":
    case "pr":
        // 获取token
          getOsuToken(function(token) {
            // 获取用户id，以及替换两个奇葩字符 []
            let user :string = msg.slice(1).join(" ")
            user = user.replace(/&#91;/i, '[');
            user = user.replace(/&#93;/i, ']');
            // 判断是否存在用户名
            if (!user) {
              callback('请输入有效的用户名！')
              return
            }
            axios.get(`https://osu.ppy.sh/api/v2/users/${user}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            })
            .then(res => {
              const userid = res.data.id
              // 获取用户最近游玩
              const includeFailed :number = msg[0] === "re"? 1:0
              axios.get(`https://osu.ppy.sh/api/v2/users/${userid}/scores/recent?include_fails=${includeFailed}&limit=1`, {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              })
              .then (res => {
                if (!(res.data.length === 0)) {
                  const recent = res.data[0]
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
    Combos: ${recent.max_combo}
    ${recent.mods.length > 0? `mods：${recent.mods.toString()}`:""}
`
                  callback(text2img(reply))
                } else {
                  callback(`${user} 最近还没有打过图哦...`)
                }
              })
              .catch(function (error) {
                log.error(`osu-score: when get user-score: ${error.toString()}`)
              })
            })
            .catch(function (error) {
              if (error.response && error.response.status === 404) {
                callback(text2img(`未找到该账户：${user}`))
              } else {
                log.error(`osu-score: when get user-id: ${error.toString()}`)
              }
            })
          })
      break

    case "mp":
        callback("请在群聊中使用该功能！")
      break

    default: callback(reply)
  }

}