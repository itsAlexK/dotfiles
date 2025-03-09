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
    if code == 0 then -- WMO Code 00
        return "Cloud development not observed or not observable"
    elseif code == 1 then -- WMO Code 01
        return "Clouds generally dissolving or becoming less developed"
    elseif code == 2 then -- WMO Code 02
        return "State of sky on the whole unchanged"
    elseif code == 3 then -- WMO Code 03
        return "Clouds generally forming or developing"
    elseif code == 4 then -- WMO Code 04
        return "Visibility reduced by smoke (e.g., volcanic ash, industrial smoke)"
    elseif code == 5 then -- WMO Code 05
        return "Haze"
    elseif code == 6 then -- WMO Code 06
        return "Widespread dust in suspension"
    elseif code == 7 then -- WMO Code 07
        return "Dust/sand raised by wind at station"
    elseif code == 8 then -- WMO Code 08
        return "Well-developed dust/sand whirl(s)"
    elseif code == 9 then -- WMO Code 09
        return "Duststorm/sandstorm within sight"
    elseif code == 10 then -- WMO Code 10
        return "Mist"
    elseif code == 11 then -- WMO Code 11
        return "Patches of shallow fog"
    elseif code == 12 then -- WMO Code 12
        return "Continuous shallow fog"
    elseif code == 13 then -- WMO Code 13
        return "Lightning visible, no thunder"
    elseif code == 14 then -- WMO Code 14
        return "Precipitation not reaching ground"
    elseif code == 15 then -- WMO Code 15
        return "Distant precipitation reaching ground"
    elseif code == 16 then -- WMO Code 16
        return "Nearby precipitation not at station"
    elseif code == 17 then -- WMO Code 17
        return "Thunderstorm without precipitation"
    elseif code == 18 then -- WMO Code 18
        return "Squalls at or within sight"
    elseif code == 19 then -- WMO Code 19
        return "Funnel cloud(s) observed"
        -- Precipitation types (20-29)
    elseif code == 20 then -- WMO Code 20
        return "Drizzle not falling as showers"
    elseif code == 21 then -- WMO Code 21
        return "Rain not falling as showers"
    elseif code == 22 then -- WMO Code 22
        return "Snow not falling as showers"
    elseif code == 23 then -- WMO Code 23
        return "Rain and snow mixed"
    elseif code == 24 then -- WMO Code 24
        return "Freezing drizzle/rain"
    elseif code == 25 then -- WMO Code 25
        return "Rain showers"
    elseif code == 26 then -- WMO Code 26
        return "Snow/rain-snow showers"
    elseif code == 27 then -- WMO Code 27
        return "Hail showers"
    elseif code == 28 then -- WMO Code 28
        return "Fog/ice fog"
    elseif code == 29 then -- WMO Code 29
        return "Thunderstorm (with precipitation)"
        -- Dust/sand storms (30-39)
    elseif code == 30 then -- WMO Code 30
        return "Slight/moderate duststorm decreasing"
    elseif code == 31 then -- WMO Code 31
        return "Slight/moderate duststorm no change"
    elseif code == 32 then -- WMO Code 32
        return "Slight/moderate duststorm increasing"
    elseif code == 33 then -- WMO Code 33
        return "Severe duststorm decreasing"
    elseif code == 34 then -- WMO Code 34
        return "Severe duststorm no change"
    elseif code == 35 then -- WMO Code 35
        return "Severe duststorm increasing"
    elseif code == 36 then -- WMO Code 36
        return "Slight/moderate drifting snow"
    elseif code == 37 then -- WMO Code 37
        return "Heavy drifting snow"
    elseif code == 38 then -- WMO Code 38
        return "Slight/moderate blowing snow"
    elseif code == 39 then -- WMO Code 39
        return "Heavy blowing snow"
        -- Fog (40-49)
    elseif code == 40 then -- WMO Code 40
        return "Distant fog above observer level"
    elseif code == 41 then -- WMO Code 41
        return "Fog in patches"
    elseif code == 42 then -- WMO Code 42
        return "Thinning fog, sky visible"
    elseif code == 43 then -- WMO Code 43
        return "Thinning fog, sky invisible"
    elseif code == 44 then -- WMO Code 44
        return "Unchanged fog, sky visible"
    elseif code == 45 then -- WMO Code 45
        return "Unchanged fog, sky invisible"
    elseif code == 46 then -- WMO Code 46
        return "Thickening fog, sky visible"
    elseif code == 47 then -- WMO Code 47
        return "Thickening fog, sky invisible"
    elseif code == 48 then -- WMO Code 48
        return "Fog depositing rime, sky visible"
    elseif code == 49 then -- WMO Code 49
        return "Fog depositing rime, sky invisible"
    elseif code == 50 then
        return "Slight intermittent drizzle"
    elseif code == 51 then
        return "Slight continuous drizzle"
    elseif code == 52 then
        return "Moderate intermittent drizzle"
    elseif code == 53 then
        return "Moderate continuous drizzle"
    elseif code == 54 then
        return "Heavy intermittent drizzle"
    elseif code == 55 then
        return "Heavy continuous drizzle"
    elseif code == 56 then
        return "Slight freezing drizzle"
    elseif code == 57 then
        return "Heavy freezing drizzle"
    elseif code == 58 then
        return "Slight drizzle and rain"
    elseif code == 59 then
        return "Heavy drizzle and rain"
    elseif code == 60 then
        return "Slight intermittent rain"
    elseif code == 61 then
        return "Slight continuous rain"
    elseif code == 62 then
        return "Moderate intermittent rain"
    elseif code == 63 then
        return "Moderate continuous rain"
    elseif code == 64 then
        return "Heavy intermittent rain"
    elseif code == 65 then
        return "Heavy continuous rain"
    elseif code == 66 then
        return "Slight freezing rain"
    elseif code == 67 then
        return "Heavy freezing rain"
    elseif code == 68 then
        return "Slight rain/snow mix"
    elseif code == 69 then
        return "Heavy rain/snow mix"
    elseif code == 70 then
        return "Slight intermittent snow"
    elseif code == 71 then
        return "Slight continuous snow"
    elseif code == 72 then
        return "Moderate intermittent snow"
    elseif code == 73 then
        return "Moderate continuous snow"
    elseif code == 74 then
        return "Heavy intermittent snow"
    elseif code == 75 then
        return "Heavy continuous snow"
    elseif code == 76 then
        return "Diamond dust"
    elseif code == 77 then
        return "Snow grains"
    elseif code == 78 then
        return "Isolated snow crystals"
    elseif code == 79 then
        return "Ice pellets"
    elseif code == 80 then
        return "Slight rain showers"
    elseif code == 81 then
        return "Moderate/heavy rain showers"
    elseif code == 82 then
        return "Violent rain showers"
    elseif code == 83 then
        return "Slight rain/snow showers"
    elseif code == 84 then
        return "Moderate/heavy rain/snow showers"
    elseif code == 85 then
        return "Slight snow showers"
    elseif code == 86 then
        return "Moderate/heavy snow showers"
    elseif code == 87 then
        return "Slight snow pellet showers"
    elseif code == 88 then
        return "Moderate/heavy snow pellet showers"
    elseif code == 89 then
        return "Slight hail showers"
    elseif code == 90 then
        return "Moderate/heavy hail showers"
    elseif code == 91 then
        return "Slight rain with thunder"
    elseif code == 92 then
        return "Heavy rain with thunder"
    elseif code == 93 then
        return "Slight snow with thunder"
    elseif code == 94 then
        return "Heavy snow with thunder"
    elseif code == 95 then
        return "Slight/moderate thunderstorm"
    elseif code == 96 then
        return "Thunderstorm with slight hail"
    elseif code == 97 then
        return "Heavy thunderstorm"
    elseif code == 98 then
        return "Thunderstorm with duststorm"
    elseif code == 99 then
        return "Thunderstorm with heavy hail"
    else
        return "Unknown WMO weather code"
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

