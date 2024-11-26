autowatch = 1
inlets = 1
outlets = 1

const config = {
  outputLogs: true,
}

import { logFactory } from './utils'
const log = logFactory(config)

const INLET_MSGS = 0
const OUTLET_MSGS = 0

setinletassist(INLET_MSGS, 'Receive messages')
setinletassist(OUTLET_MSGS, 'Send messages')

const COLOR_BG = max.getcolor('live_lcd_bg')
const COLOR_LINE = max.getcolor('live_lcd_control_fg_alt')
const COLOR_TITLE = max.getcolor('live_lcd_control_fg')

const ASPECT = 2
sketch.default2d()
sketch.glloadidentity()

log('reloaded')

type StateVal = number | number[] | boolean

const state: Record<string, StateVal> = {
  time_base: 250,
  duration: 125,
  notes: 8,
  note_skip: 1,
  start_steps: 4,
  step_incr: 1,
  steps: [],
  lcm: 12,
  note_on: [60, 127],
  note_off: true,
  x_width: 100,
}

function setState(key: keyof typeof state, val: StateVal) {
  state[key] = val
  //log('setState ' + key + ' = ' + val)
  calcLCM()
  draw()
  refresh()
}

function time_base(time_base: number) {
  setState('time_base', time_base)
}
function duration(duration: number) {
  setState('duration', duration)
}
function notes(notes: number) {
  setState('notes', notes)
}
function note_skip(note_skip: number) {
  setState('note_skip', note_skip)
}
function start_steps(start_steps: number) {
  setState('start_steps', start_steps)
}
function step_incr(step_incr: number) {
  setState('step_incr', step_incr)
}
function note_on(noteArr: [number, number]) {
  setState('note_on', noteArr)
}
function note_off(noteOff: boolean) {
  setState('note_off', noteOff)
}
function x_width(x_width: number) {
  setState('x_width', x_width)
}

function LCM(arr: number[]) {
  function gcd(a: number, b: number) {
    if (b === 0) return a
    return gcd(b, a % b)
  }

  let res = arr[0]

  for (let i = 1; i < arr.length; i++) {
    res = (res * arr[i]) / gcd(res, arr[i])
  }

  return res
}

function calcLCM() {
  const start_steps = state.start_steps as number
  const step_incr = state.step_incr as number
  const notes = state.notes as number
  const time_base = state.time_base as number

  state.steps = []
  for (let i = 0; i < notes; i++) {
    state.steps.push(i * step_incr + start_steps)
  }
  state.lcm = LCM(state.steps)

  let outLCM = state.lcm.toString()
  if (state.lcm > 10000000) {
    outLCM = state.lcm.toExponential(2)
  } else {
    outLCM = state.lcm.toLocaleString()
  }

  const repeatMs = state.lcm * time_base

  const MS_MIN = 1000 * 60
  const MS_HOUR = MS_MIN * 60
  const MS_DAY = MS_HOUR * 24
  const MS_YEAR = MS_DAY * 365

  let repeatLeftover = repeatMs
  const repeatYears = Math.floor(repeatLeftover / MS_YEAR)
  repeatLeftover = repeatLeftover % MS_YEAR
  const repeatDays = Math.floor(repeatLeftover / MS_DAY)
  repeatLeftover = repeatLeftover % MS_DAY
  const repeatHours = Math.floor(repeatLeftover / MS_HOUR)
  repeatLeftover = repeatLeftover % MS_HOUR
  const repeatMins = Math.floor(repeatLeftover / MS_MIN)
  repeatLeftover = repeatLeftover % MS_MIN
  const repeatSecs = Math.floor(repeatLeftover / 1000)

  let repeatTimeStr = repeatSecs + 's'
  if (repeatMins > 0) {
    repeatTimeStr = repeatDays + 'm ' + repeatTimeStr
  }
  if (repeatHours > 0) {
    repeatTimeStr = repeatHours + 'h ' + repeatTimeStr
  }
  if (repeatDays > 0) {
    repeatTimeStr = repeatDays + 'd ' + repeatTimeStr
  }
  if (repeatYears > 0) {
    if (repeatYears > 100000) {
      repeatTimeStr = repeatYears.toExponential(2) + 'y ' + repeatTimeStr
    } else {
      repeatTimeStr = repeatYears.toLocaleString() + 'y ' + repeatTimeStr
    }
  }

  outlet(OUTLET_MSGS, ['repeat_steps', '"' + outLCM + '"'])
  outlet(OUTLET_MSGS, ['repeat_time', '"' + repeatTimeStr + '"'])
  //log('STEPS: ' + state.steps + ' LCM: ' + state.lcm)
}

function draw() {
  const lcm = state.lcm as number
  const notes = state.notes as number
  const steps = state.steps as number[]
  const x_width = state.x_width as number

  const XMAX = 2
  const XMIN = -2
  const GUTTER = 0.02

  let xPos = XMIN
  let yPos = -1

  const xStep = 4 / x_width
  const yStep = 2 / notes

  //log('STATE: ' + JSON.stringify(state))
  sketch.glclearcolor(COLOR_BG)
  sketch.glclear()

  for (let row = 0; row < notes; row++) {
    for (let noteCount = 0; xPos < XMAX; noteCount++) {
      if (row === 0 || noteCount > 0) {
        if ((noteCount * steps[row]) % lcm === 0) {
          sketch.glcolor(COLOR_LINE)
        } else {
          sketch.glcolor(COLOR_TITLE)
        }

        sketch.glrect(
          xPos,
          yPos + GUTTER,
          xPos + Math.max(xStep - GUTTER, GUTTER / 2.0),
          yPos + Math.max(yStep - GUTTER, GUTTER * 3)
        )
      }
      xPos = xPos + xStep * steps[row]
    }
    xPos = XMIN
    yPos = yPos + yStep
  }
}

draw()
refresh()

// NOTE: This section must appear in any .ts file that is directuly used by a
// [js] or [jsui] object so that tsc generates valid JS for Max.
const module = {}
export = {}
