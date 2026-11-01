local icons = require("icons")
local settings = require("settings")

sbar.add("item", {
    icon = {
        padding_left = settings.padding.icon_item.icon.padding_left,
        padding_right = settings.padding.icon_item.icon.padding_right,
        string = icons.apple,
    },
    label = { drawing = false },
    click_script = "$CONFIG_DIR/helpers/menus/bin/menus -s 0",
})
