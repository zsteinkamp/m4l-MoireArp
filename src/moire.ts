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
const COLOR_ALT = max.getcolor('live_lcd_control_fg_alt')
const COLOR_TITLE = max.getcolor('live_lcd_control_fg')

const ASPECT = 2
sketch.default2d()
sketch.glloadidentity()

log('reloaded')

type StateType = {
  time_base: number
  duration: number
  notes: number
  note_incr: number
  start_steps: number
  step_incr: number
  steps: number[]
  lcm: number
  note_on: [number, number]
  note_off: boolean
  x_width: number
  scale_aware: number
  scale_root: number
  scale_intervals: number[]
  scale_mode: number
  scale_name: string
  scale_notes: number[]
}

const state: StateType = {
  time_base: 250,
  duration: 125,
  notes: 8,
  note_incr: 1,
  start_steps: 4,
  step_incr: 1,
  steps: [],
  lcm: 12,
  note_on: [60, 127],
  note_off: true,
  x_width: 100,
  scale_aware: 0,
  scale_root: 0,
  scale_intervals: [],
  scale_mode: 0,
  scale_name: '',
  scale_notes: [],
}

const watchers: Record<string, LiveAPI> = {
  root: null,
  int: null,
  mode: null,
}

function updatedState() {
  calcLCM()
  draw()
  refresh()
}

function time_base(time_base: number) {
  state.time_base = time_base
  outlet(OUTLET_MSGS, 'poly', 0, 'time_base', time_base)
  updatedState()
}
function duration(duration: number) {
  state.duration = duration
  outlet(OUTLET_MSGS, 'poly', 0, 'duration', duration)
  updatedState()
}
function notes(notes: number) {
  state.notes = notes
  outlet(OUTLET_MSGS, 'poly', 0, 'notes', notes)
  updatedState()
}

function updateScales() {
  if (!watchers.root) {
    //log('early')
    return
  }
  const api = new LiveAPI(() => {}, 'live_set')

  state.scale_root = api.get('root_note')
  state.scale_intervals = api.get('scale_intervals')
  state.scale_mode = api.get('scale_mode')
  state.scale_name = api.get('scale_name')
  state.scale_notes = []

  let root_note = state.scale_root - 12
  let note = root_note

  while (note <= 127) {
    for (const interval of state.scale_intervals) {
      note = root_note + interval
      if (note >= 0 && note <= 127) {
        state.scale_notes.push(note)
      }
    }
    root_note += 12
    note = root_note
  }
  //log(
  //  'ROOT=' +
  //    state.scale_root +
  //    ' INT=' +
  //    state.scale_intervals +
  //    ' MODE=' +
  //    state.scale_mode +
  //    ' NAME=' +
  //    state.scale_name +
  //    ' AWARE=' +
  //    state.scale_aware +
  //    ' NOTES=' +
  //    state.scale_notes
  //)
}

function init() {
  if (!watchers.root) {
    watchers.root = new LiveAPI(updateScales, 'live_set')
    watchers.root.property = 'root_note'

    watchers.int = new LiveAPI(updateScales, 'live_set')
    watchers.int.property = 'scale_intervals'

    watchers.mode = new LiveAPI(updateScales, 'live_set')
    watchers.mode.property = 'scale_mode'
  }
  updateScales()
}

function note_incr(note_incr: number) {
  state.note_incr = note_incr
  updatedState()
  updateScales()
}
function start_steps(start_steps: number) {
  state.start_steps = start_steps
  outlet(OUTLET_MSGS, 'poly', 0, 'start_steps', start_steps)
  updatedState()
}
function step_incr(step_incr: number) {
  state.step_incr = step_incr
  outlet(OUTLET_MSGS, 'poly', 0, 'step_incr', step_incr)
  updatedState()
}
function scale_aware(scale_aware: number) {
  state.scale_aware = scale_aware
  updateScales()
  updatedState()
}

function note_on(noteNum: number, noteVel: number) {
  state.note_on = [noteNum, noteVel]

  if (!state.scale_aware || !state.scale_mode) {
    // not scale aware
    for (let noteIdx = 0; noteIdx < state.notes; noteIdx++) {
      const useNote = noteNum + state.note_incr * noteIdx
      if (useNote >= 0 && useNote <= 127) {
        //log('NOSCALE NOTE OUT #' + (noteIdx + 1) + ' = ' + useNote)
        outlet(OUTLET_MSGS, 'poly', noteIdx + 1, 'note_on', useNote, noteVel)
      }
    }
    return
  }

  // scale aware below
  let scaleIdx = state.scale_notes.indexOf(noteNum)

  while (scaleIdx < 0 && noteNum > 0) {
    noteNum -= 1
    scaleIdx = state.scale_notes.indexOf(noteNum)
  }

  if (scaleIdx < 0) {
    // hrmph didn't find the scale note, error and return
    log(
      'ERR: Cannot find scale note for ' +
        noteNum +
        ' [' +
        state.scale_notes.join(',') +
        ']'
    )
    return
  }

  for (let noteIdx = 0; noteIdx < state.notes; noteIdx++) {
    const useNote = state.scale_notes[scaleIdx + noteIdx * state.note_incr]

    if (useNote && useNote >= 0 && useNote <= 127) {
      //log('SCALE NOTE OUT #' + (noteIdx + 1) + ' = ' + useNote)
      outlet(OUTLET_MSGS, 'poly', noteIdx + 1, 'note_on', useNote, noteVel)
    }
  }
}

function note_off(noteOff: boolean) {
  state.note_off = noteOff
  outlet(OUTLET_MSGS, 'poly', 0, 'note_off', noteOff)
  updatedState()
}
function x_width(x_width: number) {
  state.x_width = x_width
  updatedState()
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

  const MAX_DECIMAL = 100000

  let outLCM = state.lcm.toString()
  if (state.lcm > MAX_DECIMAL) {
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
    repeatTimeStr = repeatMins + 'm ' + repeatTimeStr
  }
  if (repeatHours > 0) {
    repeatTimeStr = repeatHours + 'h ' + repeatTimeStr
  }
  if (repeatDays > 0) {
    repeatTimeStr = repeatDays + 'd ' + repeatTimeStr
  }
  if (repeatYears > 0) {
    if (repeatYears > MAX_DECIMAL) {
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

  sketch.glclearcolor(COLOR_BG)
  sketch.glclear()

  for (let row = 0; row < notes; row++) {
    for (let noteCount = 0; xPos < XMAX; noteCount++) {
      if (row === 0 || noteCount > 0) {
        if ((noteCount * steps[row]) % lcm === 0) {
          // we are on a LCM multiple step, so give a diff color to indicate
          // where repeats happen
          sketch.glcolor(COLOR_ALT)
        } else {
          // regular color box
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
    xPos = XMIN // carriage return
    yPos = yPos + yStep // next row
  }
}

draw()
refresh()

// NOTE: This section must appear in any .ts file that is directuly used by a
// [js] or [jsui] object so that tsc generates valid JS for Max.
const module = {}
export = {}
