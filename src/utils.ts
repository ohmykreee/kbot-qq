import { config } from "../botconfig"
import { log } from "./logger"
import { createCanvas } from "canvas"
import axios from "axios"

/**
 * 文字转图片
 *
 * @remarks
 * 使用 canvas
 *
 * @param text - 需要被生成的字符串
 * 
 * @returns 图片 CQ 码
 * 
 */
export function text2img(text :string) :string {
  // 创建一个虚拟的 canvas 用于计算字体所占位置
  const content = createCanvas(0, 0).getContext('2d')
  content.font='500 8px sans-serif'
  const textImg = content.measureText(text)
  // 正式用于生成图像的 canvas
  const canvasWidth :number = textImg.width + 10
  const canvasHeight :number = textImg.actualBoundingBoxAscent + textImg.actualBoundingBoxDescent + 10
  const radio :number = 2
  const canvas = createCanvas(canvasWidth * radio, canvasHeight * radio)
  const ctx = canvas.getContext('2d')
  ctx.scale(radio, radio)
  ctx.fillStyle = "white"
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)
  ctx.font='500 8px sans-serif'
  ctx.fillStyle = "black"
  ctx.fillText(text, 5, textImg.actualBoundingBoxAscent + 5)
  return `[CQ:image,file=base64://${canvas.toDataURL().slice(22)}]`
}

/**
 * 获取 osu!api token
 *
 * @remarks
 * 文档 {@link https://osu.ppy.sh/docs/index.html#client-credentials-grant}，适用范围仅为 public
 *
 * @param callback - 回调函数，返回值为字符串
 * 
 */
export function getOsuToken(callback: (reply :string) => void) :void {
  axios.post("https://osu.ppy.sh/oauth/token", {
    client_id: config.osuclientid,
    client_secret: config.osuclientsecret,
    grant_type: "client_credentials",
    scope: "public"
  })
    .then(res => {
      callback(res.data.access_token)
    })
    .catch(function (error) {
      log.error(`osu-get-token: ${error.toString()}`)
    })
}