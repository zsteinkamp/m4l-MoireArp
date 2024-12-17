"use strict";
autowatch = 1;
inlets = 1;
outlets = 1;
var config = {
    outputLogs: true,
};
var utils_1 = require("./utils");
var log = (0, utils_1.logFactory)(config);
var INLET_MSGS = 0;
var OUTLET_MSGS = 0;
setinletassist(INLET_MSGS, 'Receive messages');
setinletassist(OUTLET_MSGS, 'Send messages');
var COLOR_BG = max.getcolor('live_lcd_bg');
var COLOR_ALT = max.getcolor('live_lcd_control_fg_alt');
var COLOR_TITLE = max.getcolor('live_lcd_control_fg');
var ASPECT = 2;
sketch.default2d();
sketch.glloadidentity();
log('reloaded');
var state = {
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
};
var watchers = {
    root: null,
    int: null,
    mode: null,
};
function updatedState() {
    calcLCM();
    draw();
    refresh();
}
function time_base(time_base) {
    state.time_base = time_base;
    outlet(OUTLET_MSGS, 'poly', 0, 'time_base', time_base);
    updatedState();
}
function duration(duration) {
    state.duration = duration;
    outlet(OUTLET_MSGS, 'poly', 0, 'duration', duration);
    updatedState();
}
function notes(notes) {
    state.notes = notes;
    outlet(OUTLET_MSGS, 'poly', 0, 'notes', notes);
    updatedState();
}
function updateScales() {
    if (!watchers.root) {
        //log('early')
        return;
    }
    var api = new LiveAPI(function () { }, 'live_set');
    state.scale_root = api.get('root_note');
    state.scale_intervals = api.get('scale_intervals');
    state.scale_mode = api.get('scale_mode');
    state.scale_name = api.get('scale_name');
    state.scale_notes = [];
    var root_note = state.scale_root - 12;
    var note = root_note;
    while (note <= 127) {
        for (var _i = 0, _a = state.scale_intervals; _i < _a.length; _i++) {
            var interval = _a[_i];
            note = root_note + interval;
            if (note >= 0 && note <= 127) {
                state.scale_notes.push(note);
            }
        }
        root_note += 12;
        note = root_note;
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
        watchers.root = new LiveAPI(updateScales, 'live_set');
        watchers.root.property = 'root_note';
        watchers.int = new LiveAPI(updateScales, 'live_set');
        watchers.int.property = 'scale_intervals';
        watchers.mode = new LiveAPI(updateScales, 'live_set');
        watchers.mode.property = 'scale_mode';
    }
    updateScales();
}
function note_incr(note_incr) {
    state.note_incr = note_incr;
    updatedState();
    updateScales();
}
function start_steps(start_steps) {
    state.start_steps = start_steps;
    outlet(OUTLET_MSGS, 'poly', 0, 'start_steps', start_steps);
    updatedState();
}
function step_incr(step_incr) {
    state.step_incr = step_incr;
    outlet(OUTLET_MSGS, 'poly', 0, 'step_incr', step_incr);
    updatedState();
}
function scale_aware(scale_aware) {
    state.scale_aware = scale_aware;
    updateScales();
    updatedState();
}
function note_on(noteNum, noteVel) {
    state.note_on = [noteNum, noteVel];
    if (!state.scale_aware || !state.scale_mode) {
        // not scale aware
        for (var noteIdx = 0; noteIdx < state.notes; noteIdx++) {
            var useNote = noteNum + state.note_incr * noteIdx;
            if (useNote >= 0 && useNote <= 127) {
                //log('NOSCALE NOTE OUT #' + (noteIdx + 1) + ' = ' + useNote)
                outlet(OUTLET_MSGS, 'poly', noteIdx + 1, 'note_on', useNote, noteVel);
            }
        }
        return;
    }
    // scale aware below
    var scaleIdx = state.scale_notes.indexOf(noteNum);
    while (scaleIdx < 0 && noteNum > 0) {
        noteNum -= 1;
        scaleIdx = state.scale_notes.indexOf(noteNum);
    }
    if (scaleIdx < 0) {
        // hrmph didn't find the scale note, error and return
        log('ERR: Cannot find scale note for ' +
            noteNum +
            ' [' +
            state.scale_notes.join(',') +
            ']');
        return;
    }
    for (var noteIdx = 0; noteIdx < state.notes; noteIdx++) {
        var useNote = state.scale_notes[scaleIdx + noteIdx * state.note_incr];
        if (useNote && useNote >= 0 && useNote <= 127) {
            //log('SCALE NOTE OUT #' + (noteIdx + 1) + ' = ' + useNote)
            outlet(OUTLET_MSGS, 'poly', noteIdx + 1, 'note_on', useNote, noteVel);
        }
    }
}
function note_off(noteOff) {
    state.note_off = noteOff;
    outlet(OUTLET_MSGS, 'poly', 0, 'note_off', noteOff);
    updatedState();
}
function x_width(x_width) {
    state.x_width = x_width;
    updatedState();
}
function LCM(arr) {
    function gcd(a, b) {
        if (b === 0)
            return a;
        return gcd(b, a % b);
    }
    var res = arr[0];
    for (var i = 1; i < arr.length; i++) {
        res = (res * arr[i]) / gcd(res, arr[i]);
    }
    return res;
}
function calcLCM() {
    var start_steps = state.start_steps;
    var step_incr = state.step_incr;
    var notes = state.notes;
    var time_base = state.time_base;
    state.steps = [];
    for (var i = 0; i < notes; i++) {
        state.steps.push(i * step_incr + start_steps);
    }
    state.lcm = LCM(state.steps);
    var MAX_DECIMAL = 100000;
    var outLCM = state.lcm.toString();
    if (state.lcm > MAX_DECIMAL) {
        outLCM = state.lcm.toExponential(2);
    }
    else {
        outLCM = state.lcm.toLocaleString();
    }
    var repeatMs = state.lcm * time_base;
    var MS_MIN = 1000 * 60;
    var MS_HOUR = MS_MIN * 60;
    var MS_DAY = MS_HOUR * 24;
    var MS_YEAR = MS_DAY * 365;
    var repeatLeftover = repeatMs;
    var repeatYears = Math.floor(repeatLeftover / MS_YEAR);
    repeatLeftover = repeatLeftover % MS_YEAR;
    var repeatDays = Math.floor(repeatLeftover / MS_DAY);
    repeatLeftover = repeatLeftover % MS_DAY;
    var repeatHours = Math.floor(repeatLeftover / MS_HOUR);
    repeatLeftover = repeatLeftover % MS_HOUR;
    var repeatMins = Math.floor(repeatLeftover / MS_MIN);
    repeatLeftover = repeatLeftover % MS_MIN;
    var repeatSecs = Math.floor(repeatLeftover / 1000);
    var repeatTimeStr = repeatSecs + 's';
    if (repeatMins > 0) {
        repeatTimeStr = repeatMins + 'm ' + repeatTimeStr;
    }
    if (repeatHours > 0) {
        repeatTimeStr = repeatHours + 'h ' + repeatTimeStr;
    }
    if (repeatDays > 0) {
        repeatTimeStr = repeatDays + 'd ' + repeatTimeStr;
    }
    if (repeatYears > 0) {
        if (repeatYears > MAX_DECIMAL) {
            repeatTimeStr = repeatYears.toExponential(2) + 'y ' + repeatTimeStr;
        }
        else {
            repeatTimeStr = repeatYears.toLocaleString() + 'y ' + repeatTimeStr;
        }
    }
    outlet(OUTLET_MSGS, ['repeat_steps', '"' + outLCM + '"']);
    outlet(OUTLET_MSGS, ['repeat_time', '"' + repeatTimeStr + '"']);
    //log('STEPS: ' + state.steps + ' LCM: ' + state.lcm)
}
function draw() {
    var lcm = state.lcm;
    var notes = state.notes;
    var steps = state.steps;
    var x_width = state.x_width;
    var XMAX = 2;
    var XMIN = -2;
    var GUTTER = 0.02;
    var xPos = XMIN;
    var yPos = -1;
    var xStep = 4 / x_width;
    var yStep = 2 / notes;
    sketch.glclearcolor(COLOR_BG);
    sketch.glclear();
    for (var row = 0; row < notes; row++) {
        for (var noteCount = 0; xPos < XMAX; noteCount++) {
            if (row === 0 || noteCount > 0) {
                if ((noteCount * steps[row]) % lcm === 0) {
                    // we are on a LCM multiple step, so give a diff color to indicate
                    // where repeats happen
                    sketch.glcolor(COLOR_ALT);
                }
                else {
                    // regular color box
                    sketch.glcolor(COLOR_TITLE);
                }
                sketch.glrect(xPos, yPos + GUTTER, xPos + Math.max(xStep - GUTTER, GUTTER / 2.0), yPos + Math.max(yStep - GUTTER, GUTTER * 3));
            }
            xPos = xPos + xStep * steps[row];
        }
        xPos = XMIN; // carriage return
        yPos = yPos + yStep; // next row
    }
}
draw();
refresh();
// NOTE: This section must appear in any .ts file that is directuly used by a
// [js] or [jsui] object so that tsc generates valid JS for Max.
var module = {};
module.exports = {};
