local settings = require("settings")

local cal = sbar.add("item", {
    label = {
        align = "right",
        padding_right = 4
    },
    position = "right",
    update_freq = 30,
    padding_left = 1,
    padding_right = 1
})

cal:subscribe({"forced", "routine", "system_woke"}, function(env)
    cal:set({
        label = os.date("%A, %Y-%m-%d %H:%M")
    })
end)
