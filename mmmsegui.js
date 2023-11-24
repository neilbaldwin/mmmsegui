autowatch = 1;
outlets = 2;
mgraphics.init();
mgraphics.relative_coords = 0;
mgraphics.autofill = 0;

// Instansiate a new graph passing in the parent window as 'this'
// The variable name 'mmmsegui' is referred to in JSUI functions so keep it the same
// or replace to suit your needs
var mmmsegui = new Mmmsegui (this)

//----------------------------------------------------------------------------
// Mmmsegui Object Definition
//----------------------------------------------------------------------------
function Mmmsegui (parent) {

  // Create empty node object
  // x, y: normalised coordinates
  // cp: curve control point 0.0 to 1.0
  function Node (x, y, cp) {
    this.x = x;
    this.y = y;
    this.cp = cp;    
  }
  
  // Calculate graph window based on JSUI window size and padding
  this.setupWindow = function() {
    this.jwidth = this.parent.box.rect[2] - this.parent.box.rect[0];
    this.jheight = this.parent.box.rect[3] - this.parent.box.rect[1];
    this.gw = this.jwidth - (this.padding * 2);
    this.gh = this.jheight - (this.padding * 2);
  }

  // Function to restore node list on loading
  this.loadNodes = function(ld) {
    this.nodeList = JSON.parse(ld);
    this.nodeCount = this.nodeList.length;
  }

  // Function to save graph parameters for save() function
  this.saveParameters = function() {
    var sp = {
      "fillColor": this.fillColor,
      "strokeColor" : this.strokeColor,
      "bgColor" : this.bgColor,
      "nodeSize": this.nodeSize,
      "lineWidth": this.lineWidth,
      "padding" : this.padding,
      "timeScale": this.timeScale,
      "autoOutput": this.autoOutput,
      "nodeHighlighting": this.nodeHighlighting,
      "curveHighlighting": this.curveHighlighting,
      "autoHideNodes": this.autoHideNodes,
      "nodesVisible" : this.nodesVisible,
      "mouseSpeed": this.mouseSpeed,
      "curveClickTolerance": this.curveClickTolerance
    }
    return sp
  }

  // Function called on load to restore graph parameters
  this.loadParameters = function(p) {
    var lp = JSON.parse(p)
    this.fillColor = lp.fillColor;
    this.strokeColor = lp.strokeColor;
    this.bgColor = lp.bgColor;
    this.nodeSize = lp.nodeSize;
    this.lineWidth = lp.lineWidth;
    this.padding = lp.padding;
    this.timeScale = lp.timeScale;
    this.autoOutput = lp.autoOutput;
    this.nodeHighlighting = lp.nodeHighlighting;
    this.curveHighlighting = lp.curveHighlighting;
    this.autoHideNodes = lp.autoHideNodes;
    this.nodesVisible = lp.nodesVisible;
    this.mouseSpeed = lp.mouseSpeed;
    this.curveClickTolerance = lp.curveClickTolerance;
  }

  // Nodes and curves use normalised coordinates
  // This function calculates the corresponding pixel coordinates
  // In: node number
  // Out: {sx, sy, cx, cy, ex ,ey}
  // SX/SY : coordinates of start node
  // CX/CY : coordinates of curve control point
  // EX/EY : coordinates of end node
  this.calcPixelCoordinates = function(n) {
    // Get start point node from node list
    var node = this.nodeList[n];

    // Get next node from list
    var nx = this.nodeList[n+1];

    // Calculate screen start position in pixels
    var sx = this.gw * node.x + this.padding;
    var sy = this.gh * node.y + this.padding;
    // If next node undefined this is end of curve so set arbitrary
    // control and end coordinates to avoid error.
    if (typeof nx == "undefined") {
      var ex = 0;
      var ey = 0;
      var cx = 0;
      var cy = 0;  
    } else {
      // Otherwise calculate curve control point position and end position in pixels
      var ex = this.gw * nx.x + this.padding;
      var ey = this.gh * nx.y + this.padding;
      var cp = node.cp;
      var cpx = node.x + ((nx.x-node.x) * cp);
      var cpy = nx.y - ((nx.y-node.y) * cp);
      var cx = this.gw * cpx + this.padding;
      var cy = this.gh * cpy + this.padding;
    }
    // Return object containing pixel positions
    return { sx:sx, sy:sy, cx:cx, cy:cy, ex:ex, ey:ey }
  }

  // Draw background fill
  this.drawBg = function() {
    // Get background color
    mgraphics.set_source_rgba(this.bgColor);
    // Fill entire JSUI window
    mgraphics.rectangle(0, 0, this.jwidth, this.jheight);    
    mgraphics.fill();
  }

  // Function to draw entire curve
  this.drawCurve = function() {
    // Special case for first node as need to move drawing to its start position
    var curve0 = this.calcPixelCoordinates(0)
    mgraphics.move_to(curve0.sx, curve0.sy);
    mgraphics.curve_to(curve0.cx, curve0.cy, curve0.cx, curve0.cy, curve0.ex, curve0.ey);

    // Iterrate node list from index 1 to next-to-last
    // (no curve for last node only used as end point)
    for (n = 1; n < this.nodeCount-1; n++) {
      var curve = this.calcPixelCoordinates(n)
      mgraphics.curve_to(curve.cx, curve.cy, curve.cx, curve.cy, curve.ex, curve.ey);
    }

    // Fix for filled curve as start and end Y positions can be different
    mgraphics.line_to(this.gw + this.padding, this.gh + this.padding);
    mgraphics.line_to(this.padding, this.gh + this.padding);    
    mgraphics.close_path();
    mgraphics.set_source_rgba(this.fillColor);    
    mgraphics.fill_preserve();
    mgraphics.set_source_rgba(this.strokeColor);
    mgraphics.set_line_width(this.lineWidth);
    mgraphics.stroke();

    // Highlights curve when curve detected under mouse pointer
    var strokeMagnify = 1.5
    if (this.curveHighlighting) {
      if ((this.mouseCurvePoint != null) && (this.mouseNode == null)) {
        var curve = this.calcPixelCoordinates(this.mouseCurve)
        mgraphics.set_source_rgba(this.bright(this.strokeColor, 2.0));
        mgraphics.set_line_width(this.lineWidth * strokeMagnify + 0.5);
        mgraphics.move_to(curve.sx, curve.sy);
        mgraphics.curve_to(curve.cx, curve.cy, curve.cx, curve.cy, curve.ex, curve.ey);
        mgraphics.stroke();
      }  
    }
  }

  // Function to "brighten" RGBA color - used for hover highlighting
  // In: RGBA color object, amp (multiplication factor)
  // Out: adjusted RGBA object
  this.bright = function(color, amp) {
    var b = []
    b[0] = clamp(color[0] * amp, 0.0, 2.0)
    b[1] = clamp(color[1] * amp, 0.0, 2.0)
    b[2] = clamp(color[2] * amp, 0.0, 2.0)
    b[3] = clamp(color[3] * amp, 0.0, 2.0)
    return b
  }

  // Draw node handles
  this.drawNodes = function() {

    if (!this.nodesVisible) { return };

    // Draw square node at start of graph
    mgraphics.set_line_width(this.lineWidth);
    var curve = this.calcPixelCoordinates(0)
    mgraphics.rectangle(curve.sx-(this.nodeSize/2), 
      curve.sy-(this.nodeSize/2), this.nodeSize, this.nodeSize);

    // Draw all 'normal' elipse nodes
    for (n = 1; n < this.nodeCount-1; n++) {
      var curve = this.calcPixelCoordinates(n);
      mgraphics.ellipse(curve.sx-(this.nodeSize/2), 
        curve.sy-(this.nodeSize/2), this.nodeSize, this.nodeSize);
    }
    
    // Draw square node at end of graph
    var curve = this.calcPixelCoordinates(this.nodeCount-1);
    mgraphics.rectangle(curve.sx-(this.nodeSize/2), 
      curve.sy-(this.nodeSize/2), this.nodeSize, this.nodeSize);

    // Fill and stroke all nodes
    mgraphics.set_source_rgba(this.bgColor);
    mgraphics.fill_preserve();
    mgraphics.set_source_rgba(this.strokeColor);
    mgraphics.stroke();

    // Highlights node if node detected under mouse pointer
    var nodeMagnify = 1.2;
    if (this.nodeHighlighting) {
      if (this.mouseNode != null) {
        var curve = this.calcPixelCoordinates(this.mouseNode)
        var ns = this.nodeSize * nodeMagnify;
        mgraphics.set_line_width(this.lineWidth * nodeMagnify + 1.0);
        
        if ((this.mouseNode == 0) || (this.mouseNode == this.nodeCount-1)) {
          mgraphics.rectangle(curve.sx-(ns/2), curve.sy-(ns/2), ns, ns);
        } else {
          mgraphics.ellipse(curve.sx-(ns/2), curve.sy-(ns/2), ns, ns);
        }
        mgraphics.set_source_rgba(this.bright(this.strokeColor, 2.0));        
        mgraphics.stroke();
      }  
    }
  }

  // Add new node and sort node list by time (x axis position)
  this.addNode = function(x, y, cp) {
    this.nodeList.push(new Node(x, y, cp));
    this.nodeList.sort(function(a, b) {return a.x - b.x})
    this.nodeCount++;
  }

  // Delete node, removing empty array element and re-sorting based on time (x axis)
  this.deleteNode = function(n) {
    // Minimum node list size is 2 nodes
    if (this.nodeCount<=2) { return };
    // Can't delete first and last node
    if ((n == 0) || (n == this.nodeCount-1)) { return };
    this.nodeList.splice(n,1);
    this.nodeList.sort(function(a, b) {return a.x - b.x})
    this.nodeCount--;
  }

  // Set X position of node
  this.setNodeX = function(n, f) {
    if ((n == 0) || (n == this.nodeCount-1)) { return }
    // Uses x position of previous and next node for x axis limits
    px = this.nodeList[n-1].x
    nx = this.nodeList[n+1].x
    this.nodeList[n].x = clamp(this.nodeList[n].x + f, px, nx);      
  }

  // Set Y position of node
  this.setNodeY = function(n, f) {
    this.nodeList[n].y = clamp(this.nodeList[n].y - f, 0.0, 1.0);
  }

  // Adjust Y posiiton of curve control point
  this.setCurveY = function(n, f) {
    var c1 = this.nodeList[n].y - f;
    var c2 = this.nodeList[n+1].y - f;
    if ((c1 < 0.0) || (c1 > 1.0) || (c2 < 0.0) || (c2 > 1.0)) { return };
    this.nodeList[n].y = c1;
    this.nodeList[n+1].y = c2;
  }

  // Adjust X position of curve control point
  this.setCurveX = function(n, f) {
    if ((n == 0) || (n+1 == this.nodeList.length-1)) { return }
    var c1 = this.nodeList[n].x + f;
    var c2 = this.nodeList[n+1].x + f;
    var c3 = (n > 0) ? this.nodeList[n-1].x : 0.0
    var c4 = ((n+1) < this.nodeList.length-1) ? this.nodeList[n+2].x : 1.0
    if ((c1 < c3) || (c2 > c4) ) { return };
    this.nodeList[n].x = c1;
    this.nodeList[n+1].x = c2;
  }

  // Set curve control point
  this.setControlPoint = function(n, px, py) {
    var ty = this.nodeList[n].y
    var ny = this.nodeList[n+1].y
    // Add or substract from control point value depending if slope is +ve or -nv
    if (ty < ny) {
      this.nodeList[n].cp = clamp(this.nodeList[n].cp + (px + py), 0.0, 1.0);
    } else {
      this.nodeList[n].cp = clamp(this.nodeList[n].cp - (-px + py), 0.0, 1.0);
    }
  }

  // Handle mouse over nodes and curve segments
  this.mouseOver = function(x,y) {
    if (this.autoHideNodes) { this.nodesVisible = true };
    this.mouseNode = null;
    this.mouseSegment = null;
    this.mouseCurvePoint = null;
    var ns = this.nodeSize * 2.0

    // Detect which node mouse point is over
    for (n = 0; n <= this.nodeCount-1; n++) {
      var curve = this.calcPixelCoordinates(n)
      if (( x > curve.sx-ns) && (x < curve.sx+ns)
        && (y > curve.sy-ns) && (y < curve.sy+ns)) {
          // this.mouseNode now contains node number that mouse is over
          this.mouseNode = n
          n = this.nodeCount-1;
      }
    }

    // If mouse pointer outside of graph don't process further
    if ((x < this.padding ) || (x > this.gw + this.padding) || (y < this.padding) || (y > this.gh + this.padding)) { 
      return
    };

    // Determine which curve segment mouse pointer is over
    for (n = 0; n <= this.nodeCount - 2; n++) {
      if ((x / this.gw) > this.nodeList[n].x) { this.mouseSegment = n };
    }

    // Determine if point pointer is close to the segment curve
    if (this.mouseSegment != null) {
      this.mouseCurvePoint = this.isPointNearCurve(this.mouseSegment, x, y);
      if ((this.mouseCurvePoint != null)) {
        this.mouseCurve = this.mouseSegment;
      }

      // Determine how far the mouse pointer is along current segment
      var t = (x - this.padding) / (this.gw)
      var tx = this.nodeList[this.mouseSegment].x
      var nx = this.nodeList[this.mouseSegment+1].x
      var wx = nx - tx
      this.mouseCurveIndex = clamp((t - tx) / wx, 0.0, 1.0)
    }

    return
  }

  // Return X/Y pixel coordinates where user clicked on a curve
  this.getCurvePoint = function() {
    if (this.clickedCurve == null) { return null }
    var curve = this.calcPixelCoordinates(this.clickedCurve);
    var curvePoint = this.calculateBezierPoint(curve.sx, curve.sy, 
      curve.cx, curve.cy, curve.cx, curve.cy, curve.ex, curve.ey, this.mouseCurvePoint.t);
    return curvePoint
  }

  // Detects if use has clicked on (near) a curve and returns the curve position if true
  this.isPointNearCurve = function(n, x, y) {
    // Calculate points along the curve and check proximity
    var curve = this.calcPixelCoordinates(n)
    var lastDistance = 10000;
    var lastCurve = 0;
    for (t = 0; t <= 1; t += 0.01) {
      var curvePoint = this.calculateBezierPoint(curve.sx, curve.sy, 
        curve.cx, curve.cy, curve.cx, curve.cy, curve.ex, curve.ey, t);
      var distance = Math.sqrt(Math.pow(curvePoint.x - x, 2) + Math.pow(curvePoint.y - y, 2));
      curvePoint.t = t;
      if (distance <= lastDistance) {
        lastCurve = curvePoint;
        lastDistance = distance;
      }
    }
    if (lastDistance <= this.curveClickTolerance) {
      return lastCurve
    }
  }
  
  // Function to calculate X/Y position of point along current curve
  this.calculateBezierPoint = function(startX, startY, 
    control1X, control1Y, control2X, control2Y, endX, endY, t) {
      // Calculate the blending functions
      var u = 1 - t;
      var tt = t * t;
      var uu = u * u;
      var uuu = uu * u;
      var ttt = tt * t;
  
      // Calculate the (x, y) coordinates of the point on the Bezier curve
      var x = uuu * startX + 3 * uu * t * control1X + 3 * u * tt * control2X + ttt * endX;
      var y = uuu * startY + 3 * uu * t * control1Y + 3 * u * tt * control2Y + ttt * endY;
  
      return { x:x, y:y };
  }

  this.onDblClick = function(x, y, shift) {
    this.MX = x;
    this.MY = y;	
    this.clickedNode = null;
    this.clickedCurve = null;
    this.mouseCurvePoint = null;

    // If mouse pointer is over node then clicked node is that node
    if (this.mouseNode != null) { this.clickedNode = this.mouseNode };

    // If mouse pointer not over node but IS inside graph, did user click curve?
    if ((this.mouseNode == null) && (this.mouseSegment != null)) {
      this.mouseCurvePoint = this.isPointNearCurve(this.mouseCurve,x,y)
      if (this.mouseCurvePoint != null) {
        this.clickedCurve = this.mouseCurve;
      }
    }
  
    // If double-clicked node, delete that node
    if (this.clickedNode != null) {
      this.deleteNode(this.clickedNode);
      this.clickedNode = null;
      this.saveMouse();
      if (this.autoOutput) { this.outputFlag = true };
    }

    // Or if user double-clicked curve with SHIFT, reset curve shape
    if (this.clickedCurve != null) {
      if (shift) {
        this.nodeList[this.clickedCurve].cp = 0.5
      } else {
        var ax = (this.mouseCurvePoint.x / this.gw) - (this.padding / this.gw);
        var ay = (this.mouseCurvePoint.y / this.gh) - (this.padding / this.gh);
        this.addNode(ax, ay, 0.5);
        this.clickedCurve = null;
        if (this.autoOutput) { this.outputFlag = true };
      }
    }
  }

  this.onClick = function(x,y, shift) {
    this.MX = x;
    this.MY = y;	
    this.clickedNode = null;
    this.clickedCurve = null;
    this.mouseCurvePoint = null;

    // If mouse over node, clicked node is that node
    if (this.mouseNode != null) { this.clickedNode = this.mouseNode };
  
    // Or if mouse over curve segment, did user click on curve?
    if ((this.mouseNode == null) && (this.mouseSegment != null)) {
      this.mouseCurvePoint = this.isPointNearCurve(this.mouseCurve,x,y)
      if (this.mouseCurvePoint != null) {
        this.clickedCurve = this.mouseCurve;
      }
    }

    // If user did click curve, calculate how far along it user clicked
    if (this.clickedCurve != null) {
      var t = x / this.gw
      var tx = this.nodeList[this.clickedCurve].x
      var nx = this.nodeList[this.clickedCurve+1].x
      var wx = nx - tx
      var ix = (t - tx) / wx
      this.clickedCurveIndex = ix;
    }
  }

  // Track mouse movement and react to what pointer is over
  this.trackMouse = function(x, y, node, button) {
    // If button clicked, hide mouse pointer
    if (button) { 
        max.hidecursor();
        return
    }
    // Or check if mouse position saved (something was clicked)
    if (this.saveWindowX != -1) {
      if ((this.clickedCurve == null) && (node != null)) {
        // Moving node
        if ((x != this.saveMouseX) && (y != this.saveMouseY)) {
          // Mouse button released from node move, restore pointer position
          var curve = this.calcPixelCoordinates(node);
          max.pupdate(this.saveWindowX + curve.sx, this.saveWindowY + curve.sy)
        }
      } else {
        // Moving curve
        if ((x != this.saveMouseX) && (y != this.saveMouseY)) {
          // Mouse pointer released from curve move, restore pointer position
          var n = this.calcPixelCoordinates(node)
          var b = this.calculateBezierPoint(n.sx, n.sy, n.cx, n.cy, n.cx, n.cy, n.ex, n.ey, this.clickedCurveIndex)
          max.pupdate(this.saveWindowX + this.saveMouseX, this.saveWindowY + b.y)

        }
      }

      // Button released, show mouse pointer
      max.showcursor();
      // Update mouse-over variables
      this.mouseOver(x,y);
      // Reset mouse save variables
      this.saveWindowX = -1;
      this.saveWindowY = -1;  
      this.saveMouseX = 0;
      this.saveMouseY = 0;  
    }
  }

  // Function to handle dragging of node or curve
  this.onDrag = function(x,y,cmd,shift,button) {
    var DX = x - this.MX;
    var DY = this.MY - y
  
    // If user has clicked node and drags, move X/Y position of node
    if (this.clickedNode != null) {
         this.setNodeX(this.clickedNode, DX * (1.0 / this.jwidth * this.mouseSpeed));
         this.setNodeY(this.clickedNode, DY * (1.0 / this.jheight * this.mouseSpeed));
         this.trackMouse(x, y, this.clickedNode, button);
         if (this.autoOutput) { this.outputFlag = true };
        } else if (this.clickedCurve != null) {
      if (shift) {
        // If CMD held, set Y position of curve segment
        if (this.clickedCurve != null) {
          this.setCurveY(this.clickedCurve, DY * (1.0 / this.jheight * this.mouseSpeed)); 
          this.setCurveX(this.clickedCurve, DX * (1.0 / this.jwidth * this.mouseSpeed)); 
          if (this.autoOutput) { this.outputFlag = true };
          if (button) {
            max.hidecursor();
          } else {
            max.showcursor();
          }
        }
      } else {
        // Otherwise change curve control point of curve
        this.setControlPoint(this.clickedCurve, 
          (DX * (1.0 / this.jwidth * this.mouseSpeed) * 0.75), 
          (DY * (1.0 / this.jheight * this.mouseSpeed) * 0.75));
          this.trackMouse(x, y, this.clickedCurve, button);
      }
      if (this.autoOutput) { this.outputFlag = true };
    }
    this.MX = x;
    this.MY = y;
  }

  // Handle mouse leaving graph area
  this.mouseOut = function() {
    this.mouseSegment = null;
    this.mouseCurve = null;
    this.mouseCurvePoint = null;
    this.mouseNode = null;
    if (this.autoHideNodes) { this.nodesVisible = false };
  }
  
  // Some data massaging to get the correct results for the Max [curve~] object
  // You might want to define your own outputs if this doesn't suit your needs
  this.outputList = function() {
    var out = [];
    // Add first node to output list using a time delta of zero
    out.push(1-this.nodeList[0].y, 0.0, 0.0);
    for (n = 1; n <= this.nodeCount-1; n++) {
      // Add next node Y value
      out.push(1-this.nodeList[n].y);
      // Add node delta time
      out.push((this.nodeList[n].x - this.nodeList[n-1].x) * this.timeScale)
      // Add node curve factor
      out.push((this.nodeList[n-1].cp * 1.998) - 0.999);      
    }
    // Send output list to first outlet
    this.outputFlag = false;
    return out;
  }

  // Called to constantly output node list, if enabled
  this.outputConstantly = function() {
    if (this.autoOutput) {
      var out = (this.outputFlag) ? this.outputList() : false
      this.outputFlag = false;
      return out;
    }
  }

  // Return curve segment number based on time input
  this.whichSegment = function(t) {
    for (var n = 0; n < this.nodeList.length - 1; n++ ) {
      if ((t >= this.nodeList[n].x) && (t <= this.nodeList[n+1].x)) {
        return n        
      }
    }
  }
  
  // Return a segment and index into that segment based on time
  this.getSegmentAndIndex = function(t) {
    var s = this.whichSegment(t)
    var tx = this.nodeList[s].x
    var nx = this.nodeList[s+1].x
    var wx = nx - tx
    var ix = (t - tx) / wx
    return {s:s, ix:ix}
  }

  // Output Y value at time specified by input (ms)
  this.outputValueAtTime = function(t) {
    if ((t < 0.0) || (t > this.timeScale)) {
      post("Error: time is outside of range of current timescale setting for graph.")
      return;
    }
    this.outputValueAtPosition(t / this.timeScale)
  }

  // Output Y value at time (normalised)
  this.outputValueAtPosition = function(t) {
    var si = this.getSegmentAndIndex(t)
    var n = this.calcPixelCoordinates(si.s)
    var b = this.calculateBezierPoint(n.sx, n.sy, n.cx, n.cy, n.cx, n.cy, n.ex, n.ey, si.ix)
    outlet(1, [ 1.0 - ((this.gh,(b.y) - this.padding) / this.gh)  ])
    refresh();
  }

  this.setNode = function(p, x, y, c) {
    this.setXat(p, x);
    this.setYat(p, y);
    this.setCat(p, c);
  }

  this.setXat = function(p, px) {
    if ((p > 0) && (p < this.nodeCount-1)) {
      this.nodeList[p].x = clamp(px, this.nodeList[p-1].x, this.nodeList[p+1].x);
    }
    if (this.autoOutput) { this.outputFlag = true };
  }

  this.setYat = function(p, py) {
    if (p < this.nodeCount) {
      this.nodeList[p].y = clamp(py, 0.0, 1.0);
    }
    if (this.autoOutput) { this.outputFlag = true };
  }

  this.setCat = function(p, c) {
    if (p < this.nodeCount-1) {
      this.nodeList[p].cp = clamp(c, 0.0, 1.0);
    }
    if (this.autoOutput) { this.outputFlag = true };
  }

  // Save mouse position when hiding mouse pointer
  this.saveMouse = function(mx, my, wx, wy) {
    this.saveMouseX = mx;
    this.saveMouseY = my;
    this.saveWindowX = wx;
    this.saveWindowY = wy;
  }

  //----------------------------------------------------------------------------
  // Parameter setting functions
  //----------------------------------------------------------------------------

  this.setTimeScale = function(t) {
    this.timeScale = t;
    if (this.autoOutput) { this.outputFlag = true };
  }

  this.setPadding = function(p) {
    this.padding = clamp(p, 0, 128);
  }

  this.setNodeSize = function(n) {
    this.nodeSize = clamp(n, 2.5, this.padding);
  }

  this.setLineWidth = function(l) {
    this.lineWidth = clamp(l, 1.0, 4.0);
  }

  this.setAutoOutput = function(a) {
    this.autoOutput = a;
  }

  this.setFillColor = function(color) {
    this.fillColor = color;
  }

  this.setStrokeColor = function(color) {
    this.strokeColor = color;
  }

  this.setBgColor = function(color) {
    this.bgColor = color
  }

  this.setNodeHighlighting = function(n) {
    this.nodeHighlighting = n;
  }

  this.setCurveHighlighting = function (c) {
    this.curveHighlighting = c
  }

  this.setAutoHideNodes = function(a) {
    this.autoHideNodes = a
  }

  this.setNodesVisible = function(n) {
    this.nodesVisible = n;
  }

  // Scaled mouse delta values for updating node position etc.
  this.setMouseSpeed = function(s) {
    // Clamp to reasonable speed (guess)
    this.mouseSpeed = clamp(s, 0.25, 2.0)
  }
  
  // Set graph from node list (MMMSEGUI format)
  this.setGraph = function(nlist) {
    if (nlist.length < 6) {
      post("Error: graph command needs at least 2 nodes (x, y, c)")
      return
    }

    this.nodeList = []
    for (var n = 0; n < nlist.length; n+=3) {
      var nx = nlist[n]
      var ny = nlist[n+1]
      var nc = nlist[n+2]
        this.nodeList.push(new Node(nx, ny, nc))
      }

    this.nodeCount = this.nodeList.length;

    // Check start and end of curve are at 0.0/1.0 and adjust if not
    if ((this.nodeList[0].x != 0.0) || (this.nodeList[this.nodeCount-1].x != 1.0)) {
      post("Warning: start/end of graph adjusted to 0.0/1.0")
      this.nodeList[0].x = 0.0
      this.nodeList[this.nodeCount-1].x = 1.0  
    }
    if (this.autoOutput) { this.outputFlag = true };
  }

  // Set graph from node list in 'curve~' object format
  this.setGraphFromCurve = function(nlist) {
    if (nlist.length < 6) {
      post("Error: graph command needs at least 2 nodes (x, y, c)")
      return
    }

    var dt = 0.0
    var tempNodeList = []
    this.nodeList = []

    // Build temporary list first as need to calculate total curve time in MS
    for (var n = 0; n < nlist.length; n+=3) {
      var y = nlist[n]
      var x = dt += nlist[n+1]
      var c = nlist[n+2] / 1.998 + 0.5;
      // post(list[n+2],c)
      tempNodeList.push([y, x, c])
    }

    // Set timescale for new curve
    this.timeScale = dt

    // Process list and replace absolute X time with normalised value
    for (n = 0; n < tempNodeList.length; n++) {
      var y = 1.0 - tempNodeList[n][0]
      var x = tempNodeList[n][1] / this.timeScale
      // Curve point is always related to next node
      var c = (n == tempNodeList.length -1) ? 0.5 : 1.0 * [tempNodeList[n+1][2]]
      // Have to "cast" parameter to floats for some reason
      this.nodeList.push(new Node(1.0 * x, 1.0 * y, 1.0 * c))
    }

    this.nodeCount = this.nodeList.length

    // Check start and end of curve are at 0.0/1.0 and adjust if not
    if ((this.nodeList[0].x != 0.0) || (this.nodeList[this.nodeCount-1].x != 1.0)) {
      post("Warning: start/end of graph adjusted to 0.0/1.0")
      this.nodeList[0].x = 0.0
      this.nodeList[this.nodeCount-1].x = 1.0  
    }
    if (this.autoOutput) { this.outputFlag = true };
  }

  // Clear graph
  this.initNodeList = function() {
    // Create initial 'empty' node list
    this.nodeList = [
      new Node(0.0, 0.0, 0.5),
      new Node(1.0, 1.0, 0.5)
    ]
    this.nodeCount = this.nodeList.length;
    if (this.autoOutput) { this.outputFlag = true };
  }

  //----------------------------------------------------------------------------
  // Init
  //----------------------------------------------------------------------------

  this.parent = parent;

  this.setupWindow()

  this.curveFillColor = [0,0,0,0]
  this.curveStrokeColor = [0,0,0,0]
  this.bgColor = [0,0,0,0]

  // Set default values
  this.setNodeHighlighting(true);
  this.setCurveHighlighting(true);
  this.setAutoHideNodes(true);
  this.setAutoOutput(true);
  this.setPadding(8)
  this.setBgColor([0.1, 0.1, 0.1, 1.0]);
  this.setFillColor([0.7, 0.7, 0.7, 0.7]);
  this.setStrokeColor([0.8, 0.8, 0.8, 0.6])
  this.setTimeScale(1000)
  this.setMouseSpeed(1.0)

  // Calculate defauly Node Size and Line Width based on window size
  var v1 = (this.jwidth + this.jheight) / 750
  var v2 = Math.max(1, v1)
  this.setNodeSize(Math.max(4, v2))
  this.setLineWidth(v2)
  
  // Init mouse iterraction variables
  this.mouseSegment = null;
  this.mouseCurve = null;
  this.mouseCurveIndex = 0.0
  this.mouseCurvePoint = null;
  this.mouseNode = null;
  this.clickedNode = null;
  this.clickedCurve = null;
  this.clickedCurveIndex = 0.0;
  this.curveClickTolerance = 8;
  this.outputFlag = false;
  this.MX = 0;
  this.MY = 0;
  this.DX = 0;
  this.DY = 0;
  this.saveWindowX = -1;
  this.saveWindowY = -1;
  this.saveMouseX = 0;
  this.saveMouseY = 0;
  this.initNodeList();

  return this
}

