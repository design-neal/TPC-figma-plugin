/**
 * Figma REST API 클라이언트
 */
export declare class FigmaClient {
    private accessToken;
    constructor(accessToken: string);
    private request;
    /**
     * 파일 정보 조회
     */
    getFile(fileKey: string, options?: {
        depth?: number;
    }): Promise<FigmaFile>;
    /**
     * 특정 노드 정보 조회
     */
    getNodes(fileKey: string, nodeIds: string[]): Promise<FigmaNodes>;
    /**
     * 파일 스타일 조회
     */
    getStyles(fileKey: string): Promise<FigmaStyles>;
    /**
     * 이미지 내보내기
     */
    exportImages(fileKey: string, nodeIds: string[], options?: {
        format?: "jpg" | "png" | "svg" | "pdf";
        scale?: number;
    }): Promise<FigmaImages>;
    /**
     * 코멘트 조회
     */
    getComments(fileKey: string): Promise<FigmaComments>;
}
export interface FigmaFile {
    name: string;
    lastModified: string;
    thumbnailUrl: string;
    version: string;
    document: FigmaNode;
    components: Record<string, FigmaComponent>;
    styles: Record<string, FigmaStyleMeta>;
}
export interface FigmaNode {
    id: string;
    name: string;
    type: string;
    children?: FigmaNode[];
    [key: string]: unknown;
}
export interface FigmaNodes {
    nodes: Record<string, {
        document: FigmaNode;
    }>;
}
export interface FigmaComponent {
    key: string;
    name: string;
    description: string;
}
export interface FigmaStyleMeta {
    key: string;
    name: string;
    styleType: string;
    description: string;
}
export interface FigmaStyles {
    meta: {
        styles: FigmaStyleMeta[];
    };
}
export interface FigmaImages {
    images: Record<string, string>;
}
export interface FigmaComments {
    comments: FigmaComment[];
}
export interface FigmaComment {
    id: string;
    message: string;
    created_at: string;
    user: {
        handle: string;
        img_url: string;
    };
    order_id: string;
}
