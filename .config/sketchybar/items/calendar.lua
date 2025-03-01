local settings = require("settings")

local cal = sbar.add("item", {
    icon = {
        font = {
            family = settings.font.text,
            style = settings.font.style_map["Regular"],
            size = settings.font.size,
        },
        padding_left = 8,
    },
    label = {
        align = "right",
        font = {
            size = 13,
        },
        padding_right = 10,
    },
    position = "right",
    update_freq = 30,
    padding_left = 1,
    padding_right = 1,
})

cal:subscribe({ "forced", "routine", "system_woke" }, function(env)
    cal:set({ icon = os.date("%A, %Y-%m-%d"), label = os.date("%H:%M") })
end)
