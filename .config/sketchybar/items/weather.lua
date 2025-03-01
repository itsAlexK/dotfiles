local settings = require("settings")
local icons = require("icons")

local current_location = "JerseyCity" -- hard code due to vpn

local function map_condition_to_icon(cond)
    local condition = cond:lower():match("^%s*(.-)%s*$")
    if condition == "sunny" then
        return icons.weather.sunny
    elseif condition == "cloudy" or condition == "overcast" then
        return icons.weather.cloudy
    elseif condition == "clear" then
        return icons.weather.clear
    elseif string.find(condition, "storm") or string.find(condition, "thunder") then
        return icons.weather.stormy
    elseif string.find(condition, "partly") then
        return icons.weather.partly
    elseif string.find(condition, "rain") or string.find(condition, "drizzle") then
        return icons.weather.rainy
    elseif string.find(condition, "snow") then
        return icons.weather.snowy
    elseif string.find(condition, "mist") or string.find(condition, "fog") then
        return icons.weather.foggy
    end
    return "?"
end

local weather = sbar.add('item', 'weather', {
    position = "right",
    padding_left = 1,
    padding_right = 1,
    update_freq = 600,
    label = {
        font = {
            size = 13.0
        },
        padding_right = 8,
        padding_left = 2
    },
    icon = {
        padding_left = settings.padding.icon_label_item.icon.padding_left,
        padding_right = settings.padding.icon_item.icon.padding_right - 10
    }
})

local weather_desc = sbar.add("item", {
    position = "popup." .. weather.name,
    icon = {
        align = "left",
        font = {
            family = settings.font.text,
            style = settings.font.style_map["Regular"],
            size = settings.font.size
        },
        padding_left = 2
    },
    label = {
        align = "right",
        string = "",
        padding_right = 4
    }
})

weather:subscribe({"forced", "routine", "system_woke"}, function(env)
    local FormatString<const> = "j2"

    local current_location = "JerseyCity" -- hard code due to vpn
    local cmd = string.format("curl -s 'https://wttr.in/%s?m&format=%s'", current_location, FormatString)

    sbar.exec(cmd, function(wttr_json)
        if wttr_json ~= nil then
            local current_condition = wttr_json.current_condition[1]
            local desc = current_condition.weatherDesc[1].value
            local label = current_condition.temp_C .. "°C"
            local weather_icon = map_condition_to_icon(desc)

            weather:set({
                icon = {
                    string = weather_icon
                },
                label = label
            })

            weather_desc:set({
                label = string.format("%s: %s", current_location, desc)
            })
        end
    end)
end)

weather:subscribe("mouse.entered", function(env)
    local drawing = weather:query().popup.drawing
    weather:set({
        popup = {
            drawing = "on"
        }
    })
end)

weather:subscribe("mouse.exited", function(env)
    local drawing = weather:query().popup.drawing
    weather:set({
        popup = {
            drawing = "off"
        }
    })
end)

