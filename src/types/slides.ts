export const enum ShapePathFormulasKeys {
  ROUND_RECT = 'roundRect',
  ROUND_RECT_DIAGONAL = 'roundRectDiagonal',
  ROUND_RECT_SINGLE = 'roundRectSingle',
  ROUND_RECT_SAMESIDE = 'roundRectSameSide',
  CUT_RECT_DIAGONAL = 'cutRectDiagonal',
  CUT_RECT_SINGLE = 'cutRectSingle',
  CUT_RECT_SAMESIDE = 'cutRectSameSide',
  CUT_ROUND_RECT = 'cutRoundRect',
  MESSAGE = 'message',
  ROUND_MESSAGE = 'roundMessage',
  L = 'L',
  RING_RECT = 'ringRect',
  PLUS = 'plus',
  TRIANGLE = 'triangle',
  PARALLELOGRAM_LEFT = 'parallelogramLeft',
  PARALLELOGRAM_RIGHT = 'parallelogramRight',
  TRAPEZOID = 'trapezoid',
  BULLET = 'bullet',
  INDICATOR = 'indicator',
  DONUT = 'donut',
  DIAGSTRIPE = 'diagStripe',
}

export const enum ElementTypes {
  TEXT = 'text',
  IMAGE = 'image',
  SHAPE = 'shape',
  LINE = 'line',
  CHART = 'chart',
  TABLE = 'table',
  LATEX = 'latex',
  VIDEO = 'video',
  AUDIO = 'audio',
}

/**
 * Gradient
 * 
 * type: Gradient type (radial, linear)
 * 
 * colors: Gradient color list (pos: percentage position; color: color value)
 * 
 * rotate: Gradient angle (for linear gradient)
 */
export type GradientType = 'linear' | 'radial'
export type GradientColor = {
  pos: number
  color: string
}
export interface Gradient {
  type: GradientType
  colors: GradientColor[]
  rotate: number
}

export type LineStyleType = 'solid' | 'dashed' | 'dotted'

/**
 * Element Shadow
 * 
 * h: Horizontal offset
 * 
 * v: Vertical offset
 * 
 * blur: Blur amount
 * 
 * color: Shadow color
 */
export interface PPTElementShadow {
  h: number
  v: number
  blur: number
  color: string
}

/**
 * Element Outline/Border
 * 
 * style?: Border style (solid or dashed)
 * 
 * width?: Border width
 * 
 * color?: Border color
 */
export interface PPTElementOutline {
  style?: LineStyleType
  width?: number
  color?: string
}

export type ElementLinkType = 'web' | 'slide'

/**
 * Element Hyperlink
 * 
 * type: Link type (web page, slide page)
 * 
 * target: Target address (web URL, slide page ID)
 */
export interface PPTElementLink {
  type: ElementLinkType
  target: string
}


/**
 * Element Common Properties
 * 
 * id: Element ID
 * 
 * left: Horizontal position (distance from canvas left edge)
 * 
 * top: Vertical position (distance from canvas top edge)
 * 
 * lock?: Lock element
 * 
 * groupId?: Group ID (elements with the same group ID belong to the same group)
 * 
 * width: Element width
 * 
 * height: Element height
 * 
 * rotate: Rotation angle
 * 
 * link?: Hyperlink
 * 
 * name?: Element name
 */
interface PPTBaseElement {
  id: string
  left: number
  top: number
  lock?: boolean
  groupId?: string
  width: number
  height: number
  rotate: number
  link?: PPTElementLink
  name?: string
}


export type TextType = 'title' | 'subtitle' | 'content' | 'item' | 'itemTitle' | 'notes' | 'header' | 'footer' | 'partNumber' | 'itemNumber'

/**
 * Text Element
 * 
 * type: Element type (text)
 * 
 * content: Text content (HTML string)
 * 
 * defaultFontName: Default font (can be overridden by HTML inline styles in content)
 * 
 * defaultColor: Default color (can be overridden by HTML inline styles in content)
 * 
 * outline?: Border
 * 
 * fill?: Fill color
 * 
 * lineHeight?: Line height (multiplier), default 1.5
 * 
 * wordSpace?: Letter spacing, default 0
 * 
 * opacity?: Opacity, default 1
 * 
 * shadow?: Shadow
 * 
 * paragraphSpace?: Paragraph spacing, default 5px
 * 
 * vertical?: Vertical text
 * 
 * textType?: Text type
 */
export interface PPTTextElement extends PPTBaseElement {
  type: 'text'
  content: string
  defaultFontName: string
  defaultColor: string
  outline?: PPTElementOutline
  fill?: string
  lineHeight?: number
  wordSpace?: number
  opacity?: number
  shadow?: PPTElementShadow
  paragraphSpace?: number
  vertical?: boolean
  textType?: TextType
}


