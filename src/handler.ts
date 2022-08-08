import axios from "axios"
import { config } from "../botconfig"
import { log } from "./logger"
import { cutie } from "./list/cutie"
import { vw50 } from "./list/kfc-vw50"
import { food } from "./list/food"
import { osuname } from "./list/osu"
import { version } from '../package.json';
import { getOSUStats } from "./irc"
import { updateOSUStats } from "./irc"

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
export function msgHandler(msg: string, callback: (reply :string) => void) :void {
  // 定义用于存储回复消息字符的变量，并赋予“没有命中规则的默认回复”值
  let reply :string = '智商有点低，听不懂捏'
  if (msg === 'help'|| msg === '帮助' || msg === 'h') {
    reply = `支持：\n帮助/help/h\n关于\n在线\n色色\n星期四/星期几\n二次元\n动物/爆个照\n舔狗\n吃什么\nsh(上海证券交易所)/sz(深圳证券交易所)+股票代码\n查询列表\n更新在线列表\n谁最可爱`
    callback(reply)

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
                reply = `${res.data.FileInfo.HotlinkId}\n有效期3d`
                callback(reply)
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
    reply = replytext + `(共 ${osuname.length} 项，更新频率 ${config.ircintervalMin} 分钟)`
    callback(reply)

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
      callback(reply)
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

  } else if (/sh/g.test(msg) || /sz/g.test(msg)) {
    // 直接传递图片 url 给 go-cqhttp，使用新浪 api，若股票信息不正确将会输出空图片
    reply = `[CQ:image,file=https://image.sinajs.cn/newchart/min/n/${msg}.gif]`
    callback(reply)

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