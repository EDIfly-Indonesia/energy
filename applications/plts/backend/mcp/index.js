import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// InfluxDB and PostgreSQL imports
import { InfluxDB } from "@influxdata/influxdb-client";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// InfluxDB Setup (Credentials from docs/MEMORY.json)
const influxdb = new InfluxDB({ 
  url: process.env.INFLUXDB_URL || "http://energy-influxdb:8086", 
  token: process.env.INFLUX_TOKEN 
});
const queryApi = influxdb.getQueryApi(process.env.INFLUXDB_ORG || "energy_platform");

// Server setup remains the same...
const server = new Server(
  {
    name: "plts-energy-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tools registry...
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_site_status",
        description: "Get status of a specific PLTS site",
        inputSchema: {
          type: "object",
          properties: { siteId: { type: "string" } },
          required: ["siteId"],
        },
      },
      {
        name: "get_critical_alarms",
        description: "Get recent critical alarms for a site",
        inputSchema: {
          type: "object",
          properties: { siteId: { type: "string" } },
        },
      },
      {
        name: "get_realtime_power",
        description: "Get real-time power (power_active) from InfluxDB",
        inputSchema: {
          type: "object",
          properties: { siteId: { type: "string" } },
          required: ["siteId"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "get_site_status": {
      const { siteId } = request.params.arguments;
      const site = await prisma.tbl_sites.findUnique({ where: { id: siteId } });
      return {
        content: [{ type: "text", text: JSON.stringify(site, null, 2) }],
      };
    }
    case "get_critical_alarms": {
      const { siteId } = request.params.arguments;
      const alarms = await prisma.tbl_alarms.findMany({
        where: { severity: "CRITICAL", resolved_at: null, site_id: siteId },
        orderBy: { created_at: "desc" },
        take: 10,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(alarms, null, 2) }],
      };
    }
    case "get_realtime_power": {
      const { siteId } = request.params.arguments;
      const query = `from(bucket: "telemetry")
        |> range(start: -15m)
        |> filter(fn: (r) => r["_measurement"] == "telemetry" and r["site_id"] == "${siteId}" and r["_field"] == "power_active")
        |> last()`;
      const rows = await queryApi.collectRows(query);
      return {
        content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      };
    }
    default:
      throw new Error("Tool not found");
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("PLTS MCP Server running on stdio");
