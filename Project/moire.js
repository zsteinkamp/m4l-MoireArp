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
var COLOR_LINE = max.getcolor('live_lcd_control_fg_alt');
var COLOR_TITLE = max.getcolor('live_lcd_control_fg');
var ASPECT = 2;
sketch.default2d();
sketch.glloadidentity();
log('reloaded');
var state = {
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
};
function setState(key, val) {
    state[key] = val;
    //log('setState ' + key + ' = ' + val)
    calcLCM();
    draw();
    refresh();
}
function time_base(time_base) {
    setState('time_base', time_base);
}
function duration(duration) {
    setState('duration', duration);
}
function notes(notes) {
    setState('notes', notes);
}
function note_skip(note_skip) {
    setState('note_skip', note_skip);
}
function start_steps(start_steps) {
    setState('start_steps', start_steps);
}
function step_incr(step_incr) {
    setState('step_incr', step_incr);
}
function note_on(noteArr) {
    setState('note_on', noteArr);
}
function note_off(noteOff) {
    setState('note_off', noteOff);
}
function x_width(x_width) {
    setState('x_width', x_width);
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
    var outLCM = state.lcm.toString();
    if (state.lcm > 10000000) {
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
        repeatTimeStr = repeatDays + 'm ' + repeatTimeStr;
    }
    if (repeatHours > 0) {
        repeatTimeStr = repeatHours + 'h ' + repeatTimeStr;
    }
    if (repeatDays > 0) {
        repeatTimeStr = repeatDays + 'd ' + repeatTimeStr;
    }
    if (repeatYears > 0) {
        if (repeatYears > 100000) {
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
    //log('STATE: ' + JSON.stringify(state))
    sketch.glclearcolor(COLOR_BG);
    sketch.glclear();
    for (var row = 0; row < notes; row++) {
        for (var noteCount = 0; xPos < XMAX; noteCount++) {
            if (row === 0 || noteCount > 0) {
                if ((noteCount * steps[row]) % lcm === 0) {
                    sketch.glcolor(COLOR_LINE);
                }
                else {
                    sketch.glcolor(COLOR_TITLE);
                }
                sketch.glrect(xPos, yPos + GUTTER, xPos + Math.max(xStep - GUTTER, GUTTER / 2.0), yPos + Math.max(yStep - GUTTER, GUTTER * 3));
            }
            xPos = xPos + xStep * steps[row];
        }
        xPos = XMIN;
        yPos = yPos + yStep;
    }
}
draw();
refresh();
// NOTE: This section must appear in any .ts file that is directuly used by a
// [js] or [jsui] object so that tsc generates valid JS for Max.
var module = {};
module.exports = {};
