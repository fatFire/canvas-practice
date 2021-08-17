function Candlestick(timestamp, open, close, high, low) {
  this.timestamp = parseInt(timestamp)
  this.open = parseFloat(open)
  this.close = parseFloat(close)
  this.high = parseFloat(high)
  this.low = parseFloat(low)
}

function CandlestickChart(canvasElementID) {
  this.canvas = document.getElementById(canvasElementID)
  this.context = this.canvas.getContext("2d")
  
  const dRP = window.devicePixelRatio

  // 高分屏适配
  this.canvas.style.width = this.canvas.width + 'px'
  this.canvas.style.height = this.canvas.height + 'px'
  this.canvas.width = this.canvas.width * dRP
  this.canvas.height = this.canvas.height * dRP
  this.context.scale(dRP, dRP)

  this.width = parseInt(this.canvas.width)
  this.height = parseInt(this.canvas.height)
  

  this.canvas.addEventListener("mousemove", (e) => {
    this.mouseMove(e)
  })
  this.canvas.addEventListener("mouseout", (e) => {
    this.mouseOut(e)
  })

  this.canvas.style.backgroundColor = "#252525"
  this.context.font = "12px sans-serif"
  this.gridColor = "#444444"
  this.gridTextColor = "#aaaaaa"
  this.mouseHoverBackgroundColor = "#eeeeee"
  this.mouseHoverTextColor = "#000000"
  this.greenColor = "#00cc00"
  this.redColor = "#cc0000"
  this.greenHoverColor = "#00ff00"
  this.redHoverColor = "#ff0000"

  this.context.lineWidth = 1
  this.candleWidth = 5

  this.marginLeft = 10
  this.marginRight = 100
  this.marginTop = 10
  this.marginBottom = 30

  this.yValueStart = 0
  this.yValueEnd = 0
  this.yValueRange = 0
  this.yPixelRange = this.height - this.marginTop - this.marginBottom

  this.xValueStart = 0
  this.xValueEnd = 0
  this.xValueRange = 0
  this.xPixelRange = this.width - this.marginLeft - this.marginRight

  // 预设值，实际会重新计算
  this.xGridCells = 16
  this.yGridCells = 16

  // 鼠标是否在蜡烛图上
  this.drawMouseOverlay = false
  // 鼠标的像素值
  this.mousePosition = { x: 0, y: 0 }
  // 鼠标对应的某个蜡烛的时间值
  this.xMouseHover = 0
  // 鼠标对应的某个蜡烛的价格值
  this.yMouseHover = 0
  this.hoveredCandlestickID = 0

  this.candlesticks = []
}

CandlestickChart.prototype.addCandlestick = function (candlestick) {
  this.candlesticks.push(candlestick)
}

CandlestickChart.prototype.mouseMove = function (e) {
  // 获取当前鼠标在canvas中的位置
  const getMousePos = (e) => {
    const rect = this.canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }
  this.mousePosition = getMousePos(e)

  // 由于candle是在timestamp两边画的，想要完成坐标转换，pixel <-> value，需要将当前鼠标位置 + this.candleWidth / 2 才是当前 pixel 所对应的candle
  // 也就是说 坐标转换，pixel <-> value 的标准是建立在 pixel：0 <-> candle left edge: 0 的规则上。
  this.mousePosition.x += this.candleWidth / 2
  this.drawMouseOverlay = true

  // 判断鼠标是否越界
  if (this.mousePosition.x < this.marginLeft) this.drawMouseOverlay = false
  if (this.mousePosition.x > this.width - this.marginRight + this.candleWidth)
    this.drawMouseOverlay = false
  if (this.mousePosition.y > this.height - this.marginBottom)
    this.drawMouseOverlay = false

  // 获取当前鼠标对应的蜡烛的值坐标
  if (this.drawMouseOverlay) {
    this.yMouseHover = this.yPixelToValueCoord(this.mousePosition.y)
    this.xMouseHover = this.xPixelToValueCoord(this.mousePosition.x)

    const candlestickDelta =
      this.candlesticks[1].timestamp - this.candlesticks[0].timestamp
    this.hoveredCandlestickID = Math.floor(
      (this.xMouseHover - this.candlesticks[0].timestamp) / candlestickDelta
    )
    this.xMouseHover =
      Math.floor(this.xMouseHover / candlestickDelta) * candlestickDelta
    this.mousePosition.x = this.xValueToPixelCoord(this.xMouseHover)
    this.draw()
  } else {
    this.draw()
  }
}

