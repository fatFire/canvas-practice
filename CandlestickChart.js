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
  this.width = parseInt(this.canvas.width)
  this.height = parseInt(this.canvas.height)
  this.adjustHidpi(this.canvas, this.context)

  this.canvas.addEventListener("mousemove", (e) => {
    this.mouseMove(e)
  })
  this.canvas.addEventListener("mouseout", (e) => {
    this.mouseOut(e)
  })
  this.canvas.addEventListener("mousedown", (e) => {
    this.mouseDown(e)
  })
  this.canvas.addEventListener("mouseup", (e) => {
    if (this.mousedown) {
      this.mouseUp(e)
    }
  })

  this.canvas.style.backgroundColor = "#2f2e43"
  this.context.font = "12px sans-serif"
  this.gridColor = "#444444"
  this.gridTextColor = "#aaaaaa"
  this.mouseHoverBackgroundColor = "#eeeeee"
  this.mouseHoverTextColor = "#000000"
  this.greenColor = "#50ea8e"
  this.redColor = "#fc5434"
  this.greenHoverColor = "#01c454"
  this.redHoverColor = "#fd2906"

  this.context.lineWidth = 1
  this.candleWidth = 5

  this.marginLeft = 30
  this.marginRight = 100
  this.marginTop = 30
  this.marginBottom = 50

  this.yValueStart = 0
  this.yValueEnd = 0
  this.yValueRange = 0
  this.yPixelRange = this.height - this.marginTop - this.marginBottom

  this.xValueStart = 0
  this.xValueEnd = 0
  this.xValueRange = 0
  this.xPixelRange = this.width - this.marginLeft - this.marginRight

  this.cachedCandlesticks = []
  this.candlesticks = []

  // 预设值，实际会重新计算
  this.xGridCells = 16
  this.yGridCells = 16

  // 鼠标是否在蜡烛图上
  this.drawMouseOverlay = false
  // 鼠标按下的起始位置
  this.mouseDownPosition = { x: 0, y: 0 }
  this.mousedown = false
  // candlesticks 数组的起始下标
  this.startIndex = 50
  this.counts = 0
  // 鼠标的像素值
  this.mousePosition = { x: 0, y: 0 }
  // 鼠标对应的某个蜡烛的时间值
  this.xMouseHover = 0
  // 鼠标对应的某个蜡烛的价格值
  this.yMouseHover = 0
  this.hoveredCandlestickID = 0
}

CandlestickChart.prototype.adjustHidpi = function (canvas, context) {
  const dpr = window.devicePixelRatio || 1

  const bsr =
    context["webkitBackingStorePixelRatio"] ||
    context["mozBackingStorePixelRatio"] ||
    context["msBackingStorePixelRatio"] ||
    context["oBackingStorePixelRatio"] ||
    context["backingStorePixelRatio"] ||
    1

  const ratio = dpr / bsr

  const rect = canvas.getBoundingClientRect()

  canvas.width = rect.width * ratio
  canvas.height = rect.height * ratio

  canvas.style.width = rect.width + "px"
  canvas.style.height = rect.height + "px"
  console.log(canvas.style.width, rect.width, canvas.width)
  console.log(canvas, context)
  console.log(dpr, bsr)
  context.scale(ratio, ratio)
}

CandlestickChart.prototype.addCandlestick = function (candlestick) {
  this.cachedCandlesticks.push(candlestick)
}

CandlestickChart.prototype.setCandlesticks = function (
  start = this.startIndex,
  len = 50
) {
  if (start < 0 || start + len > this.cachedCandlesticks.length) {
    return
  }
  this.candlesticks = this.cachedCandlesticks.slice(start, start + len)
}

CandlestickChart.prototype.mouseDown = function (e) {
  this.mousedown = true
  this.mouseDownPosition = this.getMousePos(e)
}

