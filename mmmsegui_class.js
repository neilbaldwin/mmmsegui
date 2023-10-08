//----------------------------------------------------------------------------
// Mmmsegui Object Definition
//----------------------------------------------------------------------------
function Mmmsegui (jx, jy, jwidth, jheight, wp, ns, ts, autoout) {

  // Mouse-over highlighting : *slightly* faster if turned off!
  this.nodeHighlighting = true;
  this.curveHighlighting = true;
  this.autoHideHandles = true;
  this.autoOutput = autoout;

  // Scaled mouse delta values for updating node position etc.
  this.mouseSpeed = 1.0
  this.mouseDeltaResolutionX = 1.0 / jwidth * this.mouseSpeed;
  this.mouseDeltaResolutionY = 1.0 / jheight * this.mouseSpeed;

  // Init window variables
  this.wp = wp;
  this.bgColor = [0.2, 0.2, 0.2, 1.0];
  this.handlesVisible = false;

  // Init mouse iterraction variables
  this.mouseSegment = null;
  this.mouseCurve = null;
  this.mouseCurvePoint = null;
  this.mouseNode = null;
  this.clickedNode = null;
  this.clickedCurve = null;
  this.curveClickTolerance = 8;
  this.MX = 0;
  this.MY = 0;
  this.DX = 0;
  this.DY = 0;
  this.saveMouseX = 0;
  this.saveMouseY = 0;
  this.outputFlag = false;

  // Init curve line and node handle variables
  this.nodeSize = ns;
  this.lineWidth = 1;
  this.curveFillColor = [0.1875, 1., 0.923828];
  this.curveFillAlpha = 0.3;
  this.curveStrokeAlpha = 0.6;

  // Init output timescale to 250ms
  this.timeScale = ts;

  // Empty node list
  this.nodeList = [];

  this.setupWindow = function() {
    this.gw = jwidth - (wp * 2);
    this.gh = jheight - (wp * 2);  
  }

  // Create empty node object
  function Node (x, y, cp) {
    // Set specifed x and y positoin (normalised)
    this.x = x;
    this.y = y;
    // Set initial curve control point (0.5 = straight line)
    this.cp = cp;    
  }

  // Create initial 'empty' node list
  this.setupWindow()
  this.nodeList = [
    new Node(0.0, 1.0, 0.5),
    new Node(1.0, 0.0, 0.5)
  ];
  this.nodeCount = this.nodeList.length;

  //----------------------------------------------------------------------------
  // Object methods
  //----------------------------------------------------------------------------

  // Whole graph and nodes use normalised coordinates.
  // This calcs start, control point(s) and end screen pixel position
  // curve between node and next node for drawing and click detection.
  this.calcPixelCoordinates = function(n) {
    // Get start point node from node list
    var node = this.nodeList[n];
    // Get next node from list
    var nx = this.nodeList[n+1];

    // Calculate screen start position in pixels
    var sx = this.gw * node.x + this.wp;
    var sy = this.gh * node.y + this.wp;
    // If next node undefined this is end of curve so set arbitrary
    // control and end coordinates to avoid error.
    if (typeof nx == "undefined") {
      var ex = 0;
      var ey = 0;
      var cx = 0;
      var cy = 0;  
    } else {
      // Otherwise calculate curve control point position and end position in pixels
      var ex = this.gw * nx.x + this.wp;
      var ey = this.gh * nx.y + this.wp;
      var cp = node.cp;
      var cpx = node.x + ((nx.x-node.x) * cp);
      var cpy = nx.y - ((nx.y-node.y) * cp);
      var cx = this.gw * cpx + this.wp;
      var cy = this.gh * cpy + this.wp;
    }
    // Return object containing pixel positions
    return { sx:sx, sy:sy, cx:cx, cy:cy, ex:ex, ey:ey }
  }

  // Draw background fill
  this.drawBg = function() {
    mgraphics.set_source_rgba(this.bgColor);
    // Fill entire JSUI window
    mgraphics.rectangle(0, 0, jwidth, jheight);    
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
    mgraphics.line_to(this.gw + this.wp, this.gh + this.wp);
    mgraphics.line_to(this.wp, this.gh + this.wp);    
    mgraphics.close_path();
    mgraphics.set_source_rgba(this.curveFillColor, this.curveFillAlpha);    
    mgraphics.fill_preserve();
    mgraphics.set_source_rgba(this.curveFillColor, this.curveStrokeAlpha);
    mgraphics.set_line_width(this.lineWidth);
    mgraphics.stroke();

    // Highlights curve when curve detected under mouse pointer
    if (this.curveHighlighting) {
      if ((this.mouseCurvePoint != null) && (this.mouseNode == null)) {
        var curve = this.calcPixelCoordinates(this.mouseCurve)
        mgraphics.set_source_rgba(this.curveFillColor, this.curveStrokeAlpha*2);
        mgraphics.set_line_width(this.lineWidth*2);
        mgraphics.move_to(curve.sx, curve.sy);
        mgraphics.curve_to(curve.cx, curve.cy, curve.cx, curve.cy, curve.ex, curve.ey);
        mgraphics.stroke();
      }  
    }
  }

  // Draw node handles for dragging
  this.drawNodes = function() {
    if (!this.handlesVisible) { return };

    mgraphics.set_line_width(2);
    var curve = this.calcPixelCoordinates(0)
    mgraphics.rectangle(curve.sx-(this.nodeSize/2), 
      curve.sy-(this.nodeSize/2), this.nodeSize, this.nodeSize);

    for (n = 1; n < this.nodeCount-1; n++) {
      var curve = this.calcPixelCoordinates(n);
      mgraphics.ellipse(curve.sx-(this.nodeSize/2), 
        curve.sy-(this.nodeSize/2), this.nodeSize, this.nodeSize);
    }
    
    var curve = this.calcPixelCoordinates(this.nodeCount-1);
    mgraphics.rectangle(curve.sx-(this.nodeSize/2), 
      curve.sy-(this.nodeSize/2), this.nodeSize, this.nodeSize);
    mgraphics.set_source_rgba(this.bgColor);
    mgraphics.fill_preserve();
    mgraphics.set_source_rgba(this.curveFillColor,this.curveStrokeAlpha);
    mgraphics.stroke();

    // Highlights node if node detected under mouse pointer
    if (this.nodeHighlighting) {
      if (this.mouseNode != null) {
        var curve = this.calcPixelCoordinates(this.mouseNode)
        var ns = this.nodeSize * 1.8;
        if ((this.mouseNode == 0) || (this.mouseNode == this.nodeCount-1)) {
          mgraphics.rectangle(curve.sx-(ns/2), curve.sy-(ns/2), ns, ns);
        } else {
          mgraphics.ellipse(curve.sx-(ns/2), curve.sy-(ns/2), ns, ns);
        }
        mgraphics.set_source_rgba(this.curveFillColor,this.curveStrokeAlpha*2);        
        mgraphics.fill();
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

  this.setCurveY = function(n, f) {
    var c1 = this.nodeList[n].y - f;
    var c2 = this.nodeList[n+1].y - f;
    if ((c1 < 0.0) || (c1 > 1.0) || (c2 < 0.0) || (c2 > 1.0)) { return };
    this.nodeList[n].y = c1;
    this.nodeList[n+1].y = c2;
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

  this.mouseOver = function(x,y) {
    if (this.autoHideHandles) { this.handlesVisible = true };
    this.mouseNode = null;
    this.mouseSegment = null;
    this.mouseCurvePoint = null;
    for (n = 0; n <= this.nodeCount-1; n++) {
      var curve = this.calcPixelCoordinates(n)
      if (( x > curve.sx-this.nodeSize) && (x < curve.sx+this.nodeSize)
        && (y > curve.sy-this.nodeSize) && (y < curve.sy+this.nodeSize)) {
          this.mouseNode = n
      }
    }

    if ((x < this.wp ) || (x > this.gw + this.wp) || (y < this.wp) || (y > this.gh + this.wp)) { 
      return
    };

    // Determine which curve segment mouse pointer is over
    for (n = 0; n <= this.nodeCount - 2; n++) {
      if ((x / this.gw) > this.nodeList[n].x) { this.mouseSegment = n };
    }

    if (this.mouseSegment != null) {
      this.mouseCurvePoint = this.isPointNearCurve(this.mouseSegment, x, y);
      if ((this.mouseCurvePoint != null)) {
        this.mouseCurve = this.mouseSegment;
      }
    }

    return
  }

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

  this.onClick = function(x,y, shift) {
    // if ((x < this.wp ) || (x > this.gw + this.wp) || (y < this.wp) || (y > this.gh + this.wp)) { return };
    this.MX = x;
    this.MY = y;	
    this.clickedNode = null;
    this.clickedCurve = null;
    this.mouseCurvePoint = null;

    if (this.mouseNode != null) { this.clickedNode = this.mouseNode };
  
    // If SHIFT and clicked node, delete that node
    if ((shift) && (this.clickedNode != null)) {
      this.deleteNode(this.clickedNode);
      this.clickedNode = null;
      this.saveMouse();
      if (this.autoOutput) { this.outputFlag = true };
    }

    if ((this.mouseNode == null) && (this.mouseSegment != null)) {
      this.mouseCurvePoint = this.isPointNearCurve(this.mouseCurve,x,y)
      if (this.mouseCurvePoint != null) {
        this.clickedCurve = this.mouseCurve;
      }
    }

    if ((shift) && (this.clickedCurve != null)) {
        var ax = (this.mouseCurvePoint.x / this.gw) - (this.wp / this.gw);
        var ay = (this.mouseCurvePoint.y / this.gh) - (this.wp / this.gh);
        this.addNode(ax, ay, 0.5);
        this.clickedCurve = null;
        if (this.autoOutput) { this.outputFlag = true };
    }
  }

  this.trackMouse = function(x, y, node, button) {
    if (button) { 
        max.hidecursor();
        return
    }
      if (this.saveMouseX != null) {
        if ((this.clickedCurve == null) && (node != null)) {
          var curve = this.calcPixelCoordinates(node);
          max.pupdate(this.saveMouseX + curve.sx, this.saveMouseY + curve.sy)
        } else {
          var cp = this.getCurvePoint();
          max.pupdate(this.saveMouseX + cp.x, this.saveMouseY + cp.y)
        }
        max.showcursor();
        this.mouseOver(x,y);
        this.saveMouseX = null;
        this.saveMouseY = null;  
      }
  }

  this.onDrag = function(x,y,cmd,shift,button) {
    var DX = x - this.MX;
    var DY = this.MY - y
  
    // If user has clicked node and drags, move X/Y position of node
    if (this.clickedNode != null) {
         this.setNodeX(this.clickedNode, DX * this.mouseDeltaResolutionX);
         this.setNodeY(this.clickedNode, DY * this.mouseDeltaResolutionY);
         this.trackMouse(x, y, this.clickedNode, button);
         if (this.autoOutput) { this.outputFlag = true };
        } else if (this.clickedCurve != null) {
      if (cmd) {
        // If CMD held, set Y position of curve segment
        if (this.clickedCurve != null) {
          this.setCurveY(this.clickedCurve, DY * this.mouseDeltaResolutionY); 
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
          (DX * this.mouseDeltaResolutionX * 0.75), 
          (DY * this.mouseDeltaResolutionY * 0.75));
          this.trackMouse(x, y, this.clickedCurve, button);
      }
      if (this.autoOutput) { this.outputFlag = true };

    }
  
    this.MX = x;
    this.MY = y;
  
  }

  this.mouseOut = function() {
    this.mouseSegment = null;
    this.mouseCurve = null;
    this.mouseCurvePoint = null;
    this.mouseNode = null;
    if (this.autoHideHandles) { this.handlesVisible = false };
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

  this.setFillColor = function(r, g, b) {
    this.curveFillColor[0] = r;
    this.curveFillColor[1] = g;
    this.curveFillColor[2] = b;  
  }

  this.setBgColor = function(r, g, b, a) {
    this.bgColor[0] = r;
    this.bgColor[1] = g;
    this.bgColor[2] = b;  
    this.bgColor[3] = a;  
  }

  this.setTimeScale = function(t) {
    this.timeScale = clamp(t, 10, 10000);
  }

  this.outputConstantly = function() {
    if (this.autoOutput) {
      var out = (this.outputFlag) ? this.outputList() : false
      this.outputFlag = false;
      return out;
    }
  }

  this.saveMouse = function(x,y) {
    this.saveMouseX = x;
    this.saveMouseY = y;
  }

  // Return instance of Mmmsegui
  return this
}
