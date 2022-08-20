import axios from "axios"
import { config } from "../botconfig"
import { log } from "./logger"
import { JSDOM } from "jsdom"
import { cutie } from "./list/cutie"
import { vw50 } from "./list/kfc-vw50"
import { food } from "./list/food"
import { osuname } from "./list/osu"
import { version } from '../package.json';
import { getOSUStats } from "./irc"
import { updateOSUStats } from "./irc"
import { text2img } from "./utils"

/**
 * 处理消息并返回回复消息字符串
 *
 * @remarks
 * 接受接收的消息的字符串，当该消息命中某种规则时，返回回复消息字符串
 *
 * @param msg - 接收消息的字符串
 * @param callback - 回调函数，返回值为字符串
 * 
 */
export function msgHandler(msg :string, callback: (reply :string) => void) :void {
  // 定义用于存储回复消息字符的变量，并赋予“没有命中规则的默认回复”值
  let reply :string = '智商有点低，听不懂捏'
  if (msg === 'help'|| msg === '帮助' || msg === 'h') {
    reply = 
`-----
格式：
Kreee，[命令]
kreee  [命令]
-----
支持：\n
帮助/help/h：输出所有可用命令。 *\n
关于：返回有关这个机器人的一切。 *\n
ping：康康机器人在没在摸鱼。 *\n
在线：返回 osu! 查询列表里在线玩家。\n
查询列表：返回 osu! 在线查询列表里的所有人。 *\n
更新在线列表：立即请求一次 osu! 在线列表的更新。 *\n
吃什么：不知道今天中午/晚上吃什么？问我！\n
色色/色图：并没有，或者说暗号错了？要么试试“就要色色！” * ？\n
星期四/星期几：星期四？想什么呢！\n
二次元：来一张（给好孩子看的）二次元图片。\n
动物/爆个照：本机器人的替身。\n
舔狗：瞬间化身舔狗！\n
推:[ID]/推图:[ID]：最新的一条推文（且用且珍惜）(alpha) 。 *\n
谁最可爱：才不告诉你捏！
-----
（末尾标 * 号的项目需要完整的命令才能触发）
（其他项目只需命中对应关键词即可触发）`
    callback(text2img(reply))

  } else if (msg === '关于') {
    reply = `${version}(${config.debug? 'in dev mode':'in production'}) ${config.description}`
    callback(reply)

  } else if (msg === 'ping') {
    reply = 'Woof!'
    callback(reply)

  } else if (msg === '就要色色！') {
    // http get 获取 JSON 内容
    axios.get('https://api.waifu.im/random?is_nsfw=true')
      .then(res => {
        // 通过 JSON 中的图片链接下载图片并存储在变量中
        axios.get(res.data.images[0].url, { responseType: 'stream' })
          .then(res => {
            // 将下载的图片上传到 Gokapi 服务并返回链接
            axios.post(config.gokapiurl, {
              'file': res.data,
              'allowedDownloads': 0,
              'expiryDays': 3
            }, {
              headers: {'apikey': config.gokapitoken, 'Content-Type': 'multipart/form-data'},
            })
              .then(res => {
                // 构造回复消息，注意要避开风控关键词（链接、二维码等）
                reply = `${res.data.HotlinkUrl}${res.data.FileInfo.HotlinkId}\n有效期3d`
                callback(`${res.data.FileInfo.HotlinkId}\n${text2img(reply)}`)
              })
              .catch(function (error) {
                log.error(error)
              })
          })
          .catch(function (error) {
            log.error(error)
          })
      })
      .catch(function (error) {
        log.error(error)
      })

  } else if (msg === '查询列表') {
    let replytext :string = ''
    // 遍历输出 list/osu.ts 中的内容
    for (const user of osuname) {
      replytext = `${replytext}${user.text}\n`
    }
    reply = replytext + `(共 ${osuname.length} 项)`
    callback(text2img(reply))

  } else if (msg === '更新在线列表') {
    // 运行 irc.ts 中的 updateOSUStats() 以更新在线列表
    updateOSUStats(function(replytext) {
      reply = replytext
      callback(reply)
    })

  } else if (/谁最可爱/g.test(msg)) {
    // 随机选取 list/cutie.ts 中的一项并回复
    reply = cutie[Math.floor(Math.random() * cutie.length)].text
    callback(reply)

  } else if (/在线/g.test(msg)) {
    // 运行 irc.ts 中的 getOSUStats() 获取回复消息内容
    getOSUStats(function(replytext) {
      reply = replytext
      callback(text2img(reply))
    })

  } else if (/色色/g.test(msg) || /色图/g.test(msg)) {
    const no_horny :Array<string> = ['不可以色色！','没有色色！','好孩子不可以色色！']
    reply = no_horny[Math.floor(Math.random() * no_horny.length)]
    callback(reply)

  } else if (/二次元/g.test(msg)) {
    // 获取包含图片信息的 JSON 内容
    axios.get('https://api.yimian.xyz/img?type=moe&R18=false')
      .then(res => {
        // 直接传递图片 url 给 go-cqhttp
        reply = `[CQ:image,file=${res.request.protocol}//${res.request.host}${res.request.path}]`
        callback(reply)
      })
      .catch(function (error) {
        log.error(error)
      })

  } else if (/星期四/g.test(msg) || /星期几/g.test(msg)) {
    let today :number = new Date().getDay()
    // 判断今天是否为星期四，如是则随机选取 list/kfc-vw50.ts 中的一项回复
    if (today === 4) {
      reply = vw50[Math.floor(Math.random() * vw50.length)].text
      callback(reply)
    } else {
      reply = '反正不是星期四'
      callback(reply)
    } 
    
  } else if (/舔狗/g.test(msg)) {
    // 获取纯文字内容并回复
    axios.get('https://api.ixiaowai.cn/tgrj/index.php')
      .then(res => {
        reply = res.data as string
        callback(reply)
      })
      .catch(function (error) {
        log.error(error)
      })

  } else if ((/动物/g.test(msg) || /爆个照/g.test(msg))) {
    // 获取包含图片信息的 JSON 内容
    axios.get('https://api.tinyfox.dev/img?animal=yote&json')
      .then(res => {
        // 直接传递图片 url 给 go-cqhttp
        reply = `[CQ:image,file=${res.request.protocol}//${res.request.host}${res.data.loc}]`
        callback(reply)
      })
      .catch(function (error) {
        log.error(error)
      })

  } else if (/^推[:：]/g.test(msg) || /^推图[:：]/g.test(msg)) {
    let twitterId :string
    let twitterUrl :string
    // 判断是否仅请求图片推文
    if (/^推图/g.test(msg)) {
      twitterId = msg.slice(3)
      twitterUrl = `https://notabird.site/${twitterId}/media/rss`
    } else {
      twitterId = msg.slice(2)
      twitterUrl = `https://notabird.site/${twitterId}/rss`
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

  } else if (/吃什么/g.test(msg)) {
    // 随机选取 list/food.ts 中的一项回复
    reply = food[Math.floor(Math.random() * food.length)].text
    callback(reply)

  }
  
  // 若未命中任何规则，则回复没有命中规则的默认回复
  else {
    callback(reply)
  }

}