CandlestickChart.prototype.getMousePos = function (e) {
  const rect = this.canvas.getBoundingClientRect()
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

CandlestickChart.prototype.mouseUp = function (e) {
  this.mousedown = false
  if (this.mousePosition.x - this.mouseDownPosition.x > 0) {
    this.startIndex = this.startIndex - this.counts
    if (this.startIndex < 50) {
      getData(this.cachedCandlesticks[0].timestamp - 86400000).then((res) => {
        this.cachedCandlesticks = res.concat(this.cachedCandlesticks)
        this.startIndex = this.startIndex + 100
      })
    }
  } else {
    this.startIndex = this.startIndex + this.counts
  }
}

CandlestickChart.prototype.mouseMove = function (e) {
  if (!this.mousedown) {
    this.drawAuxiliaryLine(e)
  } else {
    this.drawMouseOverlay = false
    this.updateCandlesticks(e)
  }
}

CandlestickChart.prototype.updateCandlesticks = function (e) {
  this.mousePosition = this.getMousePos(e)

  // 判断鼠标是否越界
  if (
    this.mousePosition.x < this.marginLeft ||
    this.mousePosition.x > this.width - this.marginRight + this.candleWidth ||
    this.mousePosition.y > this.height - this.marginBottom ||
    this.mousePosition.y < this.marginTop
  ) {
    this.mouseUp(e)
    return
  }

  let mouseMoveLength = this.mousePosition.x - this.mouseDownPosition.x
  if (mouseMoveLength > 0) {
    if (mouseMoveLength >= this.candleWidth) {
      this.counts = Math.floor(mouseMoveLength / this.candleWidth)
      this.setCandlesticks(this.startIndex - this.counts, 50)
      this.draw()
    }
  } else {
    mouseMoveLength = Math.abs(mouseMoveLength)
    if (mouseMoveLength >= this.candleWidth) {
      this.counts = Math.floor(mouseMoveLength / this.candleWidth)
      this.setCandlesticks(this.startIndex + this.counts, 50)
      this.draw()
    }
  }
}

CandlestickChart.prototype.drawAuxiliaryLine = function (e) {
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
  if (this.mousePosition.y < this.marginTop) this.drawMouseOverlay = false

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

CandlestickChart.prototype.drawCurveLine = function () {
  function getControlPoints(pt0, pt1, pt2, t) {
    const x0 = pt0[0]
    const y0 = pt0[1]
    const x1 = pt1[0]
    const y1 = pt1[1]
    const x2 = pt2[0]
    const y2 = pt2[1]

    const d01 = Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2))
    const d12 = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))

    const fa = (t * d01) / (d01 + d12)
    const fb = t - fa

    const p1x = x1 + fa * (x0 - x2)
    const p1y = y1 + fa * (y0 - y2)

    const p2x = x1 - fb * (x0 - x2)
    const p2y = y1 - fb * (y0 - y2)

    return [
      [p1x, p1y],
      [p2x, p2y],
    ]
  }

  let cps = []
  let pts = []
  for (let i = 0; i < this.candlesticks.length; i++) {
    pts.push([
      this.xValueToPixelCoord(this.candlesticks[i].timestamp),
      this.yValueToPixelCoord(this.candlesticks[i].close),
    ])
  }
  for (let i = 1; i < this.candlesticks.length - 1; i++) {
    cps.push(...getControlPoints(pts[i - 1], pts[i], pts[i + 1], 0.8))
  }
  // 连接第一个和最后一个曲线
  this.context.strokeStyle = "white"
  this.context.lineWidth = 3
  this.context.beginPath()
  this.context.moveTo(pts[0][0], pts[0][1])
  this.context.quadraticCurveTo(cps[0][0], cps[0][1], pts[1][0], pts[1][1])
  this.context.stroke()
  this.context.closePath()
  this.context.beginPath()
  this.context.moveTo(pts[pts.length - 2][0], pts[pts.length - 2][1])
  this.context.quadraticCurveTo(
    cps[cps.length - 1][0],
    cps[cps.length - 1][1],
    pts[pts.length - 1][0],
    pts[pts.length - 1][1]
  )
  this.context.stroke()
  this.context.closePath()
  for (let i = 1; i < this.candlesticks.length - 2; i++) {
    this.context.beginPath()
    this.context.moveTo(pts[i][0], pts[i][1])
    this.context.bezierCurveTo(
      cps[i * 2 - 1][0],
      cps[i * 2 - 1][1],
      cps[i * 2][0],
      cps[i * 2][1],
      pts[i + 1][0],
      pts[i + 1][1]
    )
    this.context.stroke()
    this.context.closePath()
  }
  this.context.lineWidth = 1
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

  // 画曲线
  this.drawCurveLine()

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
      this.width - 65,
      this.mousePosition.y - 10,
      65,
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

    const color =
      this.candlesticks[this.hoveredCandlestickID].close >
      this.candlesticks[this.hoveredCandlestickID].open
        ? this.redHoverColor
        : this.greenHoverColor
    this.fillRect(this.mousePosition.x + 15, yPos - 5, 120, 90, color)
    this.fillRect(
      this.mousePosition.x + 20,
      yPos,
      110,
      80,
      this.mouseHoverBackgroundColor
    )

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

CandlestickChart.prototype.animation = function () {
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

  // 曲线的准备工作，生成 pts 和 cps
  function getControlPoints(pt0, pt1, pt2, t) {
    const x0 = pt0[0]
    const y0 = pt0[1]
    const x1 = pt1[0]
    const y1 = pt1[1]
    const x2 = pt2[0]
    const y2 = pt2[1]

    const d01 = Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2))
    const d12 = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))

    const fa = (t * d01) / (d01 + d12)
    const fb = t - fa

    const p1x = x1 + fa * (x0 - x2)
    const p1y = y1 + fa * (y0 - y2)

    const p2x = x1 - fb * (x0 - x2)
    const p2y = y1 - fb * (y0 - y2)

    return [
      [p1x, p1y],
      [p2x, p2y],
    ]
  }

  let cps = []
  let pts = []
  for (let i = 0; i < this.candlesticks.length; i++) {
    pts.push([
      this.xValueToPixelCoord(this.candlesticks[i].timestamp),
      this.yValueToPixelCoord(this.candlesticks[i].close),
    ])
  }
  for (let i = 1; i < this.candlesticks.length - 1; i++) {
    cps.push(...getControlPoints(pts[i - 1], pts[i], pts[i + 1], 0.5))
  }

  // 画曲线
  function drawCurveLine(now) {
    if (i - 50 === 0) {
      // 连接第一个曲线
      this.context.strokeStyle = "white"
      this.context.lineWidth = 3
      this.context.beginPath()
      this.context.moveTo(pts[0][0], pts[0][1])
      this.context.quadraticCurveTo(cps[0][0], cps[0][1], pts[1][0], pts[1][1])
      this.context.stroke()
      this.context.closePath()
    }
    if (i - 50 === 48) {
      this.context.beginPath()
      this.context.moveTo(pts[pts.length - 2][0], pts[pts.length - 2][1])
      this.context.quadraticCurveTo(
        cps[cps.length - 1][0],
        cps[cps.length - 1][1],
        pts[pts.length - 1][0],
        pts[pts.length - 1][1]
      )
      this.context.stroke()
      this.context.closePath()
      this.context.lineWidth = 1
    }
    if (i - 50 > 0 && i - 50 < 48) {
      const j = i - 50
      this.context.beginPath()
      this.context.moveTo(pts[j][0], pts[j][1])
      this.context.bezierCurveTo(
        cps[j * 2 - 1][0],
        cps[j * 2 - 1][1],
        cps[j * 2][0],
        cps[j * 2][1],
        pts[j + 1][0],
        pts[j + 1][1]
      )
      this.context.stroke()
      this.context.closePath()
    }
    i++
    if (i >= 50 && i < 99) {
      window.requestAnimationFrame(drawCurveLineThis)
    }
  }

  let i = 0
  let last = 0
  function drawCandle(now) {
    if (!last || now - last >= 0) {
      last = now
      const candlestick = this.candlesticks[i++]
      let color =
        candlestick.close > candlestick.open ? this.redColor : this.greenColor

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
    if (i < this.candlesticks.length) {
      window.requestAnimationFrame(drawCandleThis)
    }
    if (i >= 50 && i < 98) {
      window.requestAnimationFrame(drawCurveLineThis)
    }
  }
  // drawCandle drawCurveLine 里都用到了 CandlestickChart 实例，所以要绑定this
  let drawCandleThis = drawCandle.bind(this)
  let drawCurveLineThis = drawCurveLine.bind(this)

  window.requestAnimationFrame(drawCandleThis)
}

