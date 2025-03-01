local settings = require("settings")

local cal = sbar.add("item", {
    label = {
        align = "right",
        padding_right = 4
    },
    icon = {
        font = {
            size = 16.0
        },
        padding_left = settings.padding.icon_label_item.icon.padding_left,
        padding_right = settings.padding.icon_label_item.icon.padding_right - 4
    },
    position = "right",
    update_freq = 30,
    padding_left = 1,
    padding_right = 1
})

cal:subscribe({"forced", "routine", "system_woke"}, function(env)
    cal:set({
        label = os.date("%a, %b %d · %I:%M %p"),
        icon = "󰸗"
    })
end)
