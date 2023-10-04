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