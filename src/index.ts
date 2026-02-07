import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const POKEAPI_BASE = "https://pokeapi.co/api/v2/";
const USER_AGENT = "pokemon-app/1.0";

// Create server instance
const server = new McpServer({
  name: "pokemon-mcp-server",
  version: "1.0.0",
});

// Helper function for making Pokemon API requests
async function makePokemonRequest<T>(url: string): Promise<T | null> {
  const headers = {
    "User-Agent": USER_AGENT,
    Accept: "application/json",
  };

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error("Error making Pokemon request:", error);
    return null;
  }
}

interface Pokemon {
  name: string;
  id: number;
  height: number;
  weight: number;
  types: Array<{
    type: {
      name: string;
    };
  }>;
  stats: Array<{
    stat: {
      name: string;
    };
    base_stat: number;
  }>;
  abilities: Array<{
    ability: {
      name: string;
    };
  }>;
  sprites: {
    front_default: string | null;
  };
}

// Format Pokémon data
function formatPokemon(pokemon: Pokemon): string {
  const types = pokemon.types.map((t) => t.type.name).join(", ");
  const abilities = pokemon.abilities.map((a) => a.ability.name).join(", ");
  const stats = pokemon.stats
    .map((s) => `${s.stat.name}: ${s.base_stat}`)
    .join(", ");

  return [
    `Name: ${pokemon.name}`,
    `ID: ${pokemon.id}`,
    `Height: ${(pokemon.height / 10).toFixed(1)}m`,
    `Weight: ${(pokemon.weight / 10).toFixed(1)}kg`,
    `Types: ${types}`,
    `Abilities: ${abilities}`,
    `Stats: ${stats}`,
    `Image: ${pokemon.sprites.front_default || "No image"}`,
    "---",
  ].join("\n");
}

server.registerTool(
  "get_pokemon_info",
  {
    description: "Get detailed information about a Pokémon by name.",
    inputSchema: { pokemon: z.string() },
  },
  async ({ pokemon }) => {
    const url = `${POKEAPI_BASE}pokemon/${encodeURIComponent(pokemon.toLowerCase())}`;
    const data = await makePokemonRequest<Pokemon>(url);
    if (!data) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve Pokémon data",
          },
        ],
      };
    }
    return {
      content: [
        {
          type: "text",
          text: formatPokemon(data),
        },
      ],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Pokemon MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
