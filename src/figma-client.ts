/**
 * Figma REST API 클라이언트
 */

const FIGMA_API_BASE = "https://api.figma.com/v1";

export class FigmaClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${FIGMA_API_BASE}${endpoint}`, {
      headers: {
        "X-Figma-Token": this.accessToken,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Figma API error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * 파일 정보 조회
   */
  async getFile(fileKey: string, options?: { depth?: number }) {
    let endpoint = `/files/${fileKey}`;
    if (options?.depth) {
      endpoint += `?depth=${options.depth}`;
    }
    return this.request<FigmaFile>(endpoint);
  }

  /**
   * 특정 노드 정보 조회
   */
  async getNodes(fileKey: string, nodeIds: string[]) {
    const ids = nodeIds.join(",");
    return this.request<FigmaNodes>(`/files/${fileKey}/nodes?ids=${ids}`);
  }

  /**
   * 파일 스타일 조회
   */
  async getStyles(fileKey: string) {
    return this.request<FigmaStyles>(`/files/${fileKey}/styles`);
  }

  /**
   * 이미지 내보내기
   */
  async exportImages(
    fileKey: string,
    nodeIds: string[],
    options?: {
      format?: "jpg" | "png" | "svg" | "pdf";
      scale?: number;
    }
  ) {
    const ids = nodeIds.join(",");
    const format = options?.format || "png";
    const scale = options?.scale || 1;
    return this.request<FigmaImages>(
      `/images/${fileKey}?ids=${ids}&format=${format}&scale=${scale}`
    );
  }

  /**
   * 코멘트 조회
   */
  async getComments(fileKey: string) {
    return this.request<FigmaComments>(`/files/${fileKey}/comments`);
  }
}

// Figma API 타입 정의
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
  nodes: Record<string, { document: FigmaNode }>;
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
