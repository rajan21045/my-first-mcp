# my-first-mcp

A simple MCP server with one tool, `add_numbers`, that adds two numbers.

## Usage

Add this to your MCP client config (for example Claude Desktop):

```json
{
  "mcpServers": {
    "my-first": {
      "command": "npx",
      "args": ["-y", "@rajan21045/my-first-mcp"]
    }
  }
}
```

## Tools

- `add_numbers`: adds two numbers (`a`, `b`)
- `get_weather`: gets the current weather for a city (`city`), using the free Open-Meteo API