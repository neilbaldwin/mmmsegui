## MMMSEGUI

A multi-segment graph editor written in JS/JSUI for Maxmsp written by Neil Baldwin, October 2023

info@marmotaudio.co.uk

#### Updates:

8th October 2023:

* Consolidated the main JS file and the _class.js file into one file. It's easier for me to work on.
* Implemented mouse pointer hiding when moving nodes etc.
* Implemented state restoring - your MMMSEGUI objects should retain their state now when you save your patcher file

### Rationale

As part of my ongoing JSUI journey I wanted to tackle a decent multi-segment editor. I've dabbled with a few before and this is an amalgamation of what I learned from previous efforts.

The main objectives for this were:

* make it very simple and fast to use
* have the ability to add and delete nodes
* have the ability to output directly into a list message for use with the `curve~` Max object
* have it easy to add to other projects
* have it be very customizable

#### Content and Installation

You just need the two main files in your project/Max path:

* `mmmsegui.js` is the main JSUI file. Add this to your project by creating a `JSUI` object with `@filename` parameter i.e. `jsui @filename mmmsegui.js`. This file is primarly concerned with setting up a JSUI object for use with MMMSEGUI.

* `mmmsegui.maxpat` is the demo patcher to demonstrate MMMSEGUI.

* `readme.md` this file.

**Note for users of earlier versions: the file `mmmsegui_class.js` has been removed in favour of a single file schema. It's easier for me to work on and was partly necessary when I implemented the state saving functionality.

#### Setup and Customization

The file `mmmsegui.js` contains the basic setup for MMMSEGUI. Look there first.

To instasiate a basic MMMSEGUI you need:

`var mmmsegui = new Mmmsegui (jwidth, jheight, this.padding, this.nodesize, this.timescale, autooutput);
`

* The variable name for the instance, `mmmsegui` can be whatever you like but it is referred to throughout that file so you'll need to change all occurences to avoid an error.

* `jwidth` is the width in pixels of the JSUI window and along with `jheight` is calculated near the top of the main .JS file.

* `this.padding` is an amount of padding in pixels applied to the inside of the JSUI window in order to create a margin between the window and the actual MMMSEGUI graph.

* `this.nodesize` sets the width in pixels of the node handles

* `this.timescale` sets the total output time of the graph in MS. The internal node positions etc. are all normalised (0.0 to 1.0) so this sets a scaling output value depending on what you want to apply the graph output to.

* `this.autooutput` by default, to get the graph to output the list to send to a `curve~` object you need to send a `bang` message to it (hence the `metro` setupt in the demo Maxpat file). If this option is set to `true`, the graph will output the current list whenever you change anything in the graph.

The default MMSEGUI only contains two nodes, the end and start nodes. These cannot be deleted and only their Y position (and curve shape) can be changed. To add more nodes (or delete them) you need to use the mouse (and keyboard).

#### Adding, Deleting and Moving

**To add a node**: hold SHIFT and click on a curve segment. The new node will be placed where you click.

**To delete a node**: hold SHIFT and click on an existing node. The first and last nodes cannot be deleted. They are square-shaped to distinguish them from regular nodes.

**To move a node**: click and drag a node with the mouse.

**To change a curve shape**: click-and-drag on a curve segment.

**To move a curve segment (vertically)**: hold COMMAND (or WIN?) and then click-and-drag a curve segment. Not that the position will be constrained by the higer/lower node.

#### Customization

There is a HUGE amount of stuff that you can customize, most of it is located in the upper part of the `mmmsegui.js` file. I've tried to create variables with usefully explicit names.

I've deliberately only created a few message functions (see bottom of `mmmsegui.js` file) so that you can create your parameter messages (see the method for setting the graph/bg colors in the demo Maxpat file).

I also created the basis of an @-style parameter system for creating instance variables (variable that affect how the graph is initially rendered). This is at the top of the `mmmsegui.js` file - you should be able to spot the @ parameter names. I'm not going to go into how to do this, you should be able to figure it out. If not, hit me up on Max Discord or email me (email address at top of this file).

##### Customization Fundamentals

Here are a few variables you'll find at the top of the `mmmsegui.js` file that you can play around with. You'll see the function call to instansiate the object at near the top:

`function Mmmsegui (jwidth, jheight, wp, ns, ts, autoout)`

These are the parameters as they are initialised by default. You can of course change these in the source file if you'd prefer different defaults or add message methods etc. to enable you to set them externally:

`this.nodeHighlighting = true;`
As you move your mouse pointer over nodes they are highlighted by enlarging and filling them.

`this.curveHighlighting = true;`
As you move your mouse pointer over curves they are highlighted by increasing line thickness.

`this.autoHideHandles = true;`
When your mouse pointer leaves the JSUI window, nodes will be hidden.

`this.autoOutput = autoout;`
Sets automatic list output from the instance function call variable 'autoout'. AutoOutput controls the automatic outputting of graph parameters into a `curve~` compatible list as you edit the graph.

`this.mouseSpeed = 0.75`
Controls the rate of movement when click-dragging nodes and curves to change their position. The actual calculation is the next parameter.

`this.mouseDeltaResolution = 1.0 / jheight * this.mouseSpeed;`
As you click-drag curve elements, the actual movment is based on the pixel height of the JSUI window.

`this.bgColor = [0.2, 0.2, 0.2, 1.0];`
Sets the fill color of the rectangle that fills the JSUI window behind the graph.

`this.curveClickTolerance = 8;`
When you're attempting to click on a curve (to move the curve control point or move the curve segment, or when adding a new node), this is how accurate you need to be in pixels.

`this.nodeSize = ns;`
Node size as set by the instancing function call.

`this.lineWidth = 1;`
Sets the base line width of the graph stroke and node stroke.

`this.curveFillColor = [0.1875, 1., 0.923828];`
Sets the base fill colour of the graph.

`this.curveFillAlpha = 0.3;`
Sets the alpha value for the curve fill.

`this.curveStrokeAlpha = 0.6;`
Sets the alpha value for the curve stroke.

`this.timeScale = ts;`
Sets the output timescale from the instance 'ts' parameter.

#### Using the Output

As already mentioned, the output is formatted as a list that will be immediately accepted by a `curve~` object. Basically it's a triplet of parameters per curve that describes the normalised level (Y axis), delta time from start of curve (X axis) and curve factor. Each triplet of parameters makes a stage of a multi-stage curve in a `curve~` object.

All values are normalised internally (0.0 to 1.0). Via the output function they are transformed as such:

* X axis is a delta time in ms based on the `timeScale` setting

* Y axies is left as a normalised value with 0.0 at the bottom and 1.0 at the top of the graph

* curve factor value is scaled to -0.999 to 0.999. This is essentially the *maximum* range for the `curve~` object. Once you go to -1.0 and 1.0 it start to get a bit weird.

##### Using the output from `curve~`

So then the output from the `curve~` object will be a float value in the range 0.0 to 1.0 so you will need a `scale~` object or other mathematical objects to transform the normalised value into something useful. I'll leave that for you to work out.

#### Deliberate Omissions

The main one is I haven't included any sort of mouse pointer hiding. I'll likely work on that after the initial release but at first release it's deliberately not included.

The other *omission* is that the output is only formatted for one particular use. If you go into the `mmmsegui.js` file and find the `this.outputList` function you'll see how this output is constructed. It's up to you to create your own output formats. I'd be especially keen if someone could figure out how to format the output to use in a multi-pole filter for example.

#### Issues, ideas?

info@marmotaudio.co.uk or find me on the Max Discord channel.

Neil
