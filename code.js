// Claude Design Assistant - Figma Plugin

figma.showUI(__html__, { width: 400, height: 642, themeColors: true });

// 선택 변경 감지
figma.on('selectionchange', () => {
  updateSelectionInfo();
});

// 초기 선택 정보 전송
updateSelectionInfo();

function updateSelectionInfo() {
  const selection = figma.currentPage.selection;
  figma.ui.postMessage({
    type: 'selection-update',
    count: selection.length,
    names: selection.map(node => node.name).slice(0, 3)
  });
}

// UI에서 메시지 수신
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'execute-command') {
    await executeCommand(msg.command);
  }

  if (msg.type === 'get-selection-info') {
    getSelectionInfo();
  }

  if (msg.type === 'spell-check') {
    await spellCheck();
  }

  if (msg.type === 'spell-check-response') {
    // UI에서 받은 맞춤법 검사 결과 처리
    figma.ui.postMessage({
      type: 'spell-results',
      errors: msg.errors
    });
  }

  // 레이어 네이밍 기능
  if (msg.type === 'load-layers') {
    loadSelectedLayers();
  }

  if (msg.type === 'rename-layers') {
    renameLayers(msg.changes);
  }

  // 선택된 레이어 이름 변경 (Selected Change)
  if (msg.type === 'rename-selected') {
    renameSelectedLayers(msg.namingType);
  }

  // 자동 네이밍 (Auto Rename)
  if (msg.type === 'auto-rename') {
    autoRenameAllLayers();
  }

  // UI 리사이즈
  if (msg.type === 'resize') {
    figma.ui.resize(msg.width, msg.height);
  }

  // 더미 데이터 적용
  if (msg.type === 'apply-dummy-data') {
    applyDummyData(msg.value);
  }

  // 랜덤 채우기
  if (msg.type === 'random-fill') {
    randomFillData(msg.category, msg.data);
  }

  // 이미지 채우기
  if (msg.type === 'apply-image-fill') {
    applyImageFill(msg.imageType);
  }
};

// 선택된 레이어 정보 가져오기
function getSelectionInfo() {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.ui.postMessage({
      type: 'selection-info',
      info: '선택된 레이어가 없습니다.'
    });
    return;
  }

  const infos = selection.map(node => {
    let info = `[${node.type}] ${node.name}\n`;
    info += `  - ID: ${node.id}\n`;
    info += `  - 위치: (${Math.round(node.x)}, ${Math.round(node.y)})\n`;
    info += `  - 크기: ${Math.round(node.width)} x ${Math.round(node.height)}\n`;

    if (node.type === 'TEXT') {
      info += `  - 텍스트: "${node.characters}"\n`;
      info += `  - 폰트 크기: ${node.fontSize}\n`;
    }

    if ('fills' in node && Array.isArray(node.fills) && node.fills.length > 0) {
      const fill = node.fills[0];
      if (fill.type === 'SOLID') {
        const color = fill.color;
        const hex = rgbToHex(color.r, color.g, color.b);
        info += `  - 배경색: ${hex}\n`;
      }
    }

    if ('opacity' in node) {
      info += `  - 투명도: ${Math.round(node.opacity * 100)}%\n`;
    }

    return info;
  });

  figma.ui.postMessage({
    type: 'selection-info',
    info: infos.join('\n')
  });
}

// 명령어 실행
async function executeCommand(command) {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.ui.postMessage({
      type: 'status',
      status: 'error',
      message: '먼저 레이어를 선택해주세요.'
    });
    return;
  }

  try {
    // 명령어 파싱 및 실행
    const result = await parseAndExecute(command, selection);

    figma.ui.postMessage({
      type: 'status',
      status: 'success',
      message: result
    });
  } catch (error) {
    figma.ui.postMessage({
      type: 'status',
      status: 'error',
      message: `오류: ${error.message}`
    });
  }
}