CandlestickChart.prototype.drawGrid = function () {
  const yinterval = (this.height - this.marginTop - this.marginBottom) / 6
  for (let i = 0; i <= 6; i++) {
    const yPiexl = yinterval * i + this.marginTop
    const yValue = this.yPixelToValueCoord(yPiexl)
    this.drawLine(0, yPiexl, this.width, yPiexl, this.gridColor)
    const textWidth = this.context.measureText(
      this.roundPriceValue(yValue)
    ).width
    this.context.fillStyle = this.gridTextColor
    this.context.fillText(
      this.roundPriceValue(yValue),
      this.width - textWidth - 5,
      this.yValueToPixelCoord(yValue) - 5
    )
  }
  const xValueInterval = this.candlesticks.length / 10
  for (let i = 4; i <= this.candlesticks.length; i += xValueInterval) {
    const xValue = this.candlesticks[i].timestamp
    const xPiexl = this.xValueToPixelCoord(xValue)
    this.drawLine(xPiexl, 0, xPiexl, this.height, this.gridColor)
    const date = new Date(xValue)
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
    this.context.fillText(dateStr, xPiexl + 5, this.height - 5)
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
  this.context.fillStyle = color
  this.roundRect(x, y, width, height, 5)
  this.context.fill()
}

CandlestickChart.prototype.drawRect = function (x, y, width, height, color) {
  this.context.strokeStyle = color
  this.roundRect(x, y, width, height, 5)
  this.context.stroke()
}

CandlestickChart.prototype.roundRect = function (x, y, width, height, r) {
  if (Math.abs(height) < 2 * r) {
    r = Math.abs(height) / 2
  }
  this.context.beginPath()
  this.context.moveTo(x + r, y)
  this.context.arcTo(x + width, y, x + width, y + height, r)
  this.context.arcTo(x + width, y + height, x, y + height, r)
  this.context.arcTo(x, y + height, x, y, r)
  this.context.arcTo(x, y, x + width, y, r)
  this.context.closePath()
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

function getData(endTime) {
  return new Promise((resolve, reject) => {
    var xmlhttp = new XMLHttpRequest()
    xmlhttp.open(
      "GET",
      `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=100${
        endTime ? "&endTime=" + endTime : ""
      }`
    )
    xmlhttp.onreadystatechange = function () {
      if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
        var json = JSON.parse(xmlhttp.responseText)
        const candles = []
        for (var i = 0; i < json.length; ++i) {
          candles.push(
            new Candlestick(
              json[i][0],
              json[i][1],
              json[i][4],
              json[i][2],
              json[i][3]
            )
          )
        }
        resolve(candles)
      }
    }
    xmlhttp.setRequestHeader(
      "Content-Type",
      "application/x-www-form-urlencoded"
    )
    xmlhttp.send()
  })
}
getData().then((res) => {
  const candlestickChart = new CandlestickChart("CandlestickChart")
  candlestickChart.cachedCandlesticks = res
  candlestickChart.setCandlesticks()
  candlestickChart.animation()
})

// const data = [
//   [
//     1621382400000,
//     "35212.04000000",
//     "35939.48000000",
//     "23741.41000000",
//     "30279.50000000",
//     "21674.74565200",
//     1621468799999,
//     "674674617.52058151",
//     643176,
//     "10645.62653900",
//     "331375889.93289458",
//     "0",
//   ],
//   [
//     1621468800000,
//     "30319.47000000",
//     "35204.63000000",
//     "28554.00000000",
//     "33359.97000000",
//     "13575.74232300",
//     1621555199999,
//     "444890787.82981721",
//     540232,
//     "6927.14724900",
//     "227171978.36678919",
//     "0",
//   ],
//   [
//     1621555200000,
//     "33349.96000000",
//     "34648.69000000",
//     "27697.77000000",
//     "30747.21000000",
//     "14214.71482700",
//     1621641599999,
//     "447729031.88006524",
//     496984,
//     "7125.97928800",
//     "225112106.09370834",
//     "0",
//   ],
//   [
//     1621641600000,
//     "30739.55000000",
//     "32046.21000000",
//     "29092.28000000",
//     "30895.05000000",
//     "7428.34857300",
//     1621727999999,
//     "229114066.45295256",
//     337564,
//     "3708.10559300",
//     "114402615.54006333",
//     "0",
//   ],
//   [
//     1621728000000,
//     "30894.96000000",
//     "31537.24000000",
//     "25641.05000000",
//     "28573.19000000",
//     "12288.74476800",
//     1621814399999,
//     "346439078.55764064",
//     434062,
//     "5976.72691000",
//     "168521983.38021896",
//     "0",
//   ],
//   [
//     1621814400000,
//     "28579.78000000",
//     "32850.00000000",
//     "28347.58000000",
//     "31918.73000000",
//     "9791.42134200",
//     1621900799999,
//     "301373607.22563220",
//     317628,
//     "5101.13006900",
//     "157008775.48303874",
//     "0",
//   ],
//   [
//     1621900800000,
//     "31918.74000000",
//     "32700.00000000",
//     "29800.00000000",
//     "31367.74000000",
//     "7433.61187800",
//     1621987199999,
//     "230798837.31650623",
//     237067,
//     "3926.18625900",
//     "121944846.87763443",
//     "0",
//   ],
//   [
//     1621987200000,
//     "31367.74000000",
//     "33421.61000000",
//     "30909.21000000",
//     "32280.58000000",
//     "6530.81341800",
//     1622073599999,
//     "210412614.97246485",
//     219855,
//     "3581.93348400",
//     "115517558.83943124",
//     "0",
//   ],
//   [
//     1622073600000,
//     "32276.13000000",
//     "33170.15000000",
//     "30616.19000000",
//     "31614.95000000",
//     "4671.36857700",
//     1622159999999,
//     "148971232.21947726",
//     180558,
//     "2364.61765200",
//     "75472302.59290189",
//     "0",
//   ],
//   [
//     1622160000000,
//     "31620.66000000",
//     "31900.48000000",
//     "28533.77000000",
//     "29349.23000000",
//     "8752.33477300",
//     1622246399999,
//     "261459301.63770837",
//     247402,
//     "4415.07783200",
//     "131935425.55298808",
//     "0",
//   ],
//   [
//     1622246400000,
//     "29348.90000000",
//     "30677.47000000",
//     "27733.33000000",
//     "28510.82000000",
//     "5934.73305600",
//     1622332799999,
//     "171317195.66081325",
//     183520,
//     "3010.15895100",
//     "86895856.97528562",
//     "0",
//   ],
//   [
//     1622332800000,
//     "28522.92000000",
//     "30049.95000000",
//     "27538.83000000",
//     "29331.47000000",
//     "3401.50623200",
//     1622419199999,
//     "99249292.44493610",
//     121814,
//     "1722.24451400",
//     "50278170.66978434",
//     "0",
//   ],
//   [
//     1622419200000,
//     "29330.33000000",
//     "30688.38000000",
//     "28127.30000000",
//     "30460.92000000",
//     "5215.50761800",
//     1622505599999,
//     "154871499.19037037",
//     213798,
//     "2705.38307500",
//     "80323604.70802540",
//     "0",
//   ],
//   [
//     1622505600000,
//     "30466.19000000",
//     "30984.02000000",
//     "29242.00000000",
//     "30043.16000000",
//     "4506.82638000",
//     1622591999999,
//     "134735266.52168772",
//     208041,
//     "2350.07749900",
//     "70253865.66712972",
//     "0",
//   ],
//   [
//     1622592000000,
//     "30043.14000000",
//     "31334.15000000",
//     "29400.13000000",
//     "30792.11000000",
//     "3564.74777100",
//     1622678399999,
//     "109079124.65033058",
//     174067,
//     "1841.64306000",
//     "56369987.01139805",
//     "0",
//   ],
//   [
//     1622678400000,
//     "30793.14000000",
//     "32419.92000000",
//     "30490.61000000",
//     "32394.26000000",
//     "3671.04065200",
//     1622764799999,
//     "116839773.99220549",
//     176263,
//     "1928.04332300",
//     "61349758.54149024",
//     "0",
//   ],
//   [
//     1622764800000,
//     "32394.26000000",
//     "32425.57000000",
//     "29391.04000000",
//     "30331.54000000",
//     "5880.61122900",
//     1622851199999,
//     "179250372.66650675",
//     213701,
//     "3010.92202800",
//     "91774438.35459307",
//     "0",
//   ],
//   [
//     1622851200000,
//     "30335.95000000",
//     "31274.95000000",
//     "28758.02000000",
//     "29324.32000000",
//     "4737.89246700",
//     1622937599999,
//     "141666035.65255379",
//     170282,
//     "2288.89631200",
//     "68463081.93397894",
//     "0",
//   ],
//   [
//     1622937600000,
//     "29323.95000000",
//     "30077.69000000",
//     "29035.00000000",
//     "29495.55000000",
//     "2585.04794000",
//     1623023999999,
//     "76589113.69290538",
//     106109,
//     "1299.04170900",
//     "38493718.07999404",
//     "0",
//   ],
//   [
//     1623024000000,
//     "29500.01000000",
//     "30315.00000000",
//     "27422.00000000",
//     "27631.54000000",
//     "4095.44483100",
//     1623110399999,
//     "119432933.66939227",
//     127907,
//     "2016.42933700",
//     "58909961.95495967",
//     "0",
//   ],
//   [
//     1623110400000,
//     "27617.88000000",
//     "28028.70000000",
//     "25481.73000000",
//     "27468.94000000",
//     "7323.11537700",
//     1623196799999,
//     "196996576.86844950",
//     211237,
//     "3675.00050700",
//     "98927655.22750897",
//     "0",
//   ],
//   [
//     1623196800000,
//     "27483.74000000",
//     "30855.00000000",
//     "26664.25000000",
//     "30735.66000000",
//     "6869.40591200",
//     1623283199999,
//     "198540533.85561822",
//     177408,
//     "3717.59191900",
//     "107434085.56961485",
//     "0",
//   ],
//   [
//     1623283200000,
//     "30739.10000000",
//     "31600.00000000",
//     "29452.75000000",
//     "30170.81000000",
//     "5930.50730100",
//     1623369599999,
//     "180799304.80410505",
//     159493,
//     "3081.31103700",
//     "93967975.15156086",
//     "0",
//   ],
//   [
//     1623369600000,
//     "30175.03000000",
//     "31013.30000000",
//     "29559.21000000",
//     "30882.86000000",
//     "4061.68428400",
//     1623455999999,
//     "123902671.98676039",
//     122649,
//     "2071.33249600",
//     "63193571.63899964",
//     "0",
//   ],
//   [
//     1623456000000,
//     "30871.15000000",
//     "30973.03000000",
//     "28694.73000000",
//     "29430.44000000",
//     "4088.46076400",
//     1623542399999,
//     "120863549.35713916",
//     109729,
//     "1975.42729200",
//     "58396601.42646032",
//     "0",
//   ],
//   [
//     1623542400000,
//     "29432.35000000",
//     "32531.94000000",
//     "28821.81000000",
//     "32179.31000000",
//     "4195.60107400",
//     1623628799999,
//     "128462305.40183844",
//     120145,
//     "2251.34813700",
//     "68904617.81265046",
//     "0",
//   ],
//   [
//     1623628800000,
//     "32179.32000000",
//     "33885.79000000",
//     "31992.76000000",
//     "33454.62000000",
//     "4778.92353400",
//     1623715199999,
//     "157101983.70761981",
//     199970,
//     "2510.54925100",
//     "82528846.74640021",
//     "0",
//   ],
//   [
//     1623715200000,
//     "33465.77000000",
//     "34116.39000000",
//     "32638.96000000",
//     "33148.73000000",
//     "4250.81979800",
//     1623801599999,
//     "141246147.35582282",
//     177419,
//     "2199.74111900",
//     "73102031.49890499",
//     "0",
//   ],
//   [
//     1623801600000,
//     "33140.68000000",
//     "33413.05000000",
//     "31733.24000000",
//     "31995.93000000",
//     "4359.55025200",
//     1623887999999,
//     "141560212.56791861",
//     168397,
//     "2168.28674100",
//     "70415566.82308891",
//     "0",
//   ],
//   [
//     1623888000000,
//     "31990.73000000",
//     "33119.16000000",
//     "31433.40000000",
//     "32019.75000000",
//     "3983.06118800",
//     1623974399999,
//     "128666424.59001803",
//     150151,
//     "2019.51551400",
//     "65222702.78165071",
//     "0",
//   ],
//   [
//     1623974400000,
//     "32022.87000000",
//     "32117.78000000",
//     "29637.45000000",
//     "30289.40000000",
//     "4608.41559100",
//     1624060799999,
//     "142534139.64276975",
//     177483,
//     "2256.94505200",
//     "69833538.60138075",
//     "0",
//   ],
//   [
//     1624060800000,
//     "30285.05000000",
//     "30783.39000000",
//     "29468.40000000",
//     "30011.32000000",
//     "3442.68014100",
//     1624147199999,
//     "103927144.61132035",
//     135642,
//     "1723.99497000",
//     "52045633.22066119",
//     "0",
//   ],
//   [
//     1624147200000,
//     "30011.33000000",
//     "30503.12000000",
//     "28220.00000000",
//     "29984.39000000",
//     "4934.21940400",
//     1624233599999,
//     "145100299.93623601",
//     171655,
//     "2443.95553700",
//     "71887565.04700714",
//     "0",
//   ],
//   [
//     1624233600000,
//     "29988.98000000",
//     "30112.88000000",
//     "26250.00000000",
//     "26545.52000000",
//     "10827.43033800",
//     1624319999999,
//     "298960194.21920567",
//     233309,
//     "5434.84340000",
//     "150028496.90254236",
//     "0",
//   ],
//   [
//     1624320000000,
//     "26555.78000000",
//     "27938.70000000",
//     "24220.00000000",
//     "27232.51000000",
//     "11490.45981600",
//     1624406399999,
//     "301466479.42224843",
//     237652,
//     "5938.03931300",
//     "155824672.61925248",
//     "0",
//   ],
//   [
//     1624406400000,
//     "27236.00000000",
//     "29159.84000000",
//     "26584.02000000",
//     "28254.88000000",
//     "5520.40150700",
//     1624492799999,
//     "156180856.41062089",
//     132790,
//     "2821.26951100",
//     "79867920.27805224",
//     "0",
//   ],
//   [
//     1624492800000,
//     "28256.31000000",
//     "29593.50000000",
//     "27128.28000000",
//     "29054.39000000",
//     "4197.28609800",
//     1624579199999,
//     "119000389.36120320",
//     106128,
//     "2261.02611600",
//     "64168440.48394724",
//     "0",
//   ],
//   [
//     1624579200000,
//     "29063.06000000",
//     "29736.83000000",
//     "26263.17000000",
//     "26513.08000000",
//     "5812.51631800",
//     1624665599999,
//     "160664142.48969220",
//     143736,
//     "2971.85075200",
//     "82232368.78859948",
//     "0",
//   ],
//   [
//     1624665600000,
//     "26512.80000000",
//     "27487.71000000",
//     "25372.52000000",
//     "27111.80000000",
//     "5892.80043400",
//     1624751999999,
//     "154959937.81029145",
//     138091,
//     "2829.19503000",
//     "74444540.71574134",
//     "0",
//   ],
//   [
//     1624752000000,
//     "27114.19000000",
//     "29100.00000000",
//     "26873.89000000",
//     "29095.05000000",
//     "4558.21928400",
//     1624838399999,
//     "126759665.12845546",
//     120563,
//     "2297.61786700",
//     "63919086.49265037",
//     "0",
//   ],
//   [
//     1624838400000,
//     "29082.09000000",
//     "29581.89000000",
//     "28434.26000000",
//     "28923.41000000",
//     "4149.15025300",
//     1624924799999,
//     "120019716.69646661",
//     162645,
//     "2131.43957600",
//     "61660835.13082996",
//     "0",
//   ],
//   [
//     1624924800000,
//     "28935.67000000",
//     "30782.79000000",
//     "28715.78000000",
//     "30169.50000000",
//     "4579.19844200",
//     1625011199999,
//     "137113829.36826202",
//     184863,
//     "2401.19382300",
//     "71905722.94634523",
//     "0",
//   ],
//   [
//     1625011200000,
//     "30172.69000000",
//     "30319.23000000",
//     "28727.27000000",
//     "29556.50000000",
//     "4046.24930000",
//     1625097599999,
//     "118647533.14816768",
//     159808,
//     "2034.55809100",
//     "59665799.47086813",
//     "0",
//   ],
//   [
//     1625097600000,
//     "29556.50000000",
//     "29565.39000000",
//     "27641.26000000",
//     "28292.54000000",
//     "4234.10620500",
//     1625183999999,
//     "119872036.96015166",
//     163180,
//     "2153.16403000",
//     "60949853.84758462",
//     "0",
//   ],
//   [
//     1625184000000,
//     "28295.17000000",
//     "28694.27000000",
//     "27631.57000000",
//     "28484.38000000",
//     "3249.55742000",
//     1625270399999,
//     "91366055.30167597",
//     141762,
//     "1676.42864000",
//     "47147562.16339237",
//     "0",
//   ],
//   [
//     1625270400000,
//     "28482.22000000",
//     "29474.23000000",
//     "28090.36000000",
//     "29201.46000000",
//     "2020.33152900",
//     1625356799999,
//     "58595205.28781706",
//     95078,
//     "1038.02630600",
//     "30107200.10595823",
//     "0",
//   ],
//   [
//     1625356800000,
//     "29195.79000000",
//     "30287.06000000",
//     "28932.38000000",
//     "29722.92000000",
//     "2037.32718200",
//     1625443199999,
//     "60686662.51211640",
//     90335,
//     "1067.00543900",
//     "31784465.53638051",
//     "0",
//   ],
//   [
//     1625443200000,
//     "29722.66000000",
//     "29722.66000000",
//     "27952.06000000",
//     "28414.28000000",
//     "3275.80558000",
//     1625529599999,
//     "94009033.79908622",
//     99843,
//     "1621.29002600",
//     "46515968.77722363",
//     "0",
//   ],
//   [
//     1625529600000,
//     "28419.53000000",
//     "29646.04000000",
//     "28377.29000000",
//     "28950.14000000",
//     "2776.95899400",
//     1625615999999,
//     "80251217.45407344",
//     90854,
//     "1423.66820000",
//     "41165965.00982296",
//     "0",
//   ],
//   [
//     1625616000000,
//     "28950.93000000",
//     "29659.80000000",
//     "28688.51000000",
//     "28751.47000000",
//     "2201.01922900",
//     1625702399999,
//     "64420782.98167618",
//     85153,
//     "1083.72138900",
//     "31740635.53540068",
//     "0",
//   ],
//   [
//     1625702400000,
//     "28747.67000000",
//     "28806.76000000",
//     "27134.03000000",
//     "27773.14000000",
//     "3352.23636200",
//     1625788799999,
//     "93226018.16136415",
//     105657,
//     "1680.62577100",
//     "46742795.86959674",
//     "0",
//   ],
//   [
//     1625788800000,
//     "27773.13000000",
//     "28728.29000000",
//     "27272.60000000",
//     "28503.37000000",
//     "1841.25038400",
//     1625875199999,
//     "51519373.31350377",
//     67691,
//     "929.35882200",
//     "26010528.81966984",
//     "0",
//   ],
//   [
//     1625875200000,
//     "28505.47000000",
//     "28873.33000000",
//     "27867.37000000",
//     "28268.54000000",
//     "1451.67512100",
//     1625961599999,
//     "41217016.90764127",
//     56634,
//     "722.87327700",
//     "20524696.06296149",
//     "0",
//   ],
//   [
//     1625961600000,
//     "28266.12000000",
//     "29146.51000000",
//     "28112.55000000",
//     "28857.07000000",
//     "1339.78657300",
//     1626047999999,
//     "38324541.76734254",
//     56310,
//     "671.83981300",
//     "19235213.63929419",
//     "0",
//   ],
//   [
//     1626048000000,
//     "28862.65000000",
//     "29219.34000000",
//     "27584.26000000",
//     "27945.58000000",
//     "2052.26240500",
//     1626134399999,
//     "58152594.43664721",
//     98948,
//     "996.08090400",
//     "28232538.50050872",
//     "0",
//   ],
//   [
//     1626134400000,
//     "27941.83000000",
//     "28207.58000000",
//     "27398.02000000",
//     "27988.95000000",
//     "2082.01085100",
//     1626220799999,
//     "57872574.40713692",
//     96273,
//     "1002.47148600",
//     "27869709.98871549",
//     "0",
//   ],
//   [
//     1626220800000,
//     "27983.21000000",
//     "28358.99000000",
//     "27083.00000000",
//     "28172.11000000",
//     "2302.33577400",
//     1626307199999,
//     "63969546.54065197",
//     109192,
//     "1140.30273700",
//     "31686413.76465757",
//     "0",
//   ],
//   [
//     1626307200000,
//     "28171.96000000",
//     "28482.91000000",
//     "26814.54000000",
//     "27347.44000000",
//     "2524.12896100",
//     1626393599999,
//     "69228491.55341625",
//     118836,
//     "1177.90635500",
//     "32298705.86692528",
//     "0",
//   ],
//   [
//     1626393600000,
//     "27347.48000000",
//     "27476.74000000",
//     "26539.64000000",
//     "26700.19000000",
//     "2625.22601200",
//     1626479999999,
//     "70905027.82065819",
//     110704,
//     "1420.86659200",
//     "38373328.49748894",
//     "0",
//   ],
//   [
//     1626480000000,
//     "26699.29000000",
//     "27347.24000000",
//     "26517.80000000",
//     "26954.11000000",
//     "1331.62577000",
//     1626566399999,
//     "35923659.69456205",
//     80046,
//     "683.62588700",
//     "18444065.56155621",
//     "0",
//   ],
//   [
//     1626566400000,
//     "26954.10000000",
//     "27678.55000000",
//     "26696.00000000",
//     "27191.82000000",
//     "1375.17684900",
//     1626652799999,
//     "37344842.42867033",
//     67705,
//     "675.58653800",
//     "18353455.40512863",
//     "0",
//   ],
//   [
//     1626652800000,
//     "27191.82000000",
//     "27334.49000000",
//     "26005.17000000",
//     "26440.52000000",
//     "2133.78672300",
//     1626739199999,
//     "56700950.24132241",
//     82561,
//     "1102.16279000",
//     "29314423.75802124",
//     "0",
//   ],
//   [
//     1626739200000,
//     "26444.28000000",
//     "26628.20000000",
//     "25165.23000000",
//     "25646.44000000",
//     "3245.27880600",
//     1626825599999,
//     "83194651.94186388",
//     109650,
//     "1450.80919100",
//     "37199648.68940671",
//     "0",
//   ],
//   [
//     1626825600000,
//     "25652.34000000",
//     "28095.14000000",
//     "25410.46000000",
//     "27590.42000000",
//     "3319.20411400",
//     1626911999999,
//     "89838504.75253591",
//     115726,
//     "1648.54856800",
//     "44606646.35734976",
//     "0",
//   ],
//   [
//     1626912000000,
//     "27596.94000000",
//     "27875.94000000",
//     "27217.89000000",
//     "27724.92000000",
//     "1642.78140000",
//     1626998399999,
//     "45276956.03099085",
//     74925,
//     "755.48267400",
//     "20824837.22938448",
//     "0",
//   ],
//   [
//     1626998400000,
//     "27724.92000000",
//     "28837.53000000",
//     "27470.00000000",
//     "28837.53000000",
//     "1683.75257400",
//     1627084799999,
//     "47138306.39790681",
//     76768,
//     "835.04700300",
//     "23393096.68208913",
//     "0",
//   ],
//   [
//     1627084800000,
//     "28837.53000000",
//     "29628.70000000",
//     "28605.75000000",
//     "29386.13000000",
//     "1817.49069800",
//     1627171199999,
//     "52838854.72600940",
//     79244,
//     "874.28429000",
//     "25422664.25106012",
//     "0",
//   ],
//   [
//     1627171200000,
//     "29387.87000000",
//     "30300.00000000",
//     "29059.35000000",
//     "30293.35000000",
//     "1900.17891800",
//     1627257599999,
//     "56119258.31939024",
//     80882,
//     "934.03418800",
//     "27595662.82593325",
//     "0",
//   ],
//   [
//     1627257600000,
//     "30292.48000000",
//     "34491.12000000",
//     "30140.50000000",
//     "31686.90000000",
//     "7561.06581300",
//     1627343999999,
//     "246963754.87552543",
//     286096,
//     "3775.73580900",
//     "123329222.28632159",
//     "0",
//   ],
//   [
//     1627344000000,
//     "31690.18000000",
//     "33733.00000000",
//     "30988.54000000",
//     "33678.96000000",
//     "4584.19444600",
//     1627430399999,
//     "147934778.52404151",
//     184911,
//     "2273.67313400",
//     "73384699.15347462",
//     "0",
//   ],
//   [
//     1627430400000,
//     "33674.94000000",
//     "34857.42000000",
//     "33206.56000000",
//     "34153.08000000",
//     "5005.03695900",
//     1627516799999,
//     "170356219.58978065",
//     207325,
//     "2522.66218400",
//     "85879012.70908282",
//     "0",
//   ],
//   [
//     1627516800000,
//     "34151.37000000",
//     "34612.69000000",
//     "33520.00000000",
//     "33996.25000000",
//     "2921.17365700",
//     1627603199999,
//     "99235073.15621370",
//     140212,
//     "1436.17161700",
//     "48793910.22626653",
//     "0",
//   ],
//   [
//     1627603200000,
//     "33996.26000000",
//     "35798.12000000",
//     "32569.55000000",
//     "35710.60000000",
//     "3431.19070000",
//     1627689599999,
//     "116360996.80409220",
//     160219,
//     "1741.34747300",
//     "59155839.35983416",
//     "0",
//   ],
//   [
//     1627689600000,
//     "35710.60000000",
//     "35870.00000000",
//     "34807.98000000",
//     "35264.66000000",
//     "2328.54095000",
//     1627775999999,
//     "82215877.68623736",
//     115423,
//     "1154.49365000",
//     "40760858.34566927",
//     "0",
//   ],
//   [
//     1627776000000,
//     "35257.65000000",
//     "36134.00000000",
//     "33710.00000000",
//     "34030.17000000",
//     "2850.78574900",
//     1627862399999,
//     "100074724.41157124",
//     140987,
//     "1356.45728700",
//     "47632966.61039975",
//     "0",
//   ],
//   [
//     1627862400000,
//     "34033.95000000",
//     "34463.64000000",
//     "32980.65000000",
//     "33361.78000000",
//     "2798.38354600",
//     1627948799999,
//     "94302933.20231130",
//     114184,
//     "1332.41628800",
//     "44911647.72742458",
//     "0",
//   ],
//   [
//     1627948800000,
//     "33361.77000000",
//     "33881.50000000",
//     "32105.00000000",
//     "32509.13000000",
//     "2937.77582200",
//     1628035199999,
//     "96101553.67109200",
//     116579,
//     "1445.21954000",
//     "47284872.54970868",
//     "0",
//   ],
//   [
//     1628035200000,
//     "32509.14000000",
//     "34123.73000000",
//     "32007.01000000",
//     "33925.05000000",
//     "2470.27473600",
//     1628121599999,
//     "81600009.05601885",
//     105846,
//     "1258.27442000",
//     "41581621.75583413",
//     "0",
//   ],
//   [
//     1628121600000,
//     "33918.77000000",
//     "35285.51000000",
//     "32040.11000000",
//     "34902.23000000",
//     "3612.67072200",
//     1628207999999,
//     "121357048.20238435",
//     139277,
//     "1855.38409500",
//     "62412697.15237994",
//     "0",
//   ],
//   [
//     1628208000000,
//     "34899.95000000",
//     "37182.77000000",
//     "34106.00000000",
//     "36742.05000000",
//     "3784.78206000",
//     1628294399999,
//     "134787936.04549264",
//     147168,
//     "1817.51917900",
//     "64739877.31556823",
//     "0",
//   ],
//   [
//     1628294400000,
//     "36747.57000000",
//     "38521.23000000",
//     "36544.83000000",
//     "38415.20000000",
//     "3506.54829500",
//     1628380799999,
//     "131615254.80246507",
//     147303,
//     "1767.53647400",
//     "66362916.51943507",
//     "0",
//   ],
//   [
//     1628380800000,
//     "38421.79000000",
//     "39086.24000000",
//     "37261.29000000",
//     "37877.86000000",
//     "3106.46758700",
//     1628467199999,
//     "118760696.59566965",
//     132579,
//     "1517.05687400",
//     "58003860.14256994",
//     "0",
//   ],
//   [
//     1628467200000,
//     "37855.95000000",
//     "40106.01000000",
//     "36936.00000000",
//     "39916.95000000",
//     "3286.57283100",
//     1628553599999,
//     "127540810.09638015",
//     143155,
//     "1708.16293500",
//     "66265699.75205818",
//     "0",
//   ],
//   [
//     1628553600000,
//     "39900.85000000",
//     "40266.88000000",
//     "38644.66000000",
//     "39398.20000000",
//     "2242.83736000",
//     1628639999999,
//     "88369086.62876636",
//     106462,
//     "1091.25264400",
//     "42982366.09958792",
//     "0",
//   ],
//   [
//     1628640000000,
//     "39400.65000000",
//     "40500.01000000",
//     "39200.00000000",
//     "39505.43000000",
//     "2103.19635500",
//     1628726399999,
//     "84098896.79290050",
//     105731,
//     "1080.50552700",
//     "43203867.72224653",
//     "0",
//   ],
//   [
//     1628726400000,
//     "39505.43000000",
//     "40041.94000000",
//     "37903.64000000",
//     "38473.81000000",
//     "2350.60698300",
//     1628812799999,
//     "91508943.27894646",
//     100834,
//     "1165.88672900",
//     "45402534.36480831",
//     "0",
//   ],
//   [
//     1628812800000,
//     "38472.82000000",
//     "41130.45000000",
//     "38329.59000000",
//     "40942.36000000",
//     "1784.49886800",
//     1628899199999,
//     "71471937.25017333",
//     84419,
//     "896.41368800",
//     "35887543.29437894",
//     "0",
//   ],
//   [
//     1628899200000,
//     "40952.21000000",
//     "41339.99000000",
//     "39650.00000000",
//     "40391.36000000",
//     "1734.22831300",
//     1628985599999,
//     "70037660.32071701",
//     82523,
//     "856.84013900",
//     "34617259.24254242",
//     "0",
//   ],
//   [
//     1628985600000,
//     "40395.25000000",
//     "40576.00000000",
//     "39152.45000000",
//     "40260.03000000",
//     "1650.76338700",
//     1629071999999,
//     "65711408.58513117",
//     78170,
//     "790.59359600",
//     "31451400.50799586",
//     "0",
//   ],
//   [
//     1629072000000,
//     "40263.24000000",
//     "41100.00000000",
//     "39345.00000000",
//     "39607.08000000",
//     "1618.91032900",
//     1629158399999,
//     "65129323.09847458",
//     85100,
//     "802.23421600",
//     "32278903.20071811",
//     "0",
//   ],
//   [
//     1629158400000,
//     "39608.21000000",
//     "40489.99000000",
//     "38421.05000000",
//     "38735.12000000",
//     "1593.29364700",
//     1629244799999,
//     "63041294.44162247",
//     84914,
//     "747.25301100",
//     "29566784.46527850",
//     "0",
//   ],
//   [
//     1629244800000,
//     "38720.65000000",
//     "39771.33000000",
//     "38350.12000000",
//     "38712.64000000",
//     "1746.28353900",
//     1629331199999,
//     "68201137.59344307",
//     82675,
//     "886.42542600",
//     "34614610.58427454",
//     "0",
//   ],
//   [
//     1629331200000,
//     "38714.54000000",
//     "40333.00000000",
//     "38174.79000000",
//     "40162.69000000",
//     "1987.50700400",
//     1629417599999,
//     "77857379.53873595",
//     87338,
//     "1012.71711300",
//     "39674132.94660466",
//     "0",
//   ],
//   [
//     1629417600000,
//     "40167.33000000",
//     "42208.52000000",
//     "40034.90000000",
//     "42192.75000000",
//     "1856.24051300",
//     1629503999999,
//     "76163481.33768021",
//     93046,
//     "960.09659900",
//     "39423741.11791303",
//     "0",
//   ],
//   [
//     1629504000000,
//     "42193.02000000",
//     "42735.09000000",
//     "41479.14000000",
//     "42005.00000000",
//     "1542.11753900",
//     1629590399999,
//     "64907938.08041324",
//     81578,
//     "826.26235800",
//     "34784201.51311382",
//     "0",
//   ],
//   [
//     1629590400000,
//     "42013.49000000",
//     "42687.52000000",
//     "41505.00000000",
//     "42425.85000000",
//     "1131.74504000",
//     1629676799999,
//     "47650794.52921400",
//     62905,
//     "561.54748200",
//     "23646532.92251497",
//     "0",
//   ],
//   [
//     1629676800000,
//     "42422.74000000",
//     "43244.94000000",
//     "42180.00000000",
//     "42552.11000000",
//     "1571.20599200",
//     1629763199999,
//     "67205217.02128617",
//     86644,
//     "783.02299900",
//     "33501063.96367825",
//     "0",
//   ],
//   [
//     1629763200000,
//     "42548.26000000",
//     "42813.02000000",
//     "41000.00000000",
//     "41120.89000000",
//     "1874.93441500",
//     1629849599999,
//     "78482348.23824196",
//     92813,
//     "916.09379600",
//     "38354071.46252227",
//     "0",
//   ],
//   [
//     1629849600000,
//     "41112.18000000",
//     "42411.57000000",
//     "40683.88000000",
//     "42185.60000000",
//     "1540.31279900",
//     1629935999999,
//     "63986392.45632579",
//     78244,
//     "797.39709000",
//     "33135212.51675318",
//     "0",
//   ],
//   [
//     1629936000000,
//     "42185.11000000",
//     "42493.68000000",
//     "40220.00000000",
//     "40607.44000000",
//     "922.40178900",
//     1630022399999,
//     "37776115.75426768",
//     41646,
//     "437.07298300",
//     "17905863.86598058",
//     "0",
//   ],
// ]
// const candles = []
// for (var i = 0; i < data.length; ++i) {
//   candles.push(
//     new Candlestick(
//       data[i][0],
//       data[i][1],
//       data[i][4],
//       data[i][2],
//       data[i][3]
//     )
//   )
// }
// const candlestickChart = new CandlestickChart("CandlestickChart")
// candlestickChart.cachedCandlesticks = candles
// candlestickChart.setCandlesticks()
// candlestickChart.animation()
