# TOEFL Go

iPhone 友善的托福學習 PWA：每日單字 SRS、閱讀／聽力／口說／寫作短練、快速測驗與階段計畫。資料存在瀏覽器 LocalStorage。

日檢 N4 請用獨立專案 [N4 Go](https://github.com/Lucash2005/N4-Go)。

## 功能

- **今日節奏**：單字 SRS、到期複習、四大科短練習
- **單字卡**：主動回想＋忘記／困難／記得／簡單 間隔重複
- **練習**：閱讀篇章、聽力（系統英文 TTS＋逐字稿）、口說計時、寫作草稿
- **測驗**：每次題目與選項順序重洗
- **計畫**：階段時程

## 題庫與目標

| 項目 | 目標 | 題庫 |
| --- | ---: | ---: |
| 單字 | 800 | 800 |
| 閱讀篇章 | 40 | 40 |
| 聽力題組 | 40 | 40 |
| 口說題 | 20 | 20 |
| 寫作題 | 20 | 20 |
| 快速測驗 | — | 85 |

練習篇章為原創教材，不是 ETS 官方真題。聽力用系統 TTS，不另存音檔。

## 開發

```bash
npm install
npm run dev
```

## 建置

```bash
npm run build
```

靜態站部署網址：<https://lucash2005.github.io/TOEFL-Go/>

建置產物在 `gh-pages` 分支。首次請到倉庫 Settings → Pages，Source 選 **Deploy from a branch**，Branch 選 `gh-pages` / `/ (root)`。之後推送到 `main` 會自動重建並部署。