// 명령어 파싱 및 실행
async function parseAndExecute(command, selection) {
  const cmd = command.toLowerCase();

  // 텍스트 찾아서 변경: "기존텍스트>새텍스트" 형식
  // 예: "팔로워(전체)>전체 메시지"
  if (command.includes('>') && !command.startsWith('>')) {
    const parts = command.split('>');
    if (parts.length === 2) {
      const searchText = parts[0].trim();
      const newText = parts[1].trim();

      let changed = 0;

      for (const node of selection) {
        // 선택된 노드 내의 모든 텍스트에서 검색 (컴포넌트, 인스턴스, 오토레이아웃 포함)
        const textNodes = findTextNodeByContent(node, searchText);

        for (const textNode of textNodes) {
          const success = await replaceTextInNode(textNode, searchText, newText);
          if (success) changed++;
        }
      }

      if (changed === 0) {
        throw new Error(`"${searchText}" 텍스트를 찾을 수 없습니다.`);
      }

      return `"${searchText}"를 "${newText}"로 ${changed}개 변경했습니다.`;
    }
  }

  // 프레임 내 모든 텍스트 변경: ">새텍스트" 형식
  if (command.startsWith('>')) {
    const newText = command.slice(1).trim();
    let changed = 0;

    for (const node of selection) {
      // 프레임/그룹/컴포넌트/인스턴스 내부 텍스트 모두 찾기
      const textNodes = findAllTextNodes(node);

      for (const textNode of textNodes) {
        const success = await changeTextInNode(textNode, newText);
        if (success) changed++;
      }
    }

    if (changed === 0) {
      throw new Error('선택된 영역에 텍스트가 없습니다.');
    }

    return `${changed}개의 텍스트를 "${newText}"로 변경했습니다.`;
  }

  // 텍스트 변경 - 기존 방식도 지원
  const textMatch = command.match(/['"'"](.+?)['"'"]/);
  if ((cmd.includes('텍스트') && cmd.includes('변경')) || cmd.includes('text')) {
    let newText;

    if (textMatch) {
      newText = textMatch[1];
    } else {
      throw new Error("변경할 텍스트를 입력해주세요.\n예: 팔로워(전체)>전체 메시지");
    }

    let changed = 0;

    for (const node of selection) {
      const textNodes = findAllTextNodes(node);

      for (const textNode of textNodes) {
        const success = await changeTextInNode(textNode, newText);
        if (success) changed++;
      }
    }

    if (changed === 0) {
      throw new Error('선택된 영역에 텍스트가 없습니다.');
    }

    return `${changed}개의 텍스트를 "${newText}"로 변경했습니다.`;
  }

  // 색상 변경
  const colorMatch = command.match(/#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})/);
  if ((cmd.includes('색') && cmd.includes('변경')) || cmd.includes('color')) {
    if (!colorMatch) {
      throw new Error('색상을 HEX 코드로 입력해주세요. 예: #FF5733');
    }

    const hex = colorMatch[0];
    const rgb = hexToRgb(hex);
    let changed = 0;

    for (const node of selection) {
      if ('fills' in node) {
        const fills = JSON.parse(JSON.stringify(node.fills));
        if (fills.length > 0 && fills[0].type === 'SOLID') {
          fills[0].color = rgb;
          node.fills = fills;
          changed++;
        } else {
          node.fills = [{ type: 'SOLID', color: rgb }];
          changed++;
        }
      }
    }

    if (changed === 0) {
      throw new Error('색상을 변경할 수 없는 레이어입니다.');
    }

    return `${changed}개의 레이어 색상을 ${hex}로 변경했습니다.`;
  }

  // 크기 변경 (너비)
  const widthMatch = cmd.match(/너비[를을]?\s*(\d+)/);
  if (widthMatch) {
    const newWidth = parseInt(widthMatch[1]);

    for (const node of selection) {
      if ('resize' in node) {
        node.resize(newWidth, node.height);
      }
    }

    return `너비를 ${newWidth}px로 변경했습니다.`;
  }

  // 크기 변경 (높이)
  const heightMatch = cmd.match(/높이[를을]?\s*(\d+)/);
  if (heightMatch) {
    const newHeight = parseInt(heightMatch[1]);

    for (const node of selection) {
      if ('resize' in node) {
        node.resize(node.width, newHeight);
      }
    }

    return `높이를 ${newHeight}px로 변경했습니다.`;
  }

  // 투명도 변경
  const opacityMatch = cmd.match(/(\d+)\s*%/);
  if (cmd.includes('투명도') && opacityMatch) {
    const opacity = parseInt(opacityMatch[1]) / 100;

    for (const node of selection) {
      if ('opacity' in node) {
        node.opacity = Math.max(0, Math.min(1, opacity));
      }
    }

    return `투명도를 ${opacityMatch[1]}%로 변경했습니다.`;
  }

  // 레이어 복제
  if (cmd.includes('복제') || cmd.includes('복사') || cmd.includes('duplicate')) {
    const newNodes = [];

    for (const node of selection) {
      const clone = node.clone();
      clone.x += 20;
      clone.y += 20;
      newNodes.push(clone);
    }

    figma.currentPage.selection = newNodes;
    return `${selection.length}개의 레이어를 복제했습니다.`;
  }

  // 레이어 삭제
  if (cmd.includes('삭제') || cmd.includes('delete') || cmd.includes('remove')) {
    const count = selection.length;

    for (const node of selection) {
      node.remove();
    }

    return `${count}개의 레이어를 삭제했습니다.`;
  }

  // 폰트 크기 변경
  const fontSizeMatch = cmd.match(/폰트\s*(?:크기)?[를을]?\s*(\d+)/);
  if (fontSizeMatch || (cmd.includes('font') && cmd.includes('size'))) {
    const sizeMatch = command.match(/(\d+)/);
    if (!sizeMatch) {
      throw new Error('폰트 크기를 숫자로 입력해주세요.');
    }

    const newSize = parseInt(sizeMatch[1]);
    let changed = 0;

    for (const node of selection) {
      if (node.type === 'TEXT') {
        await figma.loadFontAsync(node.fontName);
        node.fontSize = newSize;
        changed++;
      }
    }

    if (changed === 0) {
      throw new Error('선택된 레이어 중 텍스트가 없습니다.');
    }

    return `폰트 크기를 ${newSize}px로 변경했습니다.`;
  }

  // 이동
  const moveMatch = cmd.match(/[이동|움직|move].*?[(\(]?\s*(-?\d+)\s*,\s*(-?\d+)\s*[)\)]?/);
  if (moveMatch) {
    const dx = parseInt(moveMatch[1]);
    const dy = parseInt(moveMatch[2]);

    for (const node of selection) {
      node.x += dx;
      node.y += dy;
    }

    return `레이어를 (${dx}, ${dy})만큼 이동했습니다.`;
  }

  // 숨기기
  if (cmd.includes('숨기') || cmd.includes('hide')) {
    for (const node of selection) {
      node.visible = false;
    }

    return `${selection.length}개의 레이어를 숨겼습니다.`;
  }

  // 보이기
  if (cmd.includes('보이') || cmd.includes('show') || cmd.includes('표시')) {
    for (const node of selection) {
      node.visible = true;
    }

    return `${selection.length}개의 레이어를 표시했습니다.`;
  }

  // 이름 변경
  const nameMatch = command.match(/이름[을를]?\s*['"'"](.+?)['"'"]/);
  if (nameMatch) {
    const newName = nameMatch[1];

    for (const node of selection) {
      node.name = newName;
    }

    return `레이어 이름을 "${newName}"으로 변경했습니다.`;
  }

  // 모서리 둥글기
  const radiusMatch = cmd.match(/(?:모서리|라운드|radius|corner)[를을]?\s*(\d+)/);
  if (radiusMatch) {
    const radius = parseInt(radiusMatch[1]);

    for (const node of selection) {
      if ('cornerRadius' in node) {
        node.cornerRadius = radius;
      }
    }

    return `모서리 둥글기를 ${radius}px로 변경했습니다.`;
  }

  throw new Error(`명령어를 이해하지 못했습니다: "${command}"\n예시 명령어를 참고해주세요.`);
}

// 유틸리티 함수들
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    const shortResult = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(hex);
    if (shortResult) {
      return {
        r: parseInt(shortResult[1] + shortResult[1], 16) / 255,
        g: parseInt(shortResult[2] + shortResult[2], 16) / 255,
        b: parseInt(shortResult[3] + shortResult[3], 16) / 255
      };
    }
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  };
}

function rgbToHex(r, g, b) {
  const toHex = (c) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

// 노드 내부의 모든 텍스트 노드 찾기 (재귀)
// 컴포넌트, 인스턴스, 오토레이아웃 모두 지원
function findAllTextNodes(node) {
  const textNodes = [];

  // 텍스트 노드인 경우
  if (node.type === 'TEXT') {
    textNodes.push(node);
    return textNodes;
  }

  // 자식이 있는 모든 노드 타입 처리
  // FRAME, GROUP, COMPONENT, COMPONENT_SET, INSTANCE, SECTION, PAGE 등
  if ('children' in node && node.children) {
    for (const child of node.children) {
      textNodes.push(...findAllTextNodes(child));
    }
  }

  return textNodes;
}

// 특정 텍스트를 포함하는 텍스트 노드 찾기
function findTextNodeByContent(node, searchText) {
  const allTextNodes = findAllTextNodes(node);
  return allTextNodes.filter(textNode =>
    textNode.characters.includes(searchText)
  );
}

// 인스턴스 내 텍스트 변경을 위한 헬퍼 함수
async function changeTextInNode(textNode, newText) {
  try {
    // Mixed fonts 처리
    if (textNode.fontName === figma.mixed) {
      // 모든 문자의 폰트를 로드
      const len = textNode.characters.length;
      for (let i = 0; i < len; i++) {
        const font = textNode.getRangeFontName(i, i + 1);
        await figma.loadFontAsync(font);
      }
    } else {
      await figma.loadFontAsync(textNode.fontName);
    }
    textNode.characters = newText;
    return true;
  } catch (e) {
    console.error('Font load error:', e);
    return false;
  }
}

// 텍스트 부분 교체를 위한 헬퍼 함수
async function replaceTextInNode(textNode, searchText, newText) {
  try {
    // Mixed fonts 처리
    if (textNode.fontName === figma.mixed) {
      const len = textNode.characters.length;
      for (let i = 0; i < len; i++) {
        const font = textNode.getRangeFontName(i, i + 1);
        await figma.loadFontAsync(font);
      }
    } else {
      await figma.loadFontAsync(textNode.fontName);
    }
    textNode.characters = textNode.characters.replace(searchText, newText);
    return true;
  } catch (e) {
    console.error('Font load error:', e);
    return false;
  }
}

// 선택된 레이어 불러오기 (네이밍용)
function loadSelectedLayers() {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.ui.postMessage({
      type: 'naming-status',
      status: 'error',
      message: '먼저 레이어를 선택해주세요.'
    });
    return;
  }

  // 선택된 레이어와 하위 레이어 수집
  const layers = [];

  function collectLayers(node, depth = 0) {
    // 최대 깊이 제한 (너무 깊은 중첩 방지)
    if (depth > 10) return;

    layers.push({
      id: node.id,
      name: node.name,
      type: getShortType(node.type)
    });

    // 하위 레이어도 수집 (옵션)
    if ('children' in node && node.children && depth === 0) {
      // 첫 번째 레벨의 자식만 수집
      for (const child of node.children) {
        layers.push({
          id: child.id,
          name: child.name,
          type: getShortType(child.type)
        });
      }
    }
  }

  for (const node of selection) {
    collectLayers(node);
  }

  figma.ui.postMessage({
    type: 'layers-loaded',
    layers: layers
  });
}

// 레이어 타입 축약
function getShortType(type) {
  const typeMap = {
    'FRAME': 'Frame',
    'GROUP': 'Group',
    'TEXT': 'Text',
    'RECTANGLE': 'Rect',
    'ELLIPSE': 'Ellipse',
    'VECTOR': 'Vector',
    'COMPONENT': 'Comp',
    'INSTANCE': 'Inst',
    'COMPONENT_SET': 'Set',
    'LINE': 'Line',
    'POLYGON': 'Poly',
    'STAR': 'Star',
    'BOOLEAN_OPERATION': 'Bool',
    'SLICE': 'Slice',
    'SECTION': 'Sect'
  };
  return typeMap[type] || type;
}

// 레이어 이름 변경
function renameLayers(changes) {
  let renamed = 0;

  for (const change of changes) {
    const node = figma.getNodeById(change.id);
    if (node) {
      node.name = change.name;
      renamed++;
    }
  }

  figma.ui.postMessage({
    type: 'naming-status',
    status: 'success',
    message: `${renamed}개의 레이어 이름을 변경했습니다.`
  });
}

// 선택된 레이어 이름 변경 (Selected Change)
function renameSelectedLayers(namingType) {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.ui.postMessage({
      type: 'rename-status',
      status: 'error',
      message: '먼저 레이어를 선택해주세요.'
    });
    return;
  }

  let renamed = 0;

  function renameRecursive(node) {
    // Component, Instance는 변경하지 않음
    if (node.type === 'COMPONENT' || node.type === 'INSTANCE' || node.type === 'COMPONENT_SET') {
      return;
    }

    node.name = namingType;
    renamed++;

    // 자식 노드도 재귀적으로 처리
    if ('children' in node && node.children) {
      for (const child of node.children) {
        renameRecursive(child);
      }
    }
  }

  for (const node of selection) {
    renameRecursive(node);
  }

  figma.ui.postMessage({
    type: 'rename-status',
    status: 'success',
    message: `${renamed}개의 레이어 이름을 "${namingType}"으로 변경했습니다.`
  });
}

// 자동 네이밍 (Auto Rename) - Naming Guide 규칙 적용
function autoRenameAllLayers() {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.ui.postMessage({
      type: 'rename-status',
      status: 'error',
      message: '먼저 레이어를 선택해주세요.'
    });
    return;
  }

  let renamed = 0;

  function getAutoName(node, parentIsAutoLayout = false) {
    // Component, Instance는 변경하지 않음
    if (node.type === 'COMPONENT' || node.type === 'INSTANCE' || node.type === 'COMPONENT_SET') {
      return null;
    }

    // TEXT -> "Text"
    if (node.type === 'TEXT') {
      return 'Text';
    }

    // Image Fill 체크 -> "Image"
    if ('fills' in node && Array.isArray(node.fills)) {
      const hasImageFill = node.fills.some(fill => fill.type === 'IMAGE');
      if (hasImageFill) {
        return 'Image';
      }
    }

    // FRAME/GROUP 처리
    if (node.type === 'FRAME' || node.type === 'GROUP') {
      // Auto Layout 체크
      const isAutoLayout = 'layoutMode' in node && node.layoutMode !== 'NONE';

      if (isAutoLayout) {
        // All Auto Layouts -> "Section"
        return 'Section';
      } else if (parentIsAutoLayout) {
        // FRAME/GROUP Inside Auto Layout -> "Item"
        return 'Item';
      } else {
        // Frame/Group (Not Auto Layout) -> "Content"
        return 'Content';
      }
    }

    // 기타 도형들
    if (node.type === 'RECTANGLE' || node.type === 'ELLIPSE' ||
        node.type === 'POLYGON' || node.type === 'STAR' ||
        node.type === 'LINE' || node.type === 'VECTOR') {
      // Image Fill 체크
      if ('fills' in node && Array.isArray(node.fills)) {
        const hasImageFill = node.fills.some(fill => fill.type === 'IMAGE');
        if (hasImageFill) {
          return 'Image';
        }
      }
      return 'Item';
    }

    return null;
  }

  function renameRecursive(node, parentIsAutoLayout = false) {
    const newName = getAutoName(node, parentIsAutoLayout);

    if (newName) {
      node.name = newName;
      renamed++;
    }

    // 현재 노드가 Auto Layout인지 확인
    const isAutoLayout = 'layoutMode' in node && node.layoutMode !== 'NONE';

    // 자식 노드 처리
    if ('children' in node && node.children) {
      for (const child of node.children) {
        // Component/Instance 내부는 처리하지 않음
        if (node.type !== 'COMPONENT' && node.type !== 'INSTANCE' && node.type !== 'COMPONENT_SET') {
          renameRecursive(child, isAutoLayout);
        }
      }
    }
  }

  for (const node of selection) {
    renameRecursive(node, false);
  }

  figma.ui.postMessage({
    type: 'rename-status',
    status: 'success',
    message: `${renamed}개의 레이어를 자동으로 네이밍했습니다.`
  });
}

// 맞춤법 검사 함수
async function spellCheck() {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.ui.postMessage({
      type: 'status',
      status: 'error',
      message: '먼저 레이어를 선택해주세요.'
    });
    return;
  }

  // 선택된 영역의 모든 텍스트 수집
  const allTexts = [];
  for (const node of selection) {
    const textNodes = findAllTextNodes(node);
    for (const textNode of textNodes) {
      if (textNode.characters.trim()) {
        allTexts.push(textNode.characters);
      }
    }
  }

  if (allTexts.length === 0) {
    figma.ui.postMessage({
      type: 'status',
      status: 'error',
      message: '검사할 텍스트가 없습니다.'
    });
    return;
  }

  // UI에 텍스트 전달하여 맞춤법 검사 요청
  figma.ui.postMessage({
    type: 'check-spelling',
    texts: allTexts
  });
}

