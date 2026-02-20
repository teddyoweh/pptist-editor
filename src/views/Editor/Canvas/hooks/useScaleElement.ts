import type { Ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore, useKeyboardStore } from '@/store'
import type { PPTElement, PPTImageElement, PPTLineElement, PPTShapeElement } from '@/types/slides'
import { OperateResizeHandlers, type AlignmentLineProps, type MultiSelectRange } from '@/types/edit'
import { MIN_SIZE } from '@/configs/element'
import { SHAPE_PATH_FORMULAS } from '@/configs/shapes'
import { type AlignLine, uniqAlignLines } from '@/utils/element'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'

interface RotateElementData {
  left: number
  top: number
  width: number
  height: number
}

/**
 * Calculate positions of eight resize handles for a rotated element
 * @param element Original element position and size info
 * @param angle Rotation angle
 */
const getRotateElementPoints = (element: RotateElementData, angle: number) => {
  const { left, top, width, height } = element

  const radius = Math.sqrt( Math.pow(width, 2) + Math.pow(height, 2) ) / 2
  const auxiliaryAngle = Math.atan(height / width) * 180 / Math.PI

  const tlbraRadian = (180 - angle - auxiliaryAngle) * Math.PI / 180
  const trblaRadian = (auxiliaryAngle - angle) * Math.PI / 180
  const taRadian = (90 - angle) * Math.PI / 180
  const raRadian = angle * Math.PI / 180

  const halfWidth = width / 2
  const halfHeight = height / 2

  const middleLeft = left + halfWidth
  const middleTop = top + halfHeight

  const leftTopPoint = {
    left: middleLeft + radius * Math.cos(tlbraRadian),
    top: middleTop - radius * Math.sin(tlbraRadian),
  }
  const topPoint = {
    left: middleLeft + halfHeight * Math.cos(taRadian),
    top: middleTop - halfHeight * Math.sin(taRadian),
  }
  const rightTopPoint = {
    left: middleLeft + radius * Math.cos(trblaRadian),
    top: middleTop - radius * Math.sin(trblaRadian),
  }
  const rightPoint = {
    left: middleLeft + halfWidth * Math.cos(raRadian),
    top: middleTop + halfWidth * Math.sin(raRadian),
  }
  const rightBottomPoint = {
    left: middleLeft - radius * Math.cos(tlbraRadian),
    top: middleTop + radius * Math.sin(tlbraRadian),
  }
  const bottomPoint = {
    left: middleLeft - halfHeight * Math.sin(raRadian),
    top: middleTop + halfHeight * Math.cos(raRadian),
  }
  const leftBottomPoint = {
    left: middleLeft - radius * Math.cos(trblaRadian),
    top: middleTop + radius * Math.sin(trblaRadian),
  }
  const leftPoint = {
    left: middleLeft - halfWidth * Math.cos(raRadian),
    top: middleTop - halfWidth * Math.sin(raRadian),
  }

  return { leftTopPoint, topPoint, rightTopPoint, rightPoint, rightBottomPoint, bottomPoint, leftBottomPoint, leftPoint }
}

/**
 * Get the opposite point of a resize handle, e.g., top corresponds to bottom, top-left to bottom-right
 * @param direction Current resize handle being operated
 * @param points Positions of eight resize handles for the rotated element
 */
const getOppositePoint = (direction: OperateResizeHandlers, points: ReturnType<typeof getRotateElementPoints>): { left: number; top: number } => {
  const oppositeMap = {
    [OperateResizeHandlers.RIGHT_BOTTOM]: points.leftTopPoint,
    [OperateResizeHandlers.LEFT_BOTTOM]: points.rightTopPoint,
    [OperateResizeHandlers.LEFT_TOP]: points.rightBottomPoint,
    [OperateResizeHandlers.RIGHT_TOP]: points.leftBottomPoint,
    [OperateResizeHandlers.TOP]: points.bottomPoint,
    [OperateResizeHandlers.BOTTOM]: points.topPoint,
    [OperateResizeHandlers.LEFT]: points.rightPoint,
    [OperateResizeHandlers.RIGHT]: points.leftPoint,
  }
  return oppositeMap[direction]
}

