include("mmmsegui_class.js");
autowatch = 1;
outlets = 2;
mgraphics.init();
mgraphics.relative_coords = 0;
mgraphics.autofill = 0;

// Calculate JSUI window width and height
var jwidth = this.box.rect[2] - this.box.rect[0];
var jheight = this.box.rect[3] - this.box.rect[1];
var jx = this.box.rect[0]
var jy = this.box.rect[1]
this.savex = 0;
this.savey = 0;

// Instance variable defaults
// use "@variablename" to set defaults in the 'jsarguments' section in the
// inspector window for your JSUI object.
var padding = 8;
var nodesize = 6
var timescale = 250;
var autooutput = false;

jsarguments.filter(function(arg) {
  if (arg[0] == "@") {

    var val = jsarguments[jsarguments.indexOf(arg)+1]

    switch (arg) {
      case "@padding":
        padding = val;
        break;

      case "@nodesize":
        nodesize = val;
        break;

      case "@timescale":
        timescale = val;
        break;

      case "@autooutput":
        autooutput = (val == "true") ? true : false;
        break;

      default:
        break;
    }
  }
});

// Instansiate a new graph passing in the JSUI window dimensions and padding in pixels
// The variable name 'env' is referred to in JSUI functions below so keep it the same
// or replace to suit your needs
var mmmsegui = new Mmmsegui (jx, jy, jwidth, jheight, this.padding, this.nodesize, this.timescale, autooutput);

function paint() {
  // Draw background fill
  mmmsegui.drawBg();
  // Draw curve
  mmmsegui.drawCurve();
  // Draw node handles
  mmmsegui.drawNodes();
  
  // Call output whenever graphics refreshed. Off by default, see class file
  var out = mmmsegui.outputConstantly();
  if (out) { outlet(0, out) };
}

// clamp: return a value clamped within values
function clamp(val, min, max) {
  return val > max ? max : val < min ? min : val;
}

function onclick(x, y, button, cmd, shift, capslock, option, ctrl) {
  // Init mouse click variables
  mmmsegui.onClick(x,y,shift);
  mmmsegui.saveMouse(
    this.savex = this.patcher.getattr('rect')[0] + this.box.rect[0],
    this.savey = this.patcher.getattr('rect')[1] + this.box.rect[1]
  )
  }

function ondrag(x, y, button, cmd, shift, capslock, option, ctrl) {
  mmmsegui.onDrag(x,y,cmd,shift,button);
	refresh();
}

function onidle(x, y, button, cmd, shift, capslock, option, ctrl) {
  // Constantly record which curve mouse position is over (x axis)
  mmmsegui.mouseOver(x,y);
  refresh();
}

function onidleout(x, y, button, cmd, shift, capslock, option, ctrl) {
  mmmsegui.mouseOut();
}

function setFillColor (r, g, b) {
  mmmsegui.setFillColor(r, g, b);
  refresh();
}

function setBgColor (r, g, b, a) {
  mmmsegui.setBgColor(r, g, b, a);
  refresh();
}

// Set timescale of curve for output
// Normalised delta times between nodes are multiplied by this value
function setTimeScale (t) {
  mmmsegui.setTimeScale(t);
}

function bang() {
  // var out = mmmsegui.outputList();
  // outlet(0, out)
  outlet(0, mmmsegui.testList);
}


function save() {
}