// 더미 데이터 적용
async function applyDummyData(value) {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.ui.postMessage({
      type: 'data-fill-status',
      status: 'error',
      message: '먼저 레이어를 선택해주세요.'
    });
    return;
  }

  let changed = 0;

  for (const node of selection) {
    const textNodes = findAllTextNodes(node);

    for (const textNode of textNodes) {
      const success = await changeTextInNode(textNode, value);
      if (success) changed++;
    }
  }

  if (changed === 0) {
    figma.ui.postMessage({
      type: 'data-fill-status',
      status: 'error',
      message: '선택된 영역에 텍스트가 없습니다.'
    });
    return;
  }

  figma.ui.postMessage({
    type: 'data-fill-status',
    status: 'success',
    message: `${changed}개의 텍스트에 데이터를 적용했습니다.`
  });
}

// 랜덤 채우기
async function randomFillData(category, data) {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.ui.postMessage({
      type: 'data-fill-status',
      status: 'error',
      message: '먼저 레이어를 선택해주세요.'
    });
    return;
  }

  let changed = 0;

  for (const node of selection) {
    const textNodes = findAllTextNodes(node);

    for (const textNode of textNodes) {
      // 랜덤 필드에서 랜덤 값 선택
      const randomField = data[Math.floor(Math.random() * data.length)];
      const randomValue = randomField.values[Math.floor(Math.random() * randomField.values.length)];

      const success = await changeTextInNode(textNode, randomValue);
      if (success) changed++;
    }
  }

  if (changed === 0) {
    figma.ui.postMessage({
      type: 'data-fill-status',
      status: 'error',
      message: '선택된 영역에 텍스트가 없습니다.'
    });
    return;
  }

  figma.ui.postMessage({
    type: 'data-fill-status',
    status: 'success',
    message: `${changed}개의 텍스트에 랜덤 데이터를 적용했습니다.`
  });
}