//----------------------------------------------------------------------------
// MMSEGUI Wrapper
//----------------------------------------------------------------------------

function paint() {
  // Always calculate window settings in case it has been resized
  mmmsegui.setupWindow()

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
  mmmsegui.onClick(x,y,shift);
  mmmsegui.saveMouse(x, y, 
    this.patcher.getattr('rect')[0] + this.box.rect[0],
    this.patcher.getattr('rect')[1] + this.box.rect[1]
  )
}

function ondblclick(x, y, button, cmd, shift, capslock, option, ctrl) {
  mmmsegui.onDblClick(x,y,shift);
  mmmsegui.saveMouse(x, y,
  this.patcher.getattr('rect')[0] + this.box.rect[0],
  this.patcher.getattr('rect')[1] + this.box.rect[1]
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

function onresize(w, h) {
	this.box.size(w, h);
  mmmsegui.setupWindow();
  refresh();
}

function bang() {
  var out = mmmsegui.outputList();
  outlet(0, out)
}

//----------------------------------------------------------------------------
// Parameter message functions
//----------------------------------------------------------------------------

function fillcolor (r, g, b, a) {
  mmmsegui.setFillColor([r, g, b, a]);
  refresh();
}

function strokecolor (r, g, b, a) {
  mmmsegui.setStrokeColor([r, g, b, a])
  refresh();
}

function bgcolor (r, g, b, a) {
  mmmsegui.setBgColor([r, g, b, a]);
  refresh();
}

function timescale (t) {
  mmmsegui.setTimeScale(t)
  refresh();
}

function nodesize(n) {
  mmmsegui.setNodeSize(n)
  refresh();
}

function linewidth(l) {
  mmmsegui.setLineWidth(l)
  refresh()
}

function padding (p) {
  mmmsegui.setPadding(p)
  refresh()
}

function autooutput(a) {
  mmmsegui.setAutoOutput(a);
  refresh()
}

function nodehighlighting(n) {
  mmmsegui.setNodeHighlighting(n)
  refresh()
}

function curvehighlighting(c) {
  mmmsegui.setCurveHighlighting(c)
  refresh()
}

function autohidenodes(a) {
  mmmsegui.setAutoHideNodes(a)
  refresh()
}

function nodesvisible(n) {
  mmmsegui.setNodesVisible(n)
  refresh()
}

function clear() {
  mmmsegui.initNodeList()
  refresh();
}

function graph() {
  mmmsegui.setGraph(arguments);
  refresh();  
}

function graphfromcurve() {
  mmmsegui.setGraphFromCurve(arguments);
  refresh();  
}

function mousespeed(s) {
  mmmsegui.setMouseSpeed(s);
}

function nodelist() {
  for (n = 0; n < mmmsegui.nodeCount; n++) {
    post(mmmsegui.nodeList[n].x, mmmsegui.nodeList[n].y, mmmsegui.nodeList[n].cp)
  }
}

function getvalue(p) {
  mmmsegui.outputValueAtPosition(clamp(p, 0.0, 1.0))
}

function setnode(p, x, y, c) {
  mmmsegui.setNode(p, x, y, c);
  refresh();
}
function setxat(p, x) {
  mmmsegui.setXat(p, x);
  refresh();
}

function setyat(p, y) {
  mmmsegui.setYat(p, y);
  refresh();
}

function setcat(p, c) {
  mmmsegui.setCat(p, c);
  refresh();
}

function getvalueattime(t) {
  mmmsegui.outputValueAtTime(t);
}

function msg_float(t) {
  mmmsegui.outputValueAtPosition(t);
}

//----------------------------------------------------------------------------
// Functions for saving and restoring curve when saving patcher
//----------------------------------------------------------------------------
var saveList = [];
var saveParameters = [];

function loadNodes(sl) {
  mmmsegui.loadNodes(sl);
}

function loadParameters(sp) {
  mmmsegui.loadParameters(sp);
}

function save() {
  saveList = JSON.stringify(mmmsegui.nodeList)
  saveParameters = JSON.stringify(mmmsegui.saveParameters());
  embedmessage("loadNodes",saveList)
  embedmessage("loadParameters",saveParameters)
}
