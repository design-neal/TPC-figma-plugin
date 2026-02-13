# Likey Assistant - Figma Plugin

Likey 팀을 위한 Figma 디자인 워크플로우 플러그인입니다.

## 기능

### 1. Data Fill
- Google Sheets 연동으로 더미 데이터 자동 채우기
- 크리에이터/팬 카테고리별 데이터 관리
- 레이어 이름 기반 자동 매칭

### 2. Text Editor
- 선택한 레이어의 텍스트 직접 변경
- 찾아서 변경 기능 (기존텍스트>새텍스트)
- 네이버 맞춤법 검사 연동

### 3. Rename
- 선택 레이어 일괄 이름 변경
- 자동 네이밍 (Content, Section, Item, Image, Text)

### 4. Compare
- 노션 기획 내용과 Figma 디자인 텍스트 비교
- 일치/불일치/누락 항목 표시
- 클릭 시 해당 레이어로 이동

### 5. Checker
- 디자인 시스템 컴포넌트 적용 여부 확인
- 베리어블(변수) 적용 여부 확인
- 텍스트 스타일 적용 여부 확인

---

## 설치 방법

### 1. 플러그인 파일 다운로드

**방법 A: ZIP 다운로드**
1. 이 저장소 페이지에서 녹색 `Code` 버튼 클릭
2. `Download ZIP` 선택
3. 다운로드된 ZIP 파일 압축 해제

**방법 B: Git Clone**
```bash
git clone https://github.com/design-neal/TPC-figma-plugin.git
```

### 2. Figma에서 플러그인 설치

1. Figma Desktop 앱 실행
2. 상단 메뉴에서 `Plugins` > `Development` > `Import plugin from manifest...` 클릭
3. 다운로드한 폴더에서 `manifest.json` 파일 선택
4. 플러그인이 `Development` 메뉴에 추가됨

### 3. 플러그인 실행

- `Plugins` > `Development` > `Likey Assistant` 클릭
- 또는 `Cmd/Ctrl + /` 눌러서 "Likey Assistant" 검색

---

## 파일 구조

```
plugin/
├── manifest.json    # 플러그인 설정 파일
├── code.js          # 플러그인 백엔드 로직
├── ui.html          # 플러그인 UI
└── README.md        # 이 문서
```

---

## 업데이트 방법

```bash
cd TPC-figma-plugin
git pull origin main
```

Figma를 재시작하면 변경사항이 자동으로 적용됩니다.

---

## 문의

문제가 있거나 기능 요청이 있으면 Issues에 등록해주세요.