// 이미지 채우기 기능
async function applyImageFill(imageType) {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.ui.postMessage({
      type: 'data-fill-status',
      status: 'error',
      message: '먼저 레이어를 선택해주세요.'
    });
    return;
  }

  // 이미지 Fill을 적용할 수 있는 노드들 찾기
  const fillableNodes = findFillableNodes(selection);

  if (fillableNodes.length === 0) {
    figma.ui.postMessage({
      type: 'data-fill-status',
      status: 'error',
      message: '이미지를 적용할 수 있는 레이어가 없습니다. (Frame, Rectangle, Ellipse 등)'
    });
    return;
  }

  let changed = 0;

  for (const node of fillableNodes) {
    try {
      console.log(`Processing node: ${node.name} (${node.type})`);
      const imageUrl = getImageUrl(imageType, node.width, node.height);
      console.log(`Fetching image from: ${imageUrl}`);
      const imageData = await fetchImageData(imageUrl);

      if (imageData) {
        console.log(`Image data received, size: ${imageData.length}`);
        const image = figma.createImage(imageData);
        console.log(`Image created with hash: ${image.hash}`);

        // 기존 fills 복사하여 이미지만 교체
        try {
          // fills 읽기 가능한지 체크
          const currentFills = node.fills;
          console.log(`Current fills type: ${typeof currentFills}, isArray: ${Array.isArray(currentFills)}`);

          if (currentFills === figma.mixed) {
            console.log('Fills is mixed, skipping...');
            continue;
          }

          const fillsCopy = JSON.parse(JSON.stringify(currentFills || []));
          let newFills = [];

          // 기존에 이미지 Fill이 있으면 그것만 교체
          let hasExistingImage = false;
          for (const fill of fillsCopy) {
            if (fill.type === 'IMAGE') {
              hasExistingImage = true;
              newFills.push({
                type: 'IMAGE',
                imageHash: image.hash,
                scaleMode: fill.scaleMode || 'FILL',
                visible: fill.visible !== false,
                opacity: fill.opacity !== undefined ? fill.opacity : 1
              });
            } else {
              newFills.push(fill);
            }
          }

          // 기존 이미지가 없으면 새로 추가
          if (!hasExistingImage) {
            newFills = [{
              type: 'IMAGE',
              imageHash: image.hash,
              scaleMode: 'FILL'
            }];
          }

          console.log(`Setting new fills:`, JSON.stringify(newFills));
          node.fills = newFills;
          console.log(`Successfully applied to: ${node.name}`);
          changed++;
        } catch (fillError) {
          console.error('Cannot override fills:', fillError.message, node.name, node.type);

          // 대안: 직접 fills 배열 생성 시도
          try {
            console.log('Trying alternative method...');
            node.fills = [{
              type: 'IMAGE',
              imageHash: image.hash,
              scaleMode: 'FILL'
            }];
            console.log('Alternative method succeeded!');
            changed++;
          } catch (altError) {
            console.error('Alternative method also failed:', altError.message);
          }
        }
      } else {
        console.log('Failed to fetch image data');
      }
    } catch (e) {
      console.error('Image fill error:', e.message);
    }
  }

  if (changed === 0) {
    figma.ui.postMessage({
      type: 'data-fill-status',
      status: 'error',
      message: '이미지를 적용하는데 실패했습니다.'
    });
    return;
  }

  figma.ui.postMessage({
    type: 'data-fill-status',
    status: 'success',
    message: `${changed}개의 레이어에 이미지를 적용했습니다.`
  });
}