/**
 * Image/Shape Flip
 * 
 * flipH?: Horizontal flip
 * 
 * flipV?: Vertical flip
 */
export interface ImageOrShapeFlip {
  flipH?: boolean
  flipV?: boolean
}

/**
 * Image Filters
 * 
 * https://developer.mozilla.org/en-US/docs/Web/CSS/filter
 * 
 * 'blur'?: Blur, default 0 (px)
 * 
 * 'brightness'?: Brightness, default 100 (%)
 * 
 * 'contrast'?: Contrast, default 100 (%)
 * 
 * 'grayscale'?: Grayscale, default 0 (%)
 * 
 * 'saturate'?: Saturation, default 100 (%)
 * 
 * 'hue-rotate'?: Hue rotation, default 0 (deg)
 * 
 * 'opacity'?: Opacity, default 100 (%)
 */
export type ImageElementFilterKeys = 'blur' | 'brightness' | 'contrast' | 'grayscale' | 'saturate' | 'hue-rotate' | 'opacity' | 'sepia' | 'invert'
export interface ImageElementFilters {
  'blur'?: string
  'brightness'?: string
  'contrast'?: string
  'grayscale'?: string
  'saturate'?: string
  'hue-rotate'?: string
  'sepia'?: string
  'invert'?: string
  'opacity'?: string
}

export type ImageClipDataRange = [[number, number], [number, number]]

/**
 * Image Clip/Crop
 * 
 * range: Clip range, e.g.: [[10, 10], [90, 90]] means cropping from 10%, 10% to 90%, 90% of the original image
 * 
 * shape: Clip shape, see configs/imageClip.ts CLIPPATHS
 */
export interface ImageElementClip {
  range: ImageClipDataRange
  shape: string
}

export type ImageType = 'pageFigure' | 'itemFigure' | 'background'

/**
 * Image Element
 * 
 * type: Element type (image)
 * 
 * fixedRatio: Lock aspect ratio
 * 
 * src: Image URL
 * 
 * outline?: Border
 * 
 * filters?: Image filters
 * 
 * clip?: Crop information
 * 
 * flipH?: Horizontal flip
 * 
 * flipV?: Vertical flip
 * 
 * shadow?: Shadow
 * 
 * radius?: Border radius
 * 
 * colorMask?: Color mask overlay
 * 
 * imageType?: Image type
 */
export interface PPTImageElement extends PPTBaseElement {
  type: 'image'
  fixedRatio: boolean
  src: string
  outline?: PPTElementOutline
  filters?: ImageElementFilters
  clip?: ImageElementClip
  flipH?: boolean
  flipV?: boolean
  shadow?: PPTElementShadow
  radius?: number
  colorMask?: string
  imageType?: ImageType
}

export type ShapeTextAlign = 'top' | 'middle' | 'bottom' 

/**
 * Text Inside Shape
 * 
 * content: Text content (HTML string)
 * 
 * defaultFontName: Default font (can be overridden by HTML inline styles in content)
 * 
 * defaultColor: Default color (can be overridden by HTML inline styles in content)
 * 
 * align: Text vertical alignment
 * 
 * lineHeight?: Line height (multiplier), default 1.5
 * 
 * wordSpace?: Letter spacing, default 0
 * 
 * paragraphSpace?: Paragraph spacing, default 5px
 * 
 * type: Text type
 */
export interface ShapeText {
  content: string
  defaultFontName: string
  defaultColor: string
  align: ShapeTextAlign
  lineHeight?: number
  wordSpace?: number
  paragraphSpace?: number
  type?: TextType
}

/**
 * Shape Element
 * 
 * type: Element type (shape)
 * 
 * viewBox: SVG viewBox attribute, e.g. [1000, 1000] represents '0 0 1000 1000'
 * 
 * path: Shape path, SVG path's d attribute
 * 
 * fixedRatio: Lock aspect ratio
 * 
 * fill: Fill color, applies when no gradient exists
 * 
 * gradient?: Gradient, takes priority as fill when present
 * 
 * pattern?: Pattern, takes priority as fill when present
 * 
 * outline?: Border
 * 
 * opacity?: Opacity
 * 
 * flipH?: Horizontal flip
 * 
 * flipV?: Vertical flip
 * 
 * shadow?: Shadow
 * 
 * special?: Special shape (marks shapes that are difficult to parse, e.g. paths using types other than L Q C A; these shapes will be converted to images on export)
 * 
 * text?: Text inside shape
 * 
 * pathFormula?: Shape path calculation formula
 * Normally, when a shape's size changes, only the width/height scaling ratio based on viewBox adjusts the shape, while viewBox and path remain unchanged.
 * However, some shapes need more precise control over key point positions, requiring a path formula to update viewBox and recalculate path during scaling.
 * 
 * keypoints?: Key point position percentages
 */