CandlestickChart.prototype.mouseOut = function (e) {
  this.drawMouseOverlay = false
  this.draw()
}

CandlestickChart.prototype.draw = function () {
  // 每次鼠标移动事件都需要重新画图
  this.context.clearRect(0, 0, this.width, this.height)

  // 计算值坐标
  this.calculateXValueRange()
  this.calculateYValueRange()

  // 画坐标系
  this.drawGrid()

  this.candleWidth = this.xPixelRange / this.candlesticks.length
  this.candleWidth--
  if (this.candleWidth % 2 == 0) this.candleWidth--

  for (let i = 0; i < this.candlesticks.length; i++) {
    const candlestick = this.candlesticks[i]
    let color =
      candlestick.close > candlestick.open ? this.redColor : this.greenColor

    if (i == this.hoveredCandlestickID) {
      if (color === this.greenColor) color = this.greenHoverColor
      else if (color === this.redColor) color = this.redHoverColor
    }

    // 画灯芯
    this.drawLine(
      this.xValueToPixelCoord(candlestick.timestamp),
      this.yValueToPixelCoord(candlestick.low),
      this.xValueToPixelCoord(candlestick.timestamp),
      this.yValueToPixelCoord(candlestick.high),
      color
    )

    // 画蜡烛
    this.fillRect(
      this.xValueToPixelCoord(candlestick.timestamp) -
        Math.floor(this.candleWidth / 2),
      this.yValueToPixelCoord(candlestick.open),
      this.candleWidth,
      this.yValueToPixelCoord(candlestick.close) -
        this.yValueToPixelCoord(candlestick.open),
      color
    )
  }

  // 如果鼠标在某个蜡烛上，需要画出辅助线
  if (this.drawMouseOverlay) {
    // 画价格线
    this.context.setLineDash([5, 5])
    this.drawLine(
      0,
      this.mousePosition.y,
      this.width,
      this.mousePosition.y,
      this.mouseHoverBackgroundColor
    )
    this.context.setLineDash([])
    let str = this.roundPriceValue(this.yMouseHover)
    let textWidth = this.context.measureText(str).width
    this.fillRect(
      this.width - 70,
      this.mousePosition.y - 10,
      70,
      20,
      this.mouseHoverBackgroundColor
    )
    this.context.fillStyle = this.mouseHoverTextColor
    this.context.fillText(
      str,
      this.width - textWidth - 5,
      this.mousePosition.y + 5
    )

    // 时间线
    this.context.setLineDash([5, 5])
    this.drawLine(
      this.mousePosition.x,
      0,
      this.mousePosition.x,
      this.height,
      this.mouseHoverBackgroundColor
    )
    this.context.setLineDash([])
    str = this.formatDate(new Date(this.xMouseHover))
    textWidth = this.context.measureText(str).width
    this.fillRect(
      this.mousePosition.x - textWidth / 2 - 5,
      this.height - 20,
      textWidth + 10,
      20,
      this.mouseHoverBackgroundColor
    )
    this.context.fillStyle = this.mouseHoverTextColor
    this.context.fillText(
      str,
      this.mousePosition.x - textWidth / 2,
      this.height - 5
    )

    // 数据
    let yPos = this.mousePosition.y - 95
    if (yPos < 0) yPos = this.mousePosition.y + 15

    this.fillRect(
      this.mousePosition.x + 15,
      yPos,
      120,
      80,
      this.mouseHoverBackgroundColor
    )
    const color =
      this.candlesticks[this.hoveredCandlestickID].close >
      this.candlesticks[this.hoveredCandlestickID].open
        ? this.redHoverColor
        : this.greenHoverColor

    this.fillRect(this.mousePosition.x + 15, yPos, 10, 80, color)
    this.context.lineWidth = 2
    this.drawRect(this.mousePosition.x + 15, yPos, 120, 80, color)
    this.context.lineWidth = 1

    this.context.fillStyle = this.mouseHoverTextColor
    this.context.fillText(
      "开盘价: " + this.candlesticks[this.hoveredCandlestickID].open,
      this.mousePosition.x + 30,
      yPos + 15
    )
    this.context.fillText(
      "收盘价: " + this.candlesticks[this.hoveredCandlestickID].close,
      this.mousePosition.x + 30,
      yPos + 35
    )
    this.context.fillText(
      "最高价: " + this.candlesticks[this.hoveredCandlestickID].high,
      this.mousePosition.x + 30,
      yPos + 55
    )
    this.context.fillText(
      "最低价: " + this.candlesticks[this.hoveredCandlestickID].low,
      this.mousePosition.x + 30,
      yPos + 75
    )
  }
}

