local settings = require("settings")

local weather = sbar.add('item', 'weather', {
    position = "right",
    padding_left = 1,
    padding_right = 1,
    update_freq = 600,
    label = {
        font = {
            size = 13.0
        },
        padding_right = 10
    }
})

weather:subscribe({"forced", "routine", "system_woke"}, function(env)
    local FormatString<const> = "j2"

    local current_location = "JerseyCity" -- hard code due to vpn
    local cmd = string.format("curl -s 'https://wttr.in/%s?m&format=%s'", current_location, FormatString)
    print(cmd)

    sbar.exec(cmd, function(wttr_json)
        if wttr_json ~= nil then
            local current_condition = wttr_json.current_condition[1]
            local desc = current_condition.weatherDesc[1].value
            local label = current_condition.temp_C .. "°C"
            weather:set({
                label = string.format("%s, %s", label, desc)
            })
        end
    end)
end)