export interface PPTShapeElement extends PPTBaseElement {
  type: 'shape'
  viewBox: [number, number]
  path: string
  fixedRatio: boolean
  fill: string
  gradient?: Gradient
  pattern?: string
  outline?: PPTElementOutline
  opacity?: number
  flipH?: boolean
  flipV?: boolean
  shadow?: PPTElementShadow
  special?: boolean
  text?: ShapeText
  pathFormula?: ShapePathFormulasKeys
  keypoints?: number[]
}


export type LinePoint = '' | 'arrow' | 'dot' 

/**
 * Line Element
 * 
 * type: Element type (line)
 * 
 * start: Start point position ([x, y])
 * 
 * end: End point position ([x, y])
 * 
 * style: Line style (solid, dashed, dotted)
 * 
 * color: Line color
 * 
 * points: Endpoint styles ([start style, end style], options: none, arrow, dot)
 * 
 * shadow?: Shadow
 * 
 * broken?: Polyline control point position ([x, y])
 * 
 * broken2?: Double polyline control point position ([x, y])
 * 
 * curve?: Quadratic curve control point position ([x, y])
 * 
 * cubic?: Cubic curve control point positions ([[x1, y1], [x2, y2]])
 */
export interface PPTLineElement extends Omit<PPTBaseElement, 'height' | 'rotate'> {
  type: 'line'
  start: [number, number]
  end: [number, number]
  style: LineStyleType
  color: string
  points: [LinePoint, LinePoint]
  shadow?: PPTElementShadow
  broken?: [number, number]
  broken2?: [number, number]
  curve?: [number, number]
  cubic?: [[number, number], [number, number]]
}


export type ChartType = 'bar' | 'column' | 'line' | 'pie' | 'ring' | 'area' | 'radar' | 'scatter'

export interface ChartOptions {
  lineSmooth?: boolean
  stack?: boolean
}

export interface ChartData {
  labels: string[]
  legends: string[]
  series: number[][]
}

/**
 * Chart Element
 * 
 * type: Element type (chart)
 * 
 * fill?: Fill color
 * 
 * chartType: Base chart type (bar/line/pie), all chart types are derived from these three basic types
 * 
 * data: Chart data
 * 
 * options: Extended options
 * 
 * outline?: Border
 * 
 * themeColors: Theme colors
 * 
 * textColor?: Axis and text color
 * 
 * lineColor?: Grid line color
 */
export interface PPTChartElement extends PPTBaseElement {
  type: 'chart'
  fill?: string
  chartType: ChartType
  data: ChartData
  options?: ChartOptions
  outline?: PPTElementOutline
  themeColors: string[]
  textColor?: string
  lineColor?: string
}


export type TextAlign = 'left' | 'center' | 'right' | 'justify'
/**
 * Table Cell Style
 * 
 * bold?: Bold
 * 
 * em?: Italic
 * 
 * underline?: Underline
 * 
 * strikethrough?: Strikethrough
 * 
 * color?: Font color
 * 
 * backcolor?: Background color
 * 
 * fontsize?: Font size
 * 
 * fontname?: Font family
 * 
 * align?: Text alignment
 */
export interface TableCellStyle {
  bold?: boolean
  em?: boolean
  underline?: boolean
  strikethrough?: boolean
  color?: string
  backcolor?: string
  fontsize?: string
  fontname?: string
  align?: TextAlign
}


/**
 * Table Cell
 * 
 * id: Cell ID
 * 
 * colspan: Column span
 * 
 * rowspan: Row span
 * 
 * text: Text content
 * 
 * style?: Cell style
 */
export interface TableCell {
  id: string
  colspan: number
  rowspan: number
  text: string
  style?: TableCellStyle
}

/**
 * Table Theme
 * 
 * color: Theme color
 * 
 * rowHeader: Header row
 * 
 * rowFooter: Footer/summary row
 * 
 * colHeader: First column
 * 
 * colFooter: Last column
 */
export interface TableTheme {
  color: string
  rowHeader: boolean
  rowFooter: boolean
  colHeader: boolean
  colFooter: boolean
}

/**
 * Table Element
 * 
 * type: Element type (table)
 * 
 * outline: Border
 * 
 * theme?: Theme
 * 
 * colWidths: Column width array, e.g. [0.3, 0.5, 0.2] means three columns with 30%, 50%, 20% of total width
 * 
 * cellMinHeight: Minimum cell height
 * 
 * data: Table data
 */
export interface PPTTableElement extends PPTBaseElement {
  type: 'table'
  outline: PPTElementOutline
  theme?: TableTheme
  colWidths: number[]
  cellMinHeight: number
  data: TableCell[][]
}


