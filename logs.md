# Work log

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
