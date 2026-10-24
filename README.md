# そのまま壁紙

画像の縦横比を変えずに、スマホ・タブレット・PCの壁紙を作るWebアプリ。

- 公開URL: https://reona01285-png.github.io/wallpaper-app/
- 余白は元画像から作る(AI補完 / なじませ=鏡のように折り返して段階的にぼかす / 伸ばす=端の色を外へ伸ばす / ぼかし / グラデ / 単色)
- AI補完はMI-GAN(約28MB)をONNX Runtime Web(約11MB)で端末内実行。外部サービスは使わない
- 画像の処理はすべて端末内で行い、外部へ送信しない
- ホーム画面に追加でき、一度開けば電波がなくても動く(sw.js)

## 構成
- `index.html` … アプリ本体(HTML/CSS/JSを1ファイルに)
- `ai-worker.js` … AI補完をWeb Workerで実行(1スレッド。GitHub Pagesでは複数スレッド不可)
- `models/migan_pipeline_v2.onnx` … MI-GAN-512-Places2 パイプライン(入力 image/mask uint8、mask 255=元画像のまま)
- `ort/` … ONNX Runtime Web 1.20.1 のwasm版
- `sw.js` … オフライン用。更新を確実に反映させたいときは `CACHE` の名前を変える(models/ort は `AI_CACHE` に別保存)
- `THIRD_PARTY_NOTICES.md` … MI-GAN と ONNX Runtime のライセンス(どちらもMIT)

## AI補完の注意点(試行で分かったこと)
- 描き足す部分を黒のまま渡すと境目に黒い線が出る → 端の色で仮埋めしてから渡す
- 余白全体を1回で描かせるのが最も自然。帯ごとに少しずつ広げると継ぎ目や無関係な物が出る
- 遠い部分は破綻しやすいので、なじませと同じ段階ぼかしで隠している
- `manifest.json`, `icon-*.png` … ホーム画面追加用
