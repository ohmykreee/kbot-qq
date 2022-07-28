import axios from "axios"
import { config } from "../botconfig"
import { cutie } from "./list/cutie"
import { vw50 } from "./list/kfc-vw50"

const SimpleNodeLogger = require('simple-node-logger'),
	opts = {
		// logFilePath:'mylogfile.log',
		timestampFormat:'YYYY-MM-DD HH:mm:ss.SSS'
	},
log = SimpleNodeLogger.createSimpleLogger( opts )

export function msgHandler(msg: string, callback: (reply :string) => void) :void {
  let reply :string = '智商有点低，听不懂捏'
  if (msg === 'help'|| msg === '帮助' || msg === 'h') {
    // reply = `食用方法：\nKreee，[命令，通常为关键词匹配]\n或者\nkreee [命令，通常为关键词匹配]\n支持的命令有：\n帮助/help/h\n关于\n色色/色图\n星期四/星期几\n二次元\n动物/爆个照\n舔狗\nsh(上海证券交易所)/sz(深圳证券交易所)+股票代码\n谁最可爱`
    reply = `[CQ:image,file=https://cloud.ohmykreee.top/share/hotlink/1wQhBlf0oJ0yXLVrdzZr5wA7nVlgZPppqIQn24ew.jpg]`
    callback(reply)

  } else if (msg === '关于') {
    reply = `${config.version}(${config.debug? 'in debug mode':'in production'}) ${config.description}`
    callback(reply)

  } else if (msg === 'ping') {
    reply = 'Woof!'
    callback(reply)

  } else if (msg === '就要色色！') {
    axios.get('https://api.waifu.im/random?is_nsfw=true')
      .then(res => {
        axios.get(res.data.images[0].url, { responseType: 'stream' })
          .then(res => {
            axios.post(config.gokapiurl, {
              'file': res.data,
              'allowedDownloads': 0,
              'expiryDays': 3
            }, {
              headers: {'apikey': config.gokapitoken, 'Content-Type': 'multipart/form-data'},
            })
              .then(res => {
                let hotlink :string = `${res.data.HotlinkUrl}${res.data.FileInfo.HotlinkId}`
                reply = `https点点cloud点ohmykreee点top/share/hotlink/${res.data.FileInfo.HotlinkId}\n有效期3d.`
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

  } else if (/谁最可爱/g.test(msg)) {
    reply = cutie[Math.floor(Math.random() * cutie.length)].text
    callback(reply)

  } else if (/色色/g.test(msg) || /色图/g.test(msg)) {
    const no_horny :Array<string> = ['不可以色色！','没有色色！','好孩子不可以色色！']
    reply = no_horny[Math.floor(Math.random() * no_horny.length)]
    callback(reply)

  } else if (/二次元/g.test(msg)) {
    axios.get('https://api.yimian.xyz/img?type=moe&R18=false')
      .then(res => {
        reply = `[CQ:image,file=${res.request.protocol}//${res.request.host}${res.request.path}]`
        callback(reply)
      })
      .catch(function (error) {
        log.error(error)
      })

  } else if (/星期四/g.test(msg) || /星期几/g.test(msg)) {
    let today :number = new Date().getDay()
    if (today === 4) {
      reply = vw50[Math.floor(Math.random() * vw50.length)].text
      callback(reply)
    } else {
      reply = '反正不是星期四'
      callback(reply)
    } 
    
  } else if (/舔狗/g.test(msg)) {
    axios.get('https://api.ixiaowai.cn/tgrj/index.php')
      .then(res => {
        reply = res.data as string
        callback(reply)
      })
      .catch(function (error) {
        log.error(error)
      })

  } else if (/动物/g.test(msg) || /爆个照/g.test(msg)) {
    axios.get('https://api.tinyfox.dev/img?animal=yote&json')
      .then(res => {
        reply = `[CQ:image,file=${res.request.protocol}//${res.request.host}${res.data.loc}]`
        callback(reply)
      })
      .catch(function (error) {
        log.error(error)
      })

  } else if (/sh/g.test(msg) || /sz/g.test(msg)) {
    reply = `[CQ:image,file=https://image.sinajs.cn/newchart/min/n/${msg}.gif]`
    callback(reply)
  }
  
  else {
    callback(reply)
  }

}