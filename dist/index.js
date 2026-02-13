#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { FigmaClient } from "./figma-client.js";
// 환경변수에서 Figma 토큰 가져오기
const FIGMA_ACCESS_TOKEN = process.env.FIGMA_ACCESS_TOKEN;
if (!FIGMA_ACCESS_TOKEN) {
    console.error("Error: FIGMA_ACCESS_TOKEN environment variable is required");
    process.exit(1);
}
const figmaClient = new FigmaClient(FIGMA_ACCESS_TOKEN);
// MCP 서버 생성
const server = new Server({
    name: "figma-mcp",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
// 도구 목록 정의
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "get_file",
                description: "Figma 파일의 정보를 조회합니다. 파일 구조, 컴포넌트, 스타일 등의 메타데이터를 반환합니다.",
                inputSchema: {
                    type: "object",
                    properties: {
                        fileKey: {
                            type: "string",
                            description: "Figma 파일 키 (URL에서 /file/ 뒤의 부분, 예: figma.com/file/ABC123/... 에서 ABC123)",
                        },
                        depth: {
                            type: "number",
                            description: "노드 트리 깊이 제한 (선택사항, 기본값: 전체)",
                        },
                    },
                    required: ["fileKey"],
                },
            },
            {
                name: "get_node",
                description: "Figma 파일 내 특정 노드의 상세 정보를 조회합니다.",
                inputSchema: {
                    type: "object",
                    properties: {
                        fileKey: {
                            type: "string",
                            description: "Figma 파일 키",
                        },
                        nodeId: {
                            type: "string",
                            description: "노드 ID (URL의 node-id 파라미터, 예: 123:456 또는 123-456)",
                        },
                    },
                    required: ["fileKey", "nodeId"],
                },
            },
            {
                name: "get_styles",
                description: "Figma 파일에 정의된 스타일(색상, 텍스트, 효과 등)을 조회합니다.",
                inputSchema: {
                    type: "object",
                    properties: {
                        fileKey: {
                            type: "string",
                            description: "Figma 파일 키",
                        },
                    },
                    required: ["fileKey"],
                },
            },
            {
                name: "export_image",
                description: "Figma 노드를 이미지로 내보내기합니다. PNG, SVG, JPG, PDF 형식을 지원합니다.",
                inputSchema: {
                    type: "object",
                    properties: {
                        fileKey: {
                            type: "string",
                            description: "Figma 파일 키",
                        },
                        nodeId: {
                            type: "string",
                            description: "내보낼 노드 ID",
                        },
                        format: {
                            type: "string",
                            enum: ["png", "svg", "jpg", "pdf"],
                            description: "이미지 형식 (기본값: png)",
                        },
                        scale: {
                            type: "number",
                            description: "배율 (0.01~4, 기본값: 1)",
                        },
                    },
                    required: ["fileKey", "nodeId"],
                },
            },
            {
                name: "get_comments",
                description: "Figma 파일에 달린 코멘트들을 조회합니다.",
                inputSchema: {
                    type: "object",
                    properties: {
                        fileKey: {
                            type: "string",
                            description: "Figma 파일 키",
                        },
                    },
                    required: ["fileKey"],
                },
            },
        ],
    };
});
// 도구 실행 핸들러
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            case "get_file": {
                const { fileKey, depth } = args;
                const file = await figmaClient.getFile(fileKey, { depth });
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(file, null, 2),
                        },
                    ],
                };
            }
            case "get_node": {
                const { fileKey, nodeId } = args;
                // URL 형식의 node-id를 API 형식으로 변환 (123-456 -> 123:456)
                const normalizedNodeId = nodeId.replace("-", ":");
                const nodes = await figmaClient.getNodes(fileKey, [normalizedNodeId]);
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(nodes, null, 2),
                        },
                    ],
                };
            }
            case "get_styles": {
                const { fileKey } = args;
                const styles = await figmaClient.getStyles(fileKey);
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(styles, null, 2),
                        },
                    ],
                };
            }
            case "export_image": {
                const { fileKey, nodeId, format, scale } = args;
                const normalizedNodeId = nodeId.replace("-", ":");
                const images = await figmaClient.exportImages(fileKey, [normalizedNodeId], {
                    format,
                    scale,
                });
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(images, null, 2),
                        },
                    ],
                };
            }
            case "get_comments": {
                const { fileKey } = args;
                const comments = await figmaClient.getComments(fileKey);
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(comments, null, 2),
                        },
                    ],
                };
            }
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            content: [
                {
                    type: "text",
                    text: `Error: ${errorMessage}`,
                },
            ],
            isError: true,
        };
    }
});
// 서버 시작
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Figma MCP server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
