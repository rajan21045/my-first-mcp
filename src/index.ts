#!/usr/bin/env node
// Tells the OS to run this file with Node (npx needs it)

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "my-first-mcp",
  version: "1.1.0",
});

// ---------- Tool 1: add_numbers (unchanged) ----------
server.registerTool(
  "add_numbers",
  {
    description: "Adds two numbers together",
    inputSchema: {
      a: z.number().describe("First number"),
      b: z.number().describe("Second number"),
    },
  },
  async ({ a, b }) => {
    return {
      content: [{ type: "text", text: `The sum is ${a + b}` }],
    };
  }
);

// ---------- Helper: turn Open-Meteo's weather code into words ----------
function describeWeather(code: number): string {
  if (code === 0) return "Clear sky";
  if (code <= 3) return "Partly cloudy";
  if (code === 45 || code === 48) return "Foggy";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain showers";
  if (code >= 95) return "Thunderstorm";
  return "Unknown conditions";
}

// ---------- Tool 2: get_weather (new) ----------
server.registerTool(
  "get_weather",
  {
    description: "Gets the current weather for a city",
    inputSchema: {
      city: z.string().describe("City name, for example Pokhara"),
    },
  },
  async ({ city }) => {
    try {
      // Step A: turn the city name into coordinates
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
      );
      if (!geoRes.ok) throw new Error(`Geocoding failed (${geoRes.status})`);

      const geo = (await geoRes.json()) as {
        results?: {
          name: string;
          country: string;
          latitude: number;
          longitude: number;
        }[];
      };
      const place = geo.results?.[0];

      // If no city matched, tell the AI clearly (isError marks it as a failure)
      if (!place) {
        return {
          content: [{ type: "text", text: `Could not find a city named "${city}".` }],
          isError: true,
        };
      }

      // Step B: ask for the current weather at those coordinates
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`
      );
      if (!weatherRes.ok) throw new Error(`Weather lookup failed (${weatherRes.status})`);

      const weather = (await weatherRes.json()) as {
        current: {
          temperature_2m: number;
          relative_humidity_2m: number;
          wind_speed_10m: number;
          weather_code: number;
        };
      };
      const c = weather.current;

      // Step C: build a readable answer
      const text =
        `Weather in ${place.name}, ${place.country}: ${describeWeather(c.weather_code)}. ` +
        `Temperature ${c.temperature_2m}°C, humidity ${c.relative_humidity_2m}%, ` +
        `wind ${c.wind_speed_10m} km/h.`;

      return { content: [{ type: "text", text }] };
    } catch (error) {
      // Network problems or API errors end up here
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Weather lookup failed: ${message}` }],
        isError: true,
      };
    }
  }
);

// ---------- Start the server ----------
const transport = new StdioServerTransport();
await server.connect(transport);

// Never use console.log here. Use console.error for logs.
console.error("my-first-mcp running on stdio");