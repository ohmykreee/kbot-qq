import { createCanvas } from "canvas";

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
  content.font='8px'
  const textImg = content.measureText(text)
  // 正式用于生成图像的 canvas
  const canvasWidth :number = textImg.width + 10
  const canvasHeight :number = textImg.actualBoundingBoxAscent + textImg.actualBoundingBoxDescent + 10
  const radio :number = 2
  const canvas = createCanvas(canvasWidth * radio, canvasHeight * radio)
  const ctx = canvas.getContext('2d')
  ctx.scale(radio, radio)
  ctx.font='8px'
  ctx.strokeStyle = 'white'
  ctx.lineWidth = 2
  ctx.strokeText(text, 5, textImg.actualBoundingBoxAscent + 5)
  ctx.fillStyle = 'black'
  ctx.fillText(text, 5, textImg.actualBoundingBoxAscent + 5)
  return `[CQ:image,file=base64://${canvas.toDataURL().slice(22)}]`
}