/**
 * LaTeX Element (Formula)
 * 
 * type: Element type (latex)
 * 
 * latex: LaTeX code
 * 
 * path: SVG path
 * 
 * color: Color
 * 
 * strokeWidth: Stroke width
 * 
 * viewBox: SVG viewBox attribute
 * 
 * fixedRatio: Lock aspect ratio
 */
export interface PPTLatexElement extends PPTBaseElement {
  type: 'latex'
  latex: string
  path: string
  color: string
  strokeWidth: number
  viewBox: [number, number]
  fixedRatio: boolean
}

/**
 * Video Element
 * 
 * type: Element type (video)
 * 
 * src: Video URL
 * 
 * autoplay: Auto play
 * 
 * poster: Preview thumbnail
 * 
 * ext: Video extension, used to determine resource type when URL lacks extension
 */
export interface PPTVideoElement extends PPTBaseElement {
  type: 'video'
  src: string
  autoplay: boolean
  poster?: string
  ext?: string
}

/**
 * Audio Element
 * 
 * type: Element type (audio)
 * 
 * fixedRatio: Lock icon aspect ratio
 * 
 * color: Icon color
 * 
 * loop: Loop playback
 * 
 * autoplay: Auto play
 * 
 * src: Audio URL
 * 
 * ext: Audio extension, used to determine resource type when URL lacks extension
 */
export interface PPTAudioElement extends PPTBaseElement {
  type: 'audio'
  fixedRatio: boolean
  color: string
  loop: boolean
  autoplay: boolean
  src: string
  ext?: string
}


export type PPTElement = PPTTextElement | PPTImageElement | PPTShapeElement | PPTLineElement | PPTChartElement | PPTTableElement | PPTLatexElement | PPTVideoElement | PPTAudioElement

export type AnimationType = 'in' | 'out' | 'attention'
export type AnimationTrigger = 'click' | 'meantime' | 'auto'

/**
 * Element Animation
 * 
 * id: Animation ID
 * 
 * elId: Element ID
 * 
 * effect: Animation effect
 * 
 * type: Animation type (entrance, exit, emphasis)
 * 
 * duration: Animation duration
 * 
 * trigger: Animation trigger (click - on click, meantime - with previous animation, auto - after previous animation)
 */
export interface PPTAnimation {
  id: string
  elId: string
  effect: string
  type: AnimationType
  duration: number
  trigger: AnimationTrigger
}

export type SlideBackgroundType = 'solid' | 'image' | 'gradient'
export type SlideBackgroundImageSize = 'cover' | 'contain' | 'repeat'
export interface SlideBackgroundImage {
  src: string
  size: SlideBackgroundImageSize,
}

/**
 * Slide Background
 * 
 * type: Background type (solid color, image, gradient)
 * 
 * color?: Background color (solid)
 * 
 * image?: Image background
 * 
 * gradientType?: Gradient background
 */
export interface SlideBackground {
  type: SlideBackgroundType
  color?: string
  image?: SlideBackgroundImage
  gradient?: Gradient
}


export type TurningMode = 'no' | 'fade' | 'slideX' | 'slideY' | 'random' | 'slideX3D' | 'slideY3D' | 'rotate' | 'scaleY' | 'scaleX' | 'scale' | 'scaleReverse'

export interface NoteReply {
  id: string
  content: string
  time: number
  user: string
}

export interface Note {
  id: string
  content: string
  time: number
  user: string
  elId?: string
  replies?: NoteReply[]
}

export interface SectionTag {
  id: string
  title?: string
}

export type SlideType = 'cover' | 'contents' | 'transition' | 'content' | 'end'

/**
 * Slide Page
 * 
 * id: Page ID
 * 
 * elements: Element collection
 * 
 * notes?: Comments/annotations
 * 
 * remark?: Speaker notes
 * 
 * background?: Page background
 * 
 * animations?: Element animation collection
 * 
 * turningMode?: Page transition mode
 * 
 * slideType?: Page type
 */
export interface Slide {
  id: string
  elements: PPTElement[]
  notes?: Note[]
  remark?: string
  background?: SlideBackground
  animations?: PPTAnimation[]
  turningMode?: TurningMode
  sectionTag?: SectionTag
  type?: SlideType
}

/**
 * Slide Theme
 * 
 * backgroundColor: Page background color
 * 
 * themeColor: Theme color, used for default shape colors etc.
 * 
 * fontColor: Font color
 * 
 * fontName: Font family
 */
export interface SlideTheme {
  backgroundColor: string
  themeColors: string[]
  fontColor: string
  fontName: string
  outline: PPTElementOutline
  shadow: PPTElementShadow
}

export interface SlideTemplate {
  name: string
  id: string
  cover: string
  origin?: string
}