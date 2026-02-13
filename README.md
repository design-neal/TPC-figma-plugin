# Figma MCP Server

Claude와 Figma를 연동하는 MCP(Model Context Protocol) 서버입니다.

## 기능

- **get_file**: Figma 파일 정보 조회
- **get_node**: 특정 노드 상세 정보 조회
- **get_styles**: 파일 스타일 조회
- **export_image**: 노드를 이미지로 내보내기 (PNG, SVG, JPG, PDF)
- **get_comments**: 파일 코멘트 조회

## 설치

```bash
npm install
npm run build
```

## Figma Access Token 발급

1. [Figma](https://www.figma.com)에 로그인
2. 설정(Settings) > Personal access tokens
3. "Generate new token" 클릭
4. 토큰 이름 입력 후 생성
5. 생성된 토큰 복사 (한 번만 표시됨)

## Claude Desktop 설정

`~/Library/Application Support/Claude/claude_desktop_config.json` 파일에 추가:

```json
{
  "mcpServers": {
    "figma": {
      "command": "node",
      "args": ["/Users/tpc/Desktop/figma mcp/dist/index.js"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "여기에_토큰_입력"
      }
    }
  }
}
```

또는 tsx로 직접 실행:

```json
{
  "mcpServers": {
    "figma": {
      "command": "npx",
      "args": ["tsx", "/Users/tpc/Desktop/figma mcp/src/index.ts"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "여기에_토큰_입력"
      }
    }
  }
}
```

## 사용 예시

Claude에서 다음과 같이 사용할 수 있습니다:

- "figma.com/file/ABC123/MyDesign 파일 정보 보여줘"
- "이 Figma 파일의 스타일 목록 알려줘"
- "노드 123:456을 PNG로 내보내줘"
- "이 파일에 달린 코멘트들 보여줘"

## 개발

```bash
# 개발 모드 실행
FIGMA_ACCESS_TOKEN=xxx npm run dev

# 빌드
npm run build

# 프로덕션 실행
FIGMA_ACCESS_TOKEN=xxx npm start
```

---

# Figma Plugin: Claude Design Assistant

자연어 명령으로 Figma 디자인을 수정할 수 있는 플러그인입니다.

## 플러그인 설치 방법

1. Figma 데스크톱 앱 실행
2. 아무 파일이나 열기
3. 메뉴: **Plugins > Development > Import plugin from manifest...**
4. `/Users/tpc/Desktop/figma mcp/plugin/manifest.json` 선택
5. 플러그인 설치 완료

## 플러그인 실행

1. Figma에서 **Plugins > Development > Claude Design Assistant** 클릭
2. 수정할 레이어 선택
3. 명령어 입력 후 "실행" 클릭

## 지원하는 명령어

| 명령어 예시 | 기능 |
|------------|------|
| 텍스트를 '새 텍스트'로 변경해줘 | 텍스트 내용 변경 |
| 배경색을 #FF5733으로 변경해줘 | 색상 변경 |
| 너비를 200으로 변경해줘 | 너비 변경 |
| 높이를 100으로 변경해줘 | 높이 변경 |
| 투명도를 50%로 변경해줘 | 투명도 조절 |
| 이 레이어를 복제해줘 | 레이어 복제 |
| 폰트 크기를 24로 변경해줘 | 폰트 크기 변경 |
| 모서리를 10으로 변경해줘 | 모서리 둥글기 |
| 이름을 '버튼'으로 변경해줘 | 레이어 이름 변경 |
| 숨겨줘 / 보여줘 | 레이어 표시/숨김 |
| 삭제해줘 | 레이어 삭제 |

## 라이선스

MIT