CandlestickChart.prototype.drawGrid = function () {
  let yGridSize = this.yValueRange / this.yGridCells

  let niceNumber = Math.pow(10, Math.ceil(Math.log10(yGridSize)))
  if (yGridSize < 0.25 * niceNumber) {
    niceNumber = 0.25 * niceNumber
  } else if (yGridSize < 0.5 * niceNumber) {
    niceNumber = 0.5 * niceNumber
  }

  const yStartRoundNumber =
    Math.ceil(this.yValueStart / niceNumber) * niceNumber

  const yEndRoundNumber = Math.floor(this.yValueEnd / niceNumber) * niceNumber

  for (let y = yStartRoundNumber; y <= yEndRoundNumber; y += niceNumber) {
    this.drawLine(
      0,
      this.yValueToPixelCoord(y),
      this.width,
      this.yValueToPixelCoord(y),
      this.gridColor
    )
    const textWidth = this.context.measureText(this.roundPriceValue(y)).width
    this.context.fillStyle = this.gridTextColor
    this.context.fillText(
      this.roundPriceValue(y),
      this.width - textWidth - 5,
      this.yValueToPixelCoord(y) - 5
    )
  }

  var xGridSize = this.xValueRange / this.xGridCells

  niceNumber = Math.pow(10, Math.ceil(Math.log10(xGridSize)))
  if (xGridSize < 0.25 * niceNumber) {
    niceNumber = 0.25 * niceNumber
  } else if (xGridSize < 0.5 * niceNumber) {
    niceNumber = 0.5 * niceNumber
  }

  const xStartRoundNumber =
    Math.ceil(this.xValueStart / niceNumber) * niceNumber
  // find next lowest nice number below yEnd
  const xEndRoundNumber = Math.floor(this.xValueEnd / niceNumber) * niceNumber

  // var formatAsDate = false
  // if (this.xValueRange > 60 * 60 * 24 * 1000 * 5) formatAsDate = true

  for (let x = xStartRoundNumber; x <= xEndRoundNumber; x += niceNumber) {
    this.drawLine(
      this.xValueToPixelCoord(x),
      0,
      this.xValueToPixelCoord(x),
      this.height,
      this.gridColor
    )
    const date = new Date(x)
    let dateStr = ""
    // if (formatAsDate) {
    let day = date.getDate()
    if (day < 10) day = "0" + day
    let month = date.getMonth() + 1
    if (month < 10) month = "0" + month
    dateStr = day + "." + month
    // } else {
    //   let minutes = date.getMinutes()
    //   if (minutes < 10) minutes = "0" + minutes
    //   dateStr = date.getHours() + ":" + minutes
    // }
    this.context.fillStyle = this.gridTextColor
    this.context.fillText(
      dateStr,
      this.xValueToPixelCoord(x) + 5,
      this.height - 5
    )
  }
}