// 이미지 Fill을 적용할 수 있는 노드 찾기
function findFillableNodes(selection) {
  const fillableNodes = [];

  function collectFillable(node, depth = 0) {
    const indent = '  '.repeat(depth);
    console.log(`${indent}[${node.type}] ${node.name}`);

    // 레이어 이름에 avatar, profile, image 등이 포함된 경우 우선 체크
    const nameLower = node.name.toLowerCase();
    const isLikelyImageLayer = nameLower.includes('avatar') ||
                               nameLower.includes('profile') ||
                               nameLower.includes('image') ||
                               nameLower.includes('photo') ||
                               nameLower.includes('thumbnail') ||
                               nameLower.includes('img');

    // fills 속성 체크
    if ('fills' in node) {
      try {
        const fills = node.fills;
        console.log(`${indent}  fills type: ${typeof fills}, isArray: ${Array.isArray(fills)}, length: ${Array.isArray(fills) ? fills.length : 'N/A'}`);

        if (fills !== figma.mixed && Array.isArray(fills)) {
          // fills 내용 상세 로그
          fills.forEach((fill, idx) => {
            console.log(`${indent}    fill[${idx}]: type=${fill.type}, visible=${fill.visible}`);
          });

          const hasImageFill = fills.some(fill => fill.type === 'IMAGE');

          if (hasImageFill) {
            console.log(`${indent}  ✓ Added (has IMAGE fill)`);
            fillableNodes.push(node);
            return;
          }

          // 이미지 이름을 가진 레이어이고 Shape인 경우
          if (isLikelyImageLayer && (
              node.type === 'RECTANGLE' ||
              node.type === 'ELLIPSE' ||
              node.type === 'FRAME' ||
              node.type === 'POLYGON' ||
              node.type === 'VECTOR')) {
            console.log(`${indent}  ✓ Added (likely image layer by name)`);
            fillableNodes.push(node);
            return;
          }
        }
      } catch (e) {
        console.log(`${indent}  fills error: ${e.message}`);
      }
    }

    // Shape 노드는 무조건 추가 (이미지 적용 가능)
    if (node.type === 'RECTANGLE' || node.type === 'ELLIPSE') {
      console.log(`${indent}  ✓ Added (shape: ${node.type})`);
      fillableNodes.push(node);
      // Shape도 children이 있을 수 있으므로 return하지 않음
    }

    // 자식 노드 탐색
    if ('children' in node && node.children && node.children.length > 0) {
      console.log(`${indent}  -> Exploring ${node.children.length} children`);
      for (const child of node.children) {
        collectFillable(child, depth + 1);
      }
    }
  }

  console.log('=== Finding fillable nodes ===');
  for (const node of selection) {
    collectFillable(node, 0);
  }

  console.log('=== Found nodes ===');
  fillableNodes.forEach(n => console.log(`  - ${n.name} (${n.type})`));
  return fillableNodes;
}

