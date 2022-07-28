import {config} from "../botconfig"

export function msgHandler(msg: string) :string {
  let reply :string = '智商有点低，听不懂捏'
  if (msg === 'help'|| msg === 'h' || msg === '-h') {
    reply = `支持的命令有：\nhelp/h/-h\n关于\n色色/色图\n星期四/星期几\n妹子/妹妹\n谁最可爱\n`
  } else if (msg === '关于') {
    reply = `${config.version}(${config.debug? 'in debug mode':'in production'}) ${config.description}`
  } else if (/谁最可爱/g.test(msg)) {
    reply = '我我我！'
  } else if (/色色/g.test(msg) || /色图/g.test(msg)) {
    const no_horny :Array<string> = ['不可以色色！','没有色色！','好孩子不可以色色！']
    reply = no_horny[Math.floor(Math.random() * no_horny.length)]
  } else if (/妹子/g.test(msg) || /妹妹/g.test(msg)) {

  } else if (/星期四/g.test(msg) || /星期几/g.test(msg)) {

  }
  return reply
}