export default (
  elementList: Ref<PPTElement[]>,
  alignmentLines: Ref<AlignmentLineProps[]>,
  canvasScale: Ref<number>,
) => {
  const mainStore = useMainStore()
  const slidesStore = useSlidesStore()
  const { activeElementIdList, activeGroupElementId } = storeToRefs(mainStore)
  const { viewportRatio, viewportSize } = storeToRefs(slidesStore)
  const { ctrlOrShiftKeyActive } = storeToRefs(useKeyboardStore())

  const { addHistorySnapshot } = useHistorySnapshot()

  // Scale element
  const scaleElement = (e: MouseEvent | TouchEvent, element: Exclude<PPTElement, PPTLineElement>, command: OperateResizeHandlers) => {
    const isTouchEvent = !(e instanceof MouseEvent)
    if (isTouchEvent && (!e.changedTouches || !e.changedTouches[0])) return

    let isMouseDown = true
    mainStore.setScalingState(true)

    const elOriginLeft = element.left
    const elOriginTop = element.top
    const elOriginWidth = element.width
    const elOriginHeight = element.height

    const originTableCellMinHeight = element.type === 'table' ? element.cellMinHeight : 0
    
    const elRotate = ('rotate' in element && element.rotate) ? element.rotate : 0
    const rotateRadian = Math.PI * elRotate / 180

    const fixedRatio = ctrlOrShiftKeyActive.value || ('fixedRatio' in element && element.fixedRatio)
    const aspectRatio = elOriginWidth / elOriginHeight

    const startPageX = isTouchEvent ? e.changedTouches[0].pageX : e.pageX
    const startPageY = isTouchEvent ? e.changedTouches[0].pageY : e.pageY

    // Minimum element size limit
    const minSize = MIN_SIZE[element.type] || 20
    const getSizeWithinRange = (size: number, type: 'width' | 'height') => {
      if (!fixedRatio) return size < minSize ? minSize : size

      let minWidth = minSize
      let minHeight = minSize
      const ratio = element.width / element.height
      if (ratio < 1) minHeight = minSize / ratio
      if (ratio > 1) minWidth = minSize * ratio

      if (type === 'width') return size < minWidth ? minWidth : size
      return size < minHeight ? minHeight : size
    }

    let points: ReturnType<typeof getRotateElementPoints>
    let baseLeft = 0
    let baseTop = 0
    let horizontalLines: AlignLine[] = []
    let verticalLines: AlignLine[] = []

    // When scaling a rotated element, use the concept of a base point - the opposite point of the current resize handle
    // For example, when dragging the bottom-right corner, the top-left is the base point that should remain fixed
    if ('rotate' in element && element.rotate) {
      const { left, top, width, height } = element
      points = getRotateElementPoints({ left, top, width, height }, elRotate)
      const oppositePoint = getOppositePoint(command, points)

      baseLeft = oppositePoint.left
      baseTop = oppositePoint.top
    }

    // Non-rotated elements have snap alignment when scaling; collect alignment lines here
    // Include all snap positions of other elements on canvas: top, bottom, left, right edges
    // Lines and rotated elements do not participate in snap alignment
    else {
      const edgeWidth = viewportSize.value
      const edgeHeight = viewportSize.value * viewportRatio.value
      const isActiveGroupElement = element.id === activeGroupElementId.value
      
      for (const el of elementList.value) {
        if ('rotate' in el && el.rotate) continue
        if (el.type === 'line') continue
        if (isActiveGroupElement && el.id === element.id) continue
        if (!isActiveGroupElement && activeElementIdList.value.includes(el.id)) continue

        const left = el.left
        const top = el.top
        const width = el.width
        const height = el.height
        const right = left + width
        const bottom = top + height

        const topLine: AlignLine = { value: top, range: [left, right] }
        const bottomLine: AlignLine = { value: bottom, range: [left, right] }
        const leftLine: AlignLine = { value: left, range: [top, bottom] }
        const rightLine: AlignLine = { value: right, range: [top, bottom] }

        horizontalLines.push(topLine, bottomLine)
        verticalLines.push(leftLine, rightLine)
      }

      // Canvas viewport boundaries: four edges, horizontal center, vertical center
      const edgeTopLine: AlignLine = { value: 0, range: [0, edgeWidth] }
      const edgeBottomLine: AlignLine = { value: edgeHeight, range: [0, edgeWidth] }
      const edgeHorizontalCenterLine: AlignLine = { value: edgeHeight / 2, range: [0, edgeWidth] }
      const edgeLeftLine: AlignLine = { value: 0, range: [0, edgeHeight] }
      const edgeRightLine: AlignLine = { value: edgeWidth, range: [0, edgeHeight] }
      const edgeVerticalCenterLine: AlignLine = { value: edgeWidth / 2, range: [0, edgeHeight] }

      horizontalLines.push(edgeTopLine, edgeBottomLine, edgeHorizontalCenterLine)
      verticalLines.push(edgeLeftLine, edgeRightLine, edgeVerticalCenterLine)
      
      horizontalLines = uniqAlignLines(horizontalLines)
      verticalLines = uniqAlignLines(verticalLines)
    }
    
    // Snap alignment method
    // Compare collected alignment lines with target element's current position/size; auto-correct when difference is within threshold
    // Horizontal and vertical directions are calculated separately
    const alignedAdsorption = (currentX: number | null, currentY: number | null) => {
      const sorptionRange = 5

      const _alignmentLines: AlignmentLineProps[] = []
      let isVerticalAdsorbed = false
      let isHorizontalAdsorbed = false
      const correctionVal = { offsetX: 0, offsetY: 0 }
      
      if (currentY || currentY === 0) {
        for (let i = 0; i < horizontalLines.length; i++) {
          const { value, range } = horizontalLines[i]
          const min = Math.min(...range, currentX || 0)
          const max = Math.max(...range, currentX || 0)
          
          if (Math.abs(currentY - value) < sorptionRange && !isHorizontalAdsorbed) {
            correctionVal.offsetY = currentY - value
            isHorizontalAdsorbed = true
            _alignmentLines.push({ type: 'horizontal', axis: {x: min - 50, y: value}, length: max - min + 100 })
          }
        }
      }
      if (currentX || currentX === 0) {
        for (let i = 0; i < verticalLines.length; i++) {
          const { value, range } = verticalLines[i]
          const min = Math.min(...range, (currentY || 0))
          const max = Math.max(...range, (currentY || 0))

          if (Math.abs(currentX - value) < sorptionRange && !isVerticalAdsorbed) {
            correctionVal.offsetX = currentX - value
            isVerticalAdsorbed = true
            _alignmentLines.push({ type: 'vertical', axis: {x: value, y: min - 50}, length: max - min + 100 })
          }
        }
      }
      alignmentLines.value = _alignmentLines
      return correctionVal
    }

    const handleMousemove = (e: MouseEvent | TouchEvent) => {
      if (!isMouseDown) return

      const currentPageX = e instanceof MouseEvent ? e.pageX : e.changedTouches[0].pageX
      const currentPageY = e instanceof MouseEvent ? e.pageY : e.changedTouches[0].pageY

      const x = currentPageX - startPageX
      const y = currentPageY - startPageY

      let width = elOriginWidth
      let height = elOriginHeight
      let left = elOriginLeft
      let top = elOriginTop
      
      // When element is rotated, recalculate scaling distance based on rotation angle (mouse movement distance)
      if (elRotate) {
        const revisedX = (Math.cos(rotateRadian) * x + Math.sin(rotateRadian) * y) / canvasScale.value
        let revisedY = (Math.cos(rotateRadian) * y - Math.sin(rotateRadian) * x) / canvasScale.value

        // Lock aspect ratio (only triggered by corners, not edges)
        // Use horizontal scaling distance as base to calculate vertical scaling distance, maintaining same ratio
        if (fixedRatio) {
          if (command === OperateResizeHandlers.RIGHT_BOTTOM || command === OperateResizeHandlers.LEFT_TOP) revisedY = revisedX / aspectRatio
          if (command === OperateResizeHandlers.LEFT_BOTTOM || command === OperateResizeHandlers.RIGHT_TOP) revisedY = -revisedX / aspectRatio
        }

        // Calculate element size and position after scaling based on different resize handles
        // Note: Position calculated here needs correction later, as scaling a rotated element changes the base point position
        // (visually the base point stays fixed, but this is the combined result of rotation + movement)
        // Size doesn't need correction as scaling distance was already recalculated above
        if (command === OperateResizeHandlers.RIGHT_BOTTOM) {
          width = getSizeWithinRange(elOriginWidth + revisedX, 'width')
          height = getSizeWithinRange(elOriginHeight + revisedY, 'height')
        }
        else if (command === OperateResizeHandlers.LEFT_BOTTOM) {
          width = getSizeWithinRange(elOriginWidth - revisedX, 'width')
          height = getSizeWithinRange(elOriginHeight + revisedY, 'height')
          left = elOriginLeft - (width - elOriginWidth)
        }
        else if (command === OperateResizeHandlers.LEFT_TOP) {
          width = getSizeWithinRange(elOriginWidth - revisedX, 'width')
          height = getSizeWithinRange(elOriginHeight - revisedY, 'height')
          left = elOriginLeft - (width - elOriginWidth)
          top = elOriginTop - (height - elOriginHeight)
        }
        else if (command === OperateResizeHandlers.RIGHT_TOP) {
          width = getSizeWithinRange(elOriginWidth + revisedX, 'width')
          height = getSizeWithinRange(elOriginHeight - revisedY, 'height')
          top = elOriginTop - (height - elOriginHeight)
        }
        else if (command === OperateResizeHandlers.TOP) {
          height = getSizeWithinRange(elOriginHeight - revisedY, 'height')
          top = elOriginTop - (height - elOriginHeight)
        }
        else if (command === OperateResizeHandlers.BOTTOM) {
          height = getSizeWithinRange(elOriginHeight + revisedY, 'height')
        }
        else if (command === OperateResizeHandlers.LEFT) {
          width = getSizeWithinRange(elOriginWidth - revisedX, 'width')
          left = elOriginLeft - (width - elOriginWidth)
        }
        else if (command === OperateResizeHandlers.RIGHT) {
          width = getSizeWithinRange(elOriginWidth + revisedX, 'width')
        }

        // Get current element's base point coordinates, compare with initial state, and calculate offset for position correction
        const currentPoints = getRotateElementPoints({ width, height, left, top }, elRotate)
        const currentOppositePoint = getOppositePoint(command, currentPoints)
        const currentBaseLeft = currentOppositePoint.left
        const currentBaseTop = currentOppositePoint.top

        const offsetX = currentBaseLeft - baseLeft
        const offsetY = currentBaseTop - baseTop

        left = left - offsetX
        top = top - offsetY
      }

      // When element is not rotated, simply calculate new position and size without complex corrections
      // Also handle snap alignment operations
      // Aspect ratio locking works the same as above
      else {
        let moveX = x / canvasScale.value
        let moveY = y / canvasScale.value

        if (fixedRatio) {
          if (command === OperateResizeHandlers.RIGHT_BOTTOM || command === OperateResizeHandlers.LEFT_TOP) moveY = moveX / aspectRatio
          if (command === OperateResizeHandlers.LEFT_BOTTOM || command === OperateResizeHandlers.RIGHT_TOP) moveY = -moveX / aspectRatio
        }

        if (command === OperateResizeHandlers.RIGHT_BOTTOM) {
          const { offsetX, offsetY } = alignedAdsorption(elOriginLeft + elOriginWidth + moveX, elOriginTop + elOriginHeight + moveY)
          moveX = moveX - offsetX
          moveY = moveY - offsetY
          if (fixedRatio) {
            if (offsetY) moveX = moveY * aspectRatio
            else moveY = moveX / aspectRatio
          }
          width = getSizeWithinRange(elOriginWidth + moveX, 'width')
          height = getSizeWithinRange(elOriginHeight + moveY, 'height')
        }
        else if (command === OperateResizeHandlers.LEFT_BOTTOM) {
          const { offsetX, offsetY } = alignedAdsorption(elOriginLeft + moveX, elOriginTop + elOriginHeight + moveY)
          moveX = moveX - offsetX
          moveY = moveY - offsetY
          if (fixedRatio) {
            if (offsetY) moveX = -moveY * aspectRatio
            else moveY = -moveX / aspectRatio
          }
          width = getSizeWithinRange(elOriginWidth - moveX, 'width')
          height = getSizeWithinRange(elOriginHeight + moveY, 'height')
          left = elOriginLeft - (width - elOriginWidth)
        }
        else if (command === OperateResizeHandlers.LEFT_TOP) {
          const { offsetX, offsetY } = alignedAdsorption(elOriginLeft + moveX, elOriginTop + moveY)
          moveX = moveX - offsetX
          moveY = moveY - offsetY
          if (fixedRatio) {
            if (offsetY) moveX = moveY * aspectRatio
            else moveY = moveX / aspectRatio
          }
          width = getSizeWithinRange(elOriginWidth - moveX, 'width')
          height = getSizeWithinRange(elOriginHeight - moveY, 'height')
          left = elOriginLeft - (width - elOriginWidth)
          top = elOriginTop - (height - elOriginHeight)
        }
        else if (command === OperateResizeHandlers.RIGHT_TOP) {
          const { offsetX, offsetY } = alignedAdsorption(elOriginLeft + elOriginWidth + moveX, elOriginTop + moveY)
          moveX = moveX - offsetX
          moveY = moveY - offsetY
          if (fixedRatio) {
            if (offsetY) moveX = -moveY * aspectRatio
            else moveY = -moveX / aspectRatio
          }
          width = getSizeWithinRange(elOriginWidth + moveX, 'width')
          height = getSizeWithinRange(elOriginHeight - moveY, 'height')
          top = elOriginTop - (height - elOriginHeight)
        }
        else if (command === OperateResizeHandlers.LEFT) {
          const { offsetX } = alignedAdsorption(elOriginLeft + moveX, null)
          moveX = moveX - offsetX
          width = getSizeWithinRange(elOriginWidth - moveX, 'width')
          left = elOriginLeft - (width - elOriginWidth)
        }
        else if (command === OperateResizeHandlers.RIGHT) {
          const { offsetX } = alignedAdsorption(elOriginLeft + elOriginWidth + moveX, null)
          moveX = moveX - offsetX
          width = getSizeWithinRange(elOriginWidth + moveX, 'width')
        }
        else if (command === OperateResizeHandlers.TOP) {
          const { offsetY } = alignedAdsorption(null, elOriginTop + moveY)
          moveY = moveY - offsetY
          height = getSizeWithinRange(elOriginHeight - moveY, 'height')
          top = elOriginTop - (height - elOriginHeight)
        }
        else if (command === OperateResizeHandlers.BOTTOM) {
          const { offsetY } = alignedAdsorption(null, elOriginTop + elOriginHeight + moveY)
          moveY = moveY - offsetY
          height = getSizeWithinRange(elOriginHeight + moveY, 'height')
        }
      }
      
      elementList.value = elementList.value.map(el => {
        if (element.id !== el.id) return el
        if (el.type === 'shape' && 'pathFormula' in el && el.pathFormula) {
          const pathFormula = SHAPE_PATH_FORMULAS[el.pathFormula]

          let path = ''
          if ('editable' in pathFormula) path = pathFormula.formula(width, height, el.keypoints!)
          else path = pathFormula.formula(width, height)

          return {
            ...el, left, top, width, height,
            viewBox: [width, height],
            path,
          }
        }
        if (el.type === 'table') {
          let cellMinHeight = originTableCellMinHeight + (height - elOriginHeight) / el.data.length
          cellMinHeight = cellMinHeight < 36 ? 36 : cellMinHeight

          if (cellMinHeight === originTableCellMinHeight) return { ...el, left, width }
          return {
            ...el, left, top, width, height,
            cellMinHeight: cellMinHeight < 36 ? 36 : cellMinHeight,
          }
        }
        return { ...el, left, top, width, height }
      })
    }

    const handleMouseup = (e: MouseEvent | TouchEvent) => {
      isMouseDown = false
      
      document.ontouchmove = null
      document.ontouchend = null
      document.onmousemove = null
      document.onmouseup = null

      alignmentLines.value = []

      const currentPageX = e instanceof MouseEvent ? e.pageX : e.changedTouches[0].pageX
      const currentPageY = e instanceof MouseEvent ? e.pageY : e.changedTouches[0].pageY
      
      if (startPageX === currentPageX && startPageY === currentPageY) return
      
      slidesStore.updateSlide({ elements: elementList.value })
      mainStore.setScalingState(false)
      
      addHistorySnapshot()
    }

    if (isTouchEvent) {
      document.ontouchmove = handleMousemove
      document.ontouchend = handleMouseup
    }
    else {
      document.onmousemove = handleMousemove
      document.onmouseup = handleMouseup
    }
  }

  // Scale multiple selected elements
  const scaleMultiElement = (e: MouseEvent, range: MultiSelectRange, command: OperateResizeHandlers) => {
    let isMouseDown = true
    
    const { minX, maxX, minY, maxY } = range
    const operateWidth = maxX - minX
    const operateHeight = maxY - minY
    const aspectRatio = operateWidth / operateHeight

    const startPageX = e.pageX
    const startPageY = e.pageY

    const originElementList: PPTElement[] = JSON.parse(JSON.stringify(elementList.value))

    document.onmousemove = e => {
      if (!isMouseDown) return
      
      const currentPageX = e.pageX
      const currentPageY = e.pageY

      const x = (currentPageX - startPageX) / canvasScale.value
      let y = (currentPageY - startPageY) / canvasScale.value

      // Lock aspect ratio, same logic as above
      if (ctrlOrShiftKeyActive.value) {
        if (command === OperateResizeHandlers.RIGHT_BOTTOM || command === OperateResizeHandlers.LEFT_TOP) y = x / aspectRatio
        if (command === OperateResizeHandlers.LEFT_BOTTOM || command === OperateResizeHandlers.RIGHT_TOP) y = -x / aspectRatio
      }

      // Overall range of all selected elements
      let currentMinX = minX
      let currentMaxX = maxX
      let currentMinY = minY
      let currentMaxY = maxY

      if (command === OperateResizeHandlers.RIGHT_BOTTOM) {
        currentMaxX = maxX + x
        currentMaxY = maxY + y
      }
      else if (command === OperateResizeHandlers.LEFT_BOTTOM) {
        currentMinX = minX + x
        currentMaxY = maxY + y
      }
      else if (command === OperateResizeHandlers.LEFT_TOP) {
        currentMinX = minX + x
        currentMinY = minY + y
      }
      else if (command === OperateResizeHandlers.RIGHT_TOP) {
        currentMaxX = maxX + x
        currentMinY = minY + y
      }
      else if (command === OperateResizeHandlers.TOP) {
        currentMinY = minY + y
      }
      else if (command === OperateResizeHandlers.BOTTOM) {
        currentMaxY = maxY + y
      }
      else if (command === OperateResizeHandlers.LEFT) {
        currentMinX = minX + x
      }
      else if (command === OperateResizeHandlers.RIGHT) {
        currentMaxX = maxX + x
      }

      // Overall width and height of all selected elements
      const currentOppositeWidth = currentMaxX - currentMinX
      const currentOppositeHeight = currentMaxY - currentMinY

      // Ratio of current element's dimensions to overall selected elements' dimensions
      let widthScale = currentOppositeWidth / operateWidth
      let heightScale = currentOppositeHeight / operateHeight

      if (widthScale <= 0) widthScale = 0
      if (heightScale <= 0) heightScale = 0
      
      // Calculate and update position/size of all selected elements based on the ratio calculated above
      elementList.value = elementList.value.map(el => {
        if ((el.type === 'image' || el.type === 'shape') && activeElementIdList.value.includes(el.id)) {
          const originElement = originElementList.find(originEl => originEl.id === el.id) as PPTImageElement | PPTShapeElement
          return {
            ...el,
            width: originElement.width * widthScale,
            height: originElement.height * heightScale,
            left: currentMinX + (originElement.left - minX) * widthScale,
            top: currentMinY + (originElement.top - minY) * heightScale,
          }
        }
        return el
      })
    }

    document.onmouseup = e => {
      isMouseDown = false
      document.onmousemove = null
      document.onmouseup = null

      if (startPageX === e.pageX && startPageY === e.pageY) return

      slidesStore.updateSlide({ elements: elementList.value })
      addHistorySnapshot()
    }
  }

  return {
    scaleElement,
    scaleMultiElement,
  }
}