// 프로필 이미지 URL 목록 (커스텀 이미지)
const PROFILE_IMAGES = [
  'https://i.pravatar.cc/300?img=1',
  'https://i.pravatar.cc/300?img=5',
  'https://i.pravatar.cc/300?img=9',
  'https://i.pravatar.cc/300?img=16',
  'https://i.pravatar.cc/300?img=20',
  'https://i.pravatar.cc/300?img=25',
  'https://i.pravatar.cc/300?img=32',
  'https://i.pravatar.cc/300?img=36',
  'https://i.pravatar.cc/300?img=41',
  'https://i.pravatar.cc/300?img=47'
];

// 이미지 타입에 따른 URL 생성
function getImageUrl(imageType, width, height) {
  // 기본 크기 설정 (최소 100px)
  const w = Math.max(100, Math.round(width));
  const h = Math.max(100, Math.round(height));

  // 랜덤 시드 생성
  const seed = Math.floor(Math.random() * 1000);

  switch (imageType) {
    case 'profile':
      // 커스텀 프로필 이미지 중 랜덤 선택
      const randomIdx = Math.floor(Math.random() * PROFILE_IMAGES.length);
      return PROFILE_IMAGES[randomIdx];

    case 'cover':
      // Picsum - 넓은 가로형 이미지
      return `https://picsum.photos/seed/${seed}/${w}/${h}`;

    case 'post':
      // Picsum - 포스트용 이미지
      return `https://picsum.photos/seed/post${seed}/${w}/${h}`;

    case 'product':
      // Picsum - 상품 이미지
      return `https://picsum.photos/seed/product${seed}/${w}/${h}`;

    case 'nature':
      // Picsum - 자연 이미지 (특정 카테고리 없어서 일반 이미지)
      return `https://picsum.photos/seed/nature${seed}/${w}/${h}`;

    case 'food':
      // Picsum - 음식 이미지
      return `https://picsum.photos/seed/food${seed}/${w}/${h}`;

    default:
      return `https://picsum.photos/seed/${seed}/${w}/${h}`;
  }
}

// 이미지 데이터 가져오기
async function fetchImageData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (e) {
    console.error('Fetch image error:', e);
    return null;
  }
}