CandlestickChart.prototype.calculateYValueRange = function () {
  for (let i = 0; i < this.candlesticks.length; i++) {
    if (i == 0) {
      this.yValueStart = this.candlesticks[i].low
      this.yValueEnd = this.candlesticks[i].high
    } else {
      if (this.candlesticks[i].low < this.yValueStart) {
        this.yValueStart = this.candlesticks[i].low
      }
      if (this.candlesticks[i].high > this.yValueEnd) {
        this.yValueEnd = this.candlesticks[i].high
      }
    }
  }
  this.yValueRange = this.yValueEnd - this.yValueStart
}

CandlestickChart.prototype.calculateXValueRange = function () {
  this.xValueStart = this.candlesticks[0].timestamp
  this.xValueEnd = this.candlesticks[this.candlesticks.length - 1].timestamp
  this.xValueRange = this.xValueEnd - this.xValueStart
}

CandlestickChart.prototype.drawLine = function (
  xStart,
  yStart,
  xEnd,
  yEnd,
  color
) {
  this.context.beginPath()
  // canvas 绘制1px线条时，会在线两边绘制0.5px的区域。偏移0.5，使线条绘制的更清晰
  this.context.moveTo(xStart + 0.5, yStart + 0.5)
  this.context.lineTo(xEnd + 0.5, yEnd + 0.5)
  this.context.strokeStyle = color
  this.context.stroke()
}

CandlestickChart.prototype.fillRect = function (x, y, width, height, color) {
  this.context.beginPath()
  this.context.fillStyle = color
  this.context.rect(x, y, width, height)
  this.context.fill()
}

CandlestickChart.prototype.drawRect = function (x, y, width, height, color) {
  this.context.beginPath()
  this.context.strokeStyle = color
  this.context.rect(x, y, width, height)
  this.context.stroke()
}

CandlestickChart.prototype.yValueToPixelCoord = function (yValue) {
  return (
    this.height -
    this.marginBottom -
    ((yValue - this.yValueStart) * this.yPixelRange) / this.yValueRange
  )
}

CandlestickChart.prototype.xValueToPixelCoord = function (xValue) {
  return (
    this.marginLeft +
    ((xValue - this.xValueStart) * this.xPixelRange) / this.xValueRange
  )
}

CandlestickChart.prototype.yPixelToValueCoord = function (yPiexl) {
  return (
    this.yValueStart +
    ((this.height - this.marginBottom - yPiexl) * this.yValueRange) /
      this.yPixelRange
  )
}

CandlestickChart.prototype.xPixelToValueCoord = function (xPiexl) {
  return (
    this.xValueStart +
    ((xPiexl - this.marginLeft) * this.xValueRange) / this.xPixelRange
  )
}

CandlestickChart.prototype.formatDate = function (date) {
  var day = date.getDate()
  if (day < 10) day = "0" + day
  var month = date.getMonth() + 1
  if (month < 10) month = "0" + month
  var hours = date.getHours()
  if (hours < 10) hours = "0" + hours
  var minutes = date.getMinutes()
  if (minutes < 10) minutes = "0" + minutes
  return (
    day + "." + month + "." + date.getFullYear() + " - " + hours + ":" + minutes
  )
}

CandlestickChart.prototype.roundPriceValue = function (value) {
  if (value > 1.0) return Math.round(value * 100) / 100
  if (value > 0.001) return Math.round(value * 1000) / 1000
  if (value > 0.00001) return Math.round(value * 100000) / 100000
  if (value > 0.0000001) return Math.round(value * 10000000) / 10000000
  else return Math.round(value * 1000000000) / 1000000000
}
