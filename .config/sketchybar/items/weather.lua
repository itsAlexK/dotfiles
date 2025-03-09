local settings = require("settings")
local icons = require("icons")

local function map_code_to_icon(code)
    if code == 0 then
        return icons.weather.clear
    elseif code == 1 or code == 2 then
        return icons.weather.partly
    elseif code == 3 then
        return icons.weather.cloudy
    elseif code == 45 or code == 48 then
        return icons.weather.foggy
    elseif code >= 51 and code <= 67 or code >= 80 and code <= 82 then
        return icons.weather.rainy
    elseif code >= 71 and code <= 77 or code == 85 or code == 86 then
        return icons.weather.snowy
    elseif code == 95 or code == 96 or code == 99 then
        return icons.weather.stormy
    else
        return "?"
    end
end

local function map_code_weather_desc(code)
    -- WMO Weather Code descriptions from Open-Meteo
    if code == 0 then
        return "Clear sky"
    elseif code == 1 then
        return "Mainly clear"
    elseif code == 2 then
        return "Partly cloudy"
    elseif code == 3 then
        return "Overcast"
    elseif code == 45 then
        return "Fog"
    elseif code == 48 then
        return "Depositing rime fog"
    elseif code == 51 then
        return "Light drizzle"
    elseif code == 53 then
        return "Moderate drizzle"
    elseif code == 55 then
        return "Dense drizzle"
    elseif code == 56 then
        return "Light freezing drizzle"
    elseif code == 57 then
        return "Dense freezing drizzle"
    elseif code == 61 then
        return "Slight rain"
    elseif code == 63 then
        return "Moderate rain"
    elseif code == 65 then
        return "Heavy rain"
    elseif code == 66 then
        return "Light freezing rain"
    elseif code == 67 then
        return "Heavy freezing rain"
    elseif code == 71 then
        return "Slight snow fall"
    elseif code == 73 then
        return "Moderate snow fall"
    elseif code == 75 then
        return "Heavy snow fall"
    elseif code == 77 then
        return "Snow grains"
    elseif code == 80 then
        return "Slight rain showers"
    elseif code == 81 then
        return "Moderate rain showers"
    elseif code == 82 then
        return "Violent rain showers"
    elseif code == 85 then
        return "Slight snow showers"
    elseif code == 86 then
        return "Heavy snow showers"
    elseif code == 95 then
        return "Thunderstorm"
    elseif code == 96 then
        return "Thunderstorm with slight hail"
    elseif code == 99 then
        return "Thunderstorm with heavy hail"
    else
        return "Unknown weather code"
    end
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
        padding_left = 2,
        padding_right = 8
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
    -- https://open-meteo.com/en/docs#latitude=40.7282&longitude=-74.0776&current=temperature_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code&minutely_15=&hourly=&daily=&timezone=America%2FNew_York&models=
    local cmd =
        ("curl -s curl -s 'https://api.open-meteo.com/v1/forecast?latitude=40.7282&longitude=-74.0776&current=temperature_2m,apparent_temperature,precipitation,rain,showers,snowfall,weather_code&timezone=America%2FNew_York'")

    sbar.exec(cmd, function(wttr_json)
        if wttr_json ~= nil then

            local weather_code = wttr_json.current.weather_code
            local apparent_temperature = wttr_json.current.apparent_temperature

            local label = string.format("%.0f", apparent_temperature) .. "°C"
            local weather_icon = map_code_to_icon(weather_code)
            local weather_description = map_code_weather_desc(weather_code)

            weather:set({
                icon = {
                    string = weather_icon
                },
                label = label
            })

            weather_desc:set({
                label = string.format("Weather: %s", weather_description)
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

