// 修改设置时，仅修改以下代码块！
const config :botconf = {
  debug: false,
  cqhttpUrl: "",
  cqhttpToken: "",
  adminQQ: [123456789, 987654321],
  description: "实用化，固定的命令与简单的触发关键字符。",
  gokapiUrl: "",
  gokapiToken: "",
  osuIrcUsername: "",
  osuIrcPassword: "",
  osuIrcIntervalMin: 5,
  osuIrcIntervalMax: 10,
  nitterUrl: "https://nitter.net/",
  maxLogHistory: 100,
  osuClientId: 114514,
  osuClientSecret: "",
  ahrCWD: "./osuahr"
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