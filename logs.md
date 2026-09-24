# Work log

## 2026-09-24 — Refine mobile header spacing

- 변경 파일: `src/components/DailyTodo.css`
- 요약: 모바일 콘텐츠 상단 여백을 좌우와 같은 `2rem`으로 줄이고, 알림 ON/OFF 토글 왼쪽에 종 아이콘을 유지했습니다.

## 2026-09-24 — Activate PWA installation and offline caching

- 변경 파일: `src/pages/index.astro`, `README.md`
- 요약: Astro 문서에 manifest 링크와 production service worker 등록을 연결하고, Android·iOS 설치 안내를 추가했습니다.

PWA 플러그인은 manifest와 service worker 파일을 만들고도 Astro 페이지에 자동으로 삽입하지 않았습니다. 실제 HTML에서 링크와 등록 코드가 빠져 있음을 확인해 명시적으로 연결했습니다. Workbox precache에는 앱 화면, 번들, 아이콘, manifest가 포함됩니다.

## 2026-09-24 — Unify routine rows and add drag editing

- 변경 파일: `src/components/DailyTodo.tsx`, `src/components/DailyTodo.css`, `package.json`, `pnpm-lock.yaml`
- 요약: 루틴을 To-Do와 같은 한 줄 목록으로 바꾸고, 여러 체크포인트는 한 번에 하나씩 보여주며 완료 후 다음 항목으로 전환되게 했습니다. 두 목록의 삭제·드래그 정렬은 편집 모드로 옮겼습니다.

모바일에서 순서를 바꿔야 하므로 기본 HTML drag-and-drop 대신 손잡이와 touch sensor가 있는 sortable 동작을 사용했습니다. 체크포인트 완료 정보는 그대로 유지하고 표시할 항목만 순서대로 바꿔 Undo와 다음 날 초기화를 보존합니다. 테스트 중 시각 필드의 이벤트 객체를 비동기 상태 업데이트에서 참조해 화면이 멈추는 기존 문제도 발견해, 값을 먼저 읽도록 수정했습니다.

## 2026-09-24 — Make daily completion the focus

- 변경 파일: `src/components/DailyTodo.tsx`, `src/components/DailyTodo.css`
- 요약: 루틴을 먼저 배치하고, 남은 개수만 표시하며, 완료 항목의 퇴장 효과와 실행 취소를 추가했습니다. 시각 없는 일일 루틴과 버튼형 To-Do 입력, 헤더 로고, 넓어진 모바일 패딩도 반영했습니다.

완료 항목은 저장소에서 삭제하지 않고 오늘 완료 상태로 유지합니다. 화면에서만 150ms 뒤 숨겨야 다음 날 루틴이 되살아나고, 직전 완료를 5초간 되돌릴 수 있습니다. 시각이 없는 루틴은 빈 시각의 체크포인트 하나로 표현해 기존 데이터 구조와 알림 검사 흐름을 유지했습니다.

## 2026-09-24 — Connect the custom domain

- 변경 파일: `README.md`, Cloudflare DNS, Vercel project domain
- 요약: `todo.bsiku.dev`를 Vercel 프로젝트에 연결하고 Cloudflare에 DNS-only CNAME을 추가했습니다.

기존 `bsiku.dev`의 DNS가 Cloudflare에서 관리되므로 nameserver나 다른 레코드는 바꾸지 않았습니다. Vercel이 이 프로젝트에 지정한 CNAME 값을 사용했고, Cloudflare proxy는 꺼서 Vercel의 도메인 검증과 인증서 발급이 직접 이루어지게 했습니다.

## 2026-09-23 — Prepare GitHub and Vercel deployment

- 변경 파일: `package.json`, `pnpm-lock.yaml`, `vendor/paper-ui-0.1.0.tgz`, `astro.config.mjs`, `vercel.json`, `README.md`
- 요약: 배포 환경에서 접근할 수 없는 로컬 `paper-ui` 경로를 저장소에 포함된 패키지 아카이브로 전환하고, Vercel의 Astro 빌드와 `dist` 출력을 명시했습니다.

`paper-ui`는 npm에 아직 공개되지 않았고 원본 Git 저장소도 패키지의 `dist`를 추적하지 않습니다. 따라서 원격 빌드에서 동일한 결과물을 설치하도록 현재 빌드를 pack했습니다. 패키지를 업데이트할 때는 새 아카이브를 다시 만들어야 합니다.
Vercel 프로젝트를 Git 저장소 연결 전에 생성했더니 프레임워크가 `Other`로 잡혀 출력 경로가 `public`이 됐습니다. 저장소의 `vercel.json`에 Astro와 `dist`를 선언해 Git 배포에서도 같은 빌드 설정이 적용되게 했습니다.

## 2026-09-23 — Reduce visible rules

- 변경 파일: `src/components/DailyTodo.tsx`, `src/components/DailyTodo.css`
- 요약: 진행률 선과 목록 행·시간 체크포인트의 테두리를 제거하고, 체크포인트는 옅은 면으로 구분했습니다.

이전 단순화에서도 여러 층의 선이 남아 목록 자체가 장부처럼 보였습니다. 이제 구획선은 헤더와 두 섹션 사이에만 남기고, 나머지 정보는 간격·타이포그래피·surface로 구분합니다.

## 2026-09-23 — Simplify the daily screen

- 변경 파일: `src/components/DailyTodo.tsx`, `src/components/DailyTodo.css`
- 요약: 시각적 장식을 제거하고 paper-ui 데모의 단일 지면·hairline 구획·절제된 밀도에 맞춰 화면을 다시 구성했습니다.

큰 날짜 패널과 진행률 링은 정보보다 연출이 앞서 한 화면의 초점이 분산됐습니다. 날짜는 page header의 보조 정보로 내리고, 진행은 2px 선 하나로 축소했습니다. 항상 열려 있던 루틴 생성 폼도 필요할 때만 펼치도록 바꿔 기본 화면에는 오늘 처리할 목록만 남겼습니다.

## 2026-09-23 — Build the Astro daily routine PWA

- 변경 파일: Astro app source, PWA manifest, UI styles
- 요약: `paper-ui`의 primitive와 atom만 조합해 오늘의 To-Do와 시간별 반복 체크포인트를 관리하는 로컬 우선 PWA를 구성했습니다.

네이티브 앱 대신 Android에서 설치할 수 있는 PWA로 범위를 정했습니다. 서버가 없는 정적 앱이므로 알림은 앱이 열려 있을 때만 예약 시각을 감지하며, 데이터는 브라우저 `localStorage`에만 남습니다. molecule·component 계층이 성숙하기 전이라는 조건 때문에 제품 단위 조합은 앱 내부에서 만들고 디자인 시스템에서는 atom 이하만 사용했습니다.
