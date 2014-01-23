D3-dateline
===========

D3 visualization of correspondence, with letters arranged on a horizontal timeline, with links, 
and handling of undated items. 

The idea is to present a series of letters as markers along a scrollable horizontal timeline,
with links indicating when one letter answers another. Letters with precise dates are place in 
fixed positions, and undated letters have their position determined by their links. If they have 
no links, they float to the top.

All letters must have a date, which is used for positioning.

In the [example](http://wallandbinkley.com/d3dateline/), 
the colour of the circle indicates the author of the letter. The border of the 
circle is black if the letter is dated and red if it isn't. The arrow links point from a letter 
to its answer.

See the tick(e) function to see how the positioning works: gravity is turned off, and non-fixed
nodes are pulled left, right or up based on their "type" property. Nodes have a slight charge to 
repel each other, just enough to keep them from overlapping.