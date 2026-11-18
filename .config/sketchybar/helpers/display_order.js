// Prints sketchybar display arrangement-ids ordered left-to-right (ties: top
// to bottom), i.e. in the same order AeroSpace numbers its monitors.
// Sketchybar's arrangement-id is the display's index in SkyLight's managed
// display list, which has nothing to do with physical position.
// Usage: osascript -l JavaScript display_order.js  ->  e.g. [1,3,2]
ObjC.import("AppKit");
ObjC.bindFunction("CGSMainConnectionID", ["int", []]);
ObjC.bindFunction("CGSCopyManagedDisplays", ["id", ["int"]]);
ObjC.bindFunction("CGDisplayCreateUUIDFromDisplayID", ["void *", ["unsigned int"]]);
ObjC.bindFunction("CFUUIDCreateString", ["id", ["void *", "void *"]]);

var managed = ObjC.deepUnwrap($.CGSCopyManagedDisplays($.CGSMainConnectionID()));
var screens = $.NSScreen.screens;
var list = [];
for (var i = 0; i < screens.count; i++) {
	var screen = screens.objectAtIndex(i);
	var did = ObjC.unwrap(screen.deviceDescription.objectForKey("NSScreenNumber"));
	var uuid = ObjC.unwrap($.CFUUIDCreateString(null, $.CGDisplayCreateUUIDFromDisplayID(did)));
	var frame = screen.frame;
	// NSScreen y grows upwards; negate the top edge to sort top-to-bottom.
	list.push({ x: frame.origin.x, top: -(frame.origin.y + frame.size.height), aid: managed.indexOf(uuid) + 1 });
}
list.sort(function (a, b) {
	return a.x - b.x || a.top - b.top;
});
JSON.stringify(
	list.map(function (d) {
		return d.aid;
	})
);
