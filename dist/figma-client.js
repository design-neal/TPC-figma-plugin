/**
 * Figma REST API 클라이언트
 */
const FIGMA_API_BASE = "https://api.figma.com/v1";
export class FigmaClient {
    accessToken;
    constructor(accessToken) {
        this.accessToken = accessToken;
    }
    async request(endpoint) {
        const response = await fetch(`${FIGMA_API_BASE}${endpoint}`, {
            headers: {
                "X-Figma-Token": this.accessToken,
            },
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Figma API error: ${response.status} - ${error}`);
        }
        return response.json();
    }
    /**
     * 파일 정보 조회
     */
    async getFile(fileKey, options) {
        let endpoint = `/files/${fileKey}`;
        if (options?.depth) {
            endpoint += `?depth=${options.depth}`;
        }
        return this.request(endpoint);
    }
    /**
     * 특정 노드 정보 조회
     */
    async getNodes(fileKey, nodeIds) {
        const ids = nodeIds.join(",");
        return this.request(`/files/${fileKey}/nodes?ids=${ids}`);
    }
    /**
     * 파일 스타일 조회
     */
    async getStyles(fileKey) {
        return this.request(`/files/${fileKey}/styles`);
    }
    /**
     * 이미지 내보내기
     */
    async exportImages(fileKey, nodeIds, options) {
        const ids = nodeIds.join(",");
        const format = options?.format || "png";
        const scale = options?.scale || 1;
        return this.request(`/images/${fileKey}?ids=${ids}&format=${format}&scale=${scale}`);
    }
    /**
     * 코멘트 조회
     */
    async getComments(fileKey) {
        return this.request(`/files/${fileKey}/comments`);
